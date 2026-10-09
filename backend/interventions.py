"""
interventions.py — Intervention strategies for the Outbreak of Lies simulator.

Exposed functions
-----------------
degree_intervention(G, budget)   -> List[str]
knapsack_intervention(G, budget) -> List[str]

Both return a list of node identifiers (str) to block before the cascade
runs.  Blocked nodes have a strict 0% chance of being infected.
"""

from __future__ import annotations

from typing import List

import networkx as nx


# ---------------------------------------------------------------------------
# Baseline: top-k by degree
# ---------------------------------------------------------------------------

def degree_intervention(G: nx.Graph, budget: int) -> List[str]:
    """Block the *budget* nodes with the highest degree.

    Highly connected nodes are efficient rumour relays, so removing them
    limits cascading spread.

    Parameters
    ----------
    G : nx.Graph
    budget : int
        Maximum number of nodes to block.

    Returns
    -------
    List[str]
        Node identifiers (as strings) of the selected nodes.
    """
    sorted_nodes = sorted(G.nodes(), key=lambda n: G.degree(n), reverse=True)
    return [str(n) for n in sorted_nodes[:budget]]


# ---------------------------------------------------------------------------
# Advanced: iterative greedy knapsack
# ---------------------------------------------------------------------------

def knapsack_intervention(G: nx.Graph, budget: int) -> List[str]:
    """Iterative greedy knapsack — picks the highest-ROI node each round,
    then re-computes centralities on the reduced graph before the next pick.

    This addresses the official challenge: "Selecting one user may change
    the importance of other users."

    ROI  =  betweenness_centrality(node)  /  max(degree(node), 1)

    Betweenness is approximated with k=50 random pivots for speed
    (nx.betweenness_centrality(G, k=50)).

    Parameters
    ----------
    G : nx.Graph
    budget : int
        Maximum number of nodes to block.

    Returns
    -------
    List[str]
        Node identifiers (as strings) of the selected nodes, in the order
        they were chosen.
    """
    working_G: nx.Graph = G.copy()
    selected: List[str] = []

    for _ in range(budget):
        n_nodes = len(working_G)
        if n_nodes == 0:
            break

        # Approximate betweenness centrality for speed (k=50 pivot nodes)
        k_samples = min(50, n_nodes)
        betweenness = nx.betweenness_centrality(working_G, k=k_samples)

        # Find the node with the highest ROI
        best_node = None
        best_roi = -1.0

        for node in working_G.nodes():
            degree = working_G.degree(node)
            cost = max(degree, 1)       # avoid division by zero for isolates
            roi = betweenness[node] / cost
            if roi > best_roi:
                best_roi = roi
                best_node = node

        if best_node is None:
            break

        selected.append(str(best_node))
        working_G.remove_node(best_node)    # re-compute centralities next round

    return selected
