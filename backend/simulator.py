"""
simulator.py — Independent Cascade rumour-spread simulator.

Public interface (for Member 3):
    run_simulation(G, start_node, budget=0, strategy="knapsack", seed=None)
    -> {
         "strategy": str,               # "none" | "degree" | "knapsack"
         "intervened_nodes": List[str],
         "total_reach": int,
         "ticks": [
             {"step": int, "newly_infected": List[str], "cumulative_infected": int},
             ...
         ]
       }
"""

from __future__ import annotations

import random
from typing import Any, Dict, List, Optional

import networkx as nx

from backend.interventions import (
    degree_intervention,
    knapsack_intervention,
    random_intervention,
    betweenness_intervention,
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_simulation(
    G: nx.Graph,
    start_node: Any,
    budget: int = 0,
    strategy: str = "knapsack",
    seed: Optional[int] = None,
    intervened_nodes: Optional[List[str]] = None,
) -> Dict:
    """Run an Independent Cascade simulation on graph *G*.

    Parameters
    ----------
    G : nx.Graph
        NetworkX graph whose nodes carry at least a ``susceptibility``
        attribute (float 0-1). Nodes may also carry ``degree`` and
        ``betweenness`` attributes (used by the intervention strategies).
    start_node : any hashable
        The node where the rumour originates.
    budget : int
        Maximum number of nodes that may be intervened on (blocked).
        When 0 or strategy is "none", no intervention is applied.
    strategy : str
        Intervention strategy. One of "none", "random", "degree", "betweenness", "knapsack".
    seed : int or None
        Seed for the random number generator (makes the cascade
        deterministic for testing / reproducibility).
    intervened_nodes : list of str, optional
        Precomputed list of nodes to block. If provided, skips recomputing
        interventions to allow instant Monte Carlo and sweep execution.

    Returns
    -------
    dict
        {"strategy", "intervened_nodes", "total_reach", "ticks"}
    """
    if seed is not None:
        random.seed(seed)

    # ------------------------------------------------------------------
    # 1. Select intervened (blocked) nodes
    # ------------------------------------------------------------------
    intervened_set: set = set()

    if intervened_nodes is not None:
        intervened_set = set(str(n) for n in intervened_nodes)
    elif budget > 0 and strategy not in ("none",):
        if strategy == "random":
            intervened_set = set(random_intervention(G, budget, start_node=str(start_node), seed=seed))
        elif strategy == "degree":
            intervened_set = set(degree_intervention(G, budget, start_node=str(start_node)))
        elif strategy == "betweenness":
            intervened_set = set(betweenness_intervention(G, budget, start_node=str(start_node)))
        elif strategy == "knapsack":
            intervened_set = set(knapsack_intervention(G, budget, start_node=str(start_node), seed=seed))

    # Normalise start_node to str for uniform comparisons
    start_str = str(start_node)

    # Edge-case: start node itself is blocked -- no spread possible
    if start_str in intervened_set:
        return {
            "strategy": strategy,
            "intervened_nodes": sorted(intervened_set),
            "total_reach": 0,
            "ticks": [{"step": 0, "newly_infected": [], "cumulative_infected": 0}],
        }

    # ------------------------------------------------------------------
    # 2. Independent Cascade propagation
    # ------------------------------------------------------------------
    infected: set = {start_str}
    frontier: List[str] = [start_str]          # nodes infected this step

    ticks = [
        {
            "step": 0,
            "newly_infected": [start_str],
            "cumulative_infected": 1,
        }
    ]

    step = 1
    while frontier:
        next_frontier: List[str] = []

        for node_str in frontier:
            actual = _resolve_node(G, node_str)
            if actual is None:
                continue

            for neighbour in G.neighbors(actual):
                nbr_str = str(neighbour)

                # Skip already-infected or blocked nodes
                if nbr_str in infected or nbr_str in intervened_set:
                    continue

                susceptibility = G.nodes[neighbour].get("susceptibility", 0.25)
                if random.random() < susceptibility:
                    infected.add(nbr_str)
                    next_frontier.append(nbr_str)

        ticks.append(
            {
                "step": step,
                "newly_infected": next_frontier,
                "cumulative_infected": len(infected),
            }
        )
        frontier = next_frontier
        step += 1

    return {
        "strategy": strategy,
        "intervened_nodes": sorted(intervened_set),
        "total_reach": len(infected),
        "ticks": ticks,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resolve_node(G: nx.Graph, node_str: str) -> Any:
    """Return the actual node object in *G* whose str() equals *node_str*.

    Handles graphs whose nodes are integers (the common NetworkX default).
    """
    if node_str in G:
        return node_str
    try:
        as_int = int(node_str)
        if as_int in G:
            return as_int
    except (ValueError, TypeError):
        pass
    return None
