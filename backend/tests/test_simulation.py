"""
test_simulation.py — Pytest suite for the Outbreak of Lies simulation engine.

Run from the repo root:
    pytest backend/tests -q

Expected: 17 passed
"""

from __future__ import annotations

import random

import networkx as nx
import pytest

from backend.interventions import degree_intervention, knapsack_intervention
from backend.simulator import run_simulation


# ---------------------------------------------------------------------------
# Shared test fixture
# ---------------------------------------------------------------------------

def _make_graph(n: int = 50, seed: int = 42) -> nx.Graph:
    """Return a Barabasi-Albert graph with susceptibility, degree, and
    betweenness attributes on every node."""
    G = nx.barabasi_albert_graph(n, 3, seed=seed)
    rng = random.Random(seed)
    bc = nx.betweenness_centrality(G)
    for node in G.nodes():
        G.nodes[node]["susceptibility"] = rng.uniform(0.3, 0.8)
        G.nodes[node]["degree"] = G.degree(node)
        G.nodes[node]["betweenness"] = bc[node]
    return G


@pytest.fixture(scope="module")
def graph() -> nx.Graph:
    return _make_graph()


# ===========================================================================
# 1. Output schema
# ===========================================================================

def test_output_has_required_top_level_keys(graph):
    result = run_simulation(graph, 0, budget=3, strategy="knapsack", seed=1)
    for key in ("strategy", "intervened_nodes", "total_reach", "ticks"):
        assert key in result


def test_ticks_have_required_keys(graph):
    result = run_simulation(graph, 0, budget=3, strategy="knapsack", seed=1)
    assert result["ticks"], "ticks must be non-empty"
    for tick in result["ticks"]:
        assert "step" in tick
        assert "newly_infected" in tick
        assert "cumulative_infected" in tick


def test_strategy_field_echoes_input(graph):
    for strategy in ("none", "degree", "knapsack"):
        result = run_simulation(graph, 0, budget=3, strategy=strategy, seed=1)
        assert result["strategy"] == strategy


# ===========================================================================
# 2. Intervened nodes must NEVER appear as newly_infected
# ===========================================================================

def test_degree_intervened_never_infected(graph):
    result = run_simulation(graph, 0, budget=5, strategy="degree", seed=2)
    intervened = set(result["intervened_nodes"])
    for tick in result["ticks"]:
        for node in tick["newly_infected"]:
            assert node not in intervened, (
                f"Blocked node '{node}' appeared in newly_infected at step {tick['step']}"
            )


def test_knapsack_intervened_never_infected(graph):
    result = run_simulation(graph, 0, budget=5, strategy="knapsack", seed=3)
    intervened = set(result["intervened_nodes"])
    for tick in result["ticks"]:
        for node in tick["newly_infected"]:
            assert node not in intervened, (
                f"Blocked node '{node}' appeared in newly_infected at step {tick['step']}"
            )


def test_intervened_never_infected_across_ten_seeds(graph):
    """Stochastic: intervened nodes must never be infected for seeds 0-9."""
    for seed in range(10):
        result = run_simulation(graph, 0, budget=5, strategy="knapsack", seed=seed)
        intervened = set(result["intervened_nodes"])
        for tick in result["ticks"]:
            for node in tick["newly_infected"]:
                assert node not in intervened, (
                    f"seed={seed}: blocked node '{node}' infected at step {tick['step']}"
                )


def test_none_strategy_produces_no_intervened_nodes(graph):
    result = run_simulation(graph, 0, budget=5, strategy="none", seed=1)
    assert result["intervened_nodes"] == []


# ===========================================================================
# 3. Budget constraints
# ===========================================================================

def test_degree_intervention_does_not_exceed_budget(graph):
    for budget in (1, 3, 5, 10):
        nodes = degree_intervention(graph, budget)
        assert len(nodes) <= budget, f"degree_intervention returned {len(nodes)} > budget {budget}"


def test_knapsack_intervention_does_not_exceed_budget(graph):
    for budget in (1, 3, 5, 10):
        nodes = knapsack_intervention(graph, budget)
        assert len(nodes) <= budget, f"knapsack_intervention returned {len(nodes)} > budget {budget}"


def test_run_simulation_knapsack_does_not_exceed_budget(graph):
    budget = 7
    result = run_simulation(graph, 0, budget=budget, strategy="knapsack", seed=1)
    assert len(result["intervened_nodes"]) <= budget


def test_run_simulation_degree_does_not_exceed_budget(graph):
    budget = 7
    result = run_simulation(graph, 0, budget=budget, strategy="degree", seed=1)
    assert len(result["intervened_nodes"]) <= budget


def test_zero_budget_produces_no_interventions(graph):
    result = run_simulation(graph, 0, budget=0, strategy="knapsack", seed=1)
    assert result["intervened_nodes"] == []


# ===========================================================================
# 4. Simulation correctness
# ===========================================================================

def test_ticks_are_sequential(graph):
    result = run_simulation(graph, 0, budget=3, strategy="knapsack", seed=1)
    for i, tick in enumerate(result["ticks"]):
        assert tick["step"] == i, f"Expected step {i}, got {tick['step']}"


def test_cumulative_infected_is_monotonically_non_decreasing(graph):
    result = run_simulation(graph, 0, budget=3, strategy="knapsack", seed=1)
    prev = 0
    for tick in result["ticks"]:
        assert tick["cumulative_infected"] >= prev
        prev = tick["cumulative_infected"]


def test_total_reach_matches_final_cumulative_count(graph):
    result = run_simulation(graph, 0, budget=3, strategy="knapsack", seed=1)
    final = result["ticks"][-1]["cumulative_infected"]
    assert result["total_reach"] == final


def test_start_node_appears_in_tick_zero(graph):
    result = run_simulation(graph, 0, budget=3, strategy="knapsack", seed=1)
    assert "0" in result["ticks"][0]["newly_infected"]


def test_seeded_runs_are_deterministic(graph):
    r1 = run_simulation(graph, 0, budget=3, strategy="knapsack", seed=99)
    r2 = run_simulation(graph, 0, budget=3, strategy="knapsack", seed=99)
    assert r1["ticks"] == r2["ticks"]
    assert r1["total_reach"] == r2["total_reach"]
    assert r1["intervened_nodes"] == r2["intervened_nodes"]
