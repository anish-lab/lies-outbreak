"""
interventions.py — Intervention strategies for the Outbreak of Lies simulator.

Exposed functions
-----------------
random_intervention(G, budget)      -> List[str]
degree_intervention(G, budget)      -> List[str]
betweenness_intervention(G, budget) -> List[str]
knapsack_intervention(G, budget)    -> List[str]

All return a list of node identifiers (str) to block *before* the cascade
runs. Blocked nodes have a strict 0 % chance of being infected.
"""

from __future__ import annotations

import random
from typing import List, Optional

import networkx as nx


# ---------------------------------------------------------------------------
# Baseline: Uniform random selection
# ---------------------------------------------------------------------------

def random_intervention(
    G: nx.Graph,
    budget: int,
    start_node: str = None,
    seed: Optional[int] = None,
) -> List[str]:
    """Block *budget* nodes selected uniformly at random from candidates.

    Serves as an empirical lower bound / naive control baseline.

    Parameters
    ----------
    G : nx.Graph
    budget : int
        Maximum number of nodes to block.
    start_node : str, optional
        The rumour origin node — excluded from candidates.
    seed : int, optional
        Seed for the RNG selection.

    Returns
    -------
    List[str]
        Node identifiers (as strings) of the selected nodes.
    """
    start_str = str(start_node) if start_node is not None else None
    candidates = [str(n) for n in G.nodes() if str(n) != start_str]
    if budget <= 0 or not candidates:
        return []

    rng = random.Random(seed) if seed is not None else random
    sample_k = min(budget, len(candidates))
    return rng.sample(candidates, sample_k)


# ---------------------------------------------------------------------------
# Baseline: Pure betweenness centrality (static top-k)
# ---------------------------------------------------------------------------

def betweenness_intervention(
    G: nx.Graph,
    budget: int,
    start_node: str = None,
) -> List[str]:
    """Block the *budget* nodes with the highest static betweenness centrality.

    Unlike iterative knapsack, this uses static betweenness without recomputing
    after each removal and without degree normalization (cost).

    Parameters
    ----------
    G : nx.Graph
    budget : int
        Maximum number of nodes to block.
    start_node : str, optional
        The rumour origin node — excluded from candidates.

    Returns
    -------
    List[str]
        Node identifiers (as strings) of the selected nodes.
    """
    start_str = str(start_node) if start_node is not None else None
    candidates = [n for n in G.nodes() if str(n) != start_str]
    if budget <= 0 or not candidates:
        return []

    # Check if graph nodes already have precomputed betweenness
    first_node = candidates[0]
    if "betweenness" in G.nodes[first_node]:
        sorted_nodes = sorted(
            candidates,
            key=lambda n: float(G.nodes[n].get("betweenness", 0.0)),
            reverse=True,
        )
    else:
        k_samples = min(50, len(G))
        bc = nx.betweenness_centrality(G, k=k_samples)
        sorted_nodes = sorted(
            candidates,
            key=lambda n: float(bc.get(n, 0.0)),
            reverse=True,
        )

    return [str(n) for n in sorted_nodes[:budget]]


# ---------------------------------------------------------------------------
# Baseline: top-k by degree
# ---------------------------------------------------------------------------

def degree_intervention(G: nx.Graph, budget: int, start_node: str = None) -> List[str]:
    """Block the *budget* nodes with the highest degree.

    This is the simplest possible heuristic: highly connected nodes are
    efficient rumour relays, so removing them limits cascading spread.

    Parameters
    ----------
    G : nx.Graph
    budget : int
        Maximum number of nodes to block.
    start_node : str, optional
        The rumour origin node — excluded from candidates because it has
        already spread the rumour before any intervention can act.

    Returns
    -------
    List[str]
        Node identifiers (as strings) of the selected nodes.
    """
    start_str = str(start_node) if start_node is not None else None
    sorted_nodes = sorted(
        (n for n in G.nodes() if str(n) != start_str),
        key=lambda n: G.degree(n),
        reverse=True,
    )
    return [str(n) for n in sorted_nodes[:budget]]


# ---------------------------------------------------------------------------
# Advanced: iterative greedy knapsack
# ---------------------------------------------------------------------------

def knapsack_intervention(G: nx.Graph, budget: int, start_node: str = None) -> List[str]:
    """Iterative greedy knapsack — picks the highest-ROI node each round,
    then **re-computes centralities** on the reduced graph before the next
    pick.  This accounts for the fact that removing one hub changes the
    structural importance of every remaining node.

    ROI  =  betweenness_centrality(node)  /  max(degree(node), 1)

    Betweenness is approximated with ``k=50`` random pivots for speed
    (``nx.betweenness_centrality(G, k=50)``).

    Parameters
    ----------
    G : nx.Graph
    budget : int
        Maximum number of nodes to block.
    start_node : str, optional
        The rumour origin node — excluded from candidates because it has
        already spread the rumour before any intervention can act.

    Returns
    -------
    List[str]
        Node identifiers (as strings) of the selected nodes, in the order
        they were chosen.
    """
    start_str = str(start_node) if start_node is not None else None
    working_G: nx.Graph = G.copy()

    selected: List[str] = []

    for _ in range(budget):
        candidates = [n for n in working_G.nodes() if str(n) != start_str]
        if not candidates:
            break

        # Calculate distances from start_node to weight cut-points near propagation wavefront
        distances = {}
        if start_str is not None and start_str in working_G:
            try:
                distances = nx.single_source_shortest_path_length(working_G, start_str)
            except Exception:
                distances = {}

        # Approximate betweenness centrality for speed
        k_samples = min(50, len(working_G))
        betweenness = nx.betweenness_centrality(working_G, k=k_samples)

        # Find the node with the highest ROI
        best_node = None
        best_roi = -1.0

        for node in candidates:
            degree = working_G.degree(node)
            cost = max(degree, 1)           # avoid division by zero for isolates
            # Source proximity factor: nodes closer to rumour origin pose higher immediate threat
            dist_val = distances.get(node, 10)
            proximity = 1.0 / max(dist_val, 1)

            roi = (betweenness[node] * proximity) / cost
            if roi > best_roi:
                best_roi = roi
                best_node = node

        if best_node is None:
            break

        selected.append(str(best_node))
        working_G.remove_node(best_node)    # re-compute centralities next round

    return selected
