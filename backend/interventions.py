"""
interventions.py — Intervention strategies for the Outbreak of Lies simulator.

Exposed functions
-----------------
degree_intervention(G, budget)   -> List[str]
knapsack_intervention(G, budget) -> List[str]

Both return a list of node identifiers (str) to block *before* the cascade
runs.  Blocked nodes have a strict 0 % chance of being infected.
"""

from __future__ import annotations

from typing import List

import networkx as nx


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
    # Remove start_node from working graph so it is never selected
    if start_str is not None and start_str in working_G:
        working_G.remove_node(start_str)

    selected: List[str] = []

    for _ in range(budget):
        n_nodes = len(working_G)
        if n_nodes == 0:
            break

        # Approximate betweenness centrality for speed
        k_samples = min(50, n_nodes)
        betweenness = nx.betweenness_centrality(working_G, k=k_samples)

        # Find the node with the highest ROI
        best_node = None
        best_roi = -1.0

        for node in working_G.nodes():
            degree = working_G.degree(node)
            cost = max(degree, 1)           # avoid division by zero for isolates
            roi = betweenness[node] / cost
            if roi > best_roi:
                best_roi = roi
                best_node = node

        if best_node is None:
            break

        selected.append(str(best_node))
        working_G.remove_node(best_node)    # re-compute centralities next round

    return selected
