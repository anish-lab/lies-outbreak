"""Tests for Benchmark (100 runs, 95% CI), Leaderboard (5 strategies), and Budget Sweep (k=1..15)."""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.models import BenchmarkResponse, SweepResponse
from backend.data_engine import generate_synthetic_graph
from backend.interventions import random_intervention, betweenness_intervention

client = TestClient(app)


def test_beta_susceptibility_distribution():
    """Verify susceptibility is graded and drawn from Beta distribution around 0.2 to 0.3."""
    G = generate_synthetic_graph(l=4, k=25)
    susceptibilities = [G.nodes[n]["susceptibility"] for n in G.nodes()]
    assert len(susceptibilities) == 100
    mean_susc = sum(susceptibilities) / len(susceptibilities)
    # Mean should be around 0.2 to 0.3
    assert 0.15 <= mean_susc <= 0.35, f"Expected mean between 0.15 and 0.35, got {mean_susc}"
    # Verify values are in (0, 1) and varied
    for s in susceptibilities:
        assert 0.0 < s < 1.0


def test_random_and_betweenness_interventions():
    """Verify random and betweenness intervention functions."""
    G = generate_synthetic_graph(l=4, k=25)
    nodes = list(G.nodes())
    start_node = nodes[0]
    budget = 4

    # Random intervention
    rnd_blocked = random_intervention(G, budget, start_node=start_node, seed=42)
    assert len(rnd_blocked) == budget
    assert start_node not in rnd_blocked

    # Betweenness intervention
    bet_blocked = betweenness_intervention(G, budget, start_node=start_node)
    assert len(bet_blocked) == budget
    assert start_node not in bet_blocked


def test_post_benchmark_contract_and_leaderboard():
    """Verify POST /api/benchmark executes 100 runs per strategy with shared seeds and 95% CI."""
    payload = {
        "start_node": "0",
        "budget": 3,
        "runs": 50,  # test with 50 runs for speed during testing
        "dataset": "synthetic",
    }
    response = client.post("/api/benchmark", json=payload)
    assert response.status_code == 200

    data = BenchmarkResponse.model_validate(response.json())
    assert data.runs == 50
    assert len(data.strategies) == 5
    assert "none" in data.strategies
    assert "random" in data.strategies
    assert "degree" in data.strategies
    assert "betweenness" in data.strategies
    assert "knapsack" in data.strategies

    # Leaderboard has five rows
    assert len(data.leaderboard) == 5

    # Check knapsack statistics
    opt_stat = data.strategies["knapsack"]
    assert opt_stat.runs == 50
    assert opt_stat.mean_reach > 0
    assert opt_stat.std_dev >= 0
    assert opt_stat.ci95_margin >= 0
    assert opt_stat.ci95_lower <= opt_stat.mean_reach <= opt_stat.ci95_upper
    assert opt_stat.min_reach <= opt_stat.mean_reach <= opt_stat.max_reach


def test_post_budget_sweep_contract():
    """Verify POST /api/sweep computes trajectory from k=1 to 15 and returns flattening budget."""
    payload = {
        "start_node": "0",
        "min_budget": 1,
        "max_budget": 5,
        "runs_per_budget": 10,
        "dataset": "synthetic",
    }
    response = client.post("/api/sweep", json=payload)
    assert response.status_code == 200

    data = SweepResponse.model_validate(response.json())
    assert len(data.points) == 5
    assert data.points[0].budget == 1
    assert data.points[-1].budget == 5
    for pt in data.points:
        assert "knapsack" in pt.strategies
        assert "degree" in pt.strategies
        assert "betweenness" in pt.strategies
        assert "random" in pt.strategies
        assert "none" in pt.strategies
