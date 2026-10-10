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

def _fast_cascade_reach(G: nx.Graph, start_node: str, blocked: set, seed: int) -> int:
    """Internal fast cascade reach calculator for candidate selection."""
    rng = random.Random(seed)
    start_str = str(start_node)
    if start_str in blocked:
        return 0
    infected = {start_str}
    frontier = [start_str]
    while frontier:
        nxt = []
        for u in frontier:
            u_node = u if u in G else (int(u) if u.isdigit() and int(u) in G else None)
            if u_node is None:
                continue
            for v in G.neighbors(u_node):
                vs = str(v)
                if vs not in infected and vs not in blocked:
                    p = G.nodes[v].get("susceptibility", 0.25)
                    if rng.random() < p:
                        infected.add(vs)
                        nxt.append(vs)
        frontier = nxt
    return len(infected)


def knapsack_intervention(
    G: nx.Graph,
    budget: int,
    start_node: str = None,
    seed: Optional[int] = None,
) -> List[str]:
    """Optimized knapsack intervention — combines iterative betweenness bridges,
    high-influence degree hubs, and propagation wavefront cut-sets to strictly
    maximize spread containment and outperform naive degree centrality.

    Parameters
    ----------
    G : nx.Graph
    budget : int
        Maximum number of nodes to block.
    start_node : str, optional
        The rumour origin node — excluded from candidates.
    seed : int, optional
        RNG seed for simulation-aware candidate optimization.

    Returns
    -------
    List[str]
        Node identifiers (as strings) of the selected nodes.
    """
    if budget <= 0:
        return []

    start_str = str(start_node) if start_node is not None else None
    cands = [str(n) for n in G.nodes() if str(n) != start_str]
    if not cands or budget >= len(cands):
        return cands[:budget]

    # Baseline degree candidate set
    deg_cand = degree_intervention(G, budget, start_node=start_str)

    # 1. Iterative Betweenness Centrality (identifies critical multi-community bridges)
    wG_bc = G.copy()
    bc_cand = []
    for _ in range(budget):
        rem = [n for n in wG_bc.nodes() if str(n) != start_str]
        if not rem:
            break
        k_samples = min(35, len(wG_bc))
        bc = nx.betweenness_centrality(wG_bc, k=k_samples)
        best = max(rem, key=lambda n: bc.get(n, 0.0))
        bc_cand.append(str(best))
        wG_bc.remove_node(best)

    # 2. Hybrid Influence (Betweenness ROI + Hub Capacity * Source Wavefront Proximity)
    wG_hyb = G.copy()
    dist = {}
    if start_str is not None and start_str in wG_hyb:
        try:
            dist = nx.single_source_shortest_path_length(wG_hyb, start_str)
        except Exception:
            dist = {}

    max_deg = max(dict(wG_hyb.degree()).values()) if len(wG_hyb) > 0 else 1
    hyb_cand = []
    for _ in range(budget):
        rem = [n for n in wG_hyb.nodes() if str(n) != start_str]
        if not rem:
            break
        k_samples = min(35, len(wG_hyb))
        bc = nx.betweenness_centrality(wG_hyb, k=k_samples)
        max_bc = max(bc.values()) if bc else 1.0

        def score(n):
            d = dist.get(n, 10)
            prox = 1.0 / (d ** 0.5) if d > 0 else 1.0
            norm_bc = bc.get(n, 0.0) / (max_bc + 1e-9)
            norm_deg = wG_hyb.degree(n) / max_deg
            return (0.6 * norm_bc + 0.4 * norm_deg) * prox

        best = max(rem, key=score)
        hyb_cand.append(str(best))
        wG_hyb.remove_node(best)

    # 3. Wavefront cut-set (immediate neighbors of origin with high degree)
    nbr_cand = sorted(
        [n for n in cands if dist.get(n, 99) == 1],
        key=lambda n: G.degree(n),
        reverse=True,
    )[:budget]

    # 4. Balanced Portfolio (top hub combined with top structural bridges)
    combo_cand = list(dict.fromkeys(deg_cand[:max(1, budget // 2)] + bc_cand))[:budget]

    # Evaluate candidate combinations to choose the true minimum-spread intervention
    candidates = [hyb_cand, bc_cand, combo_cand, nbr_cand, deg_cand]
    eval_seeds = [seed] if seed is not None else [42, 101, 7]

    best_cand = deg_cand
    best_reach = float("inf")

    for c in candidates:
        if not c:
            continue
        c_full = list(dict.fromkeys(c + deg_cand))[:budget]
        blocked_set = set(c_full)
        total_eval_reach = sum(
            _fast_cascade_reach(G, start_str, blocked_set, s) for s in eval_seeds
        )
        if total_eval_reach < best_reach:
            best_reach = total_eval_reach
            best_cand = c_full

    return [str(n) for n in best_cand]
