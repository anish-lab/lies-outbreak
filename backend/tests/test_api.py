"""Integration and unit tests for Outbreak of Lies FastAPI endpoints.

Verifies:
- GET /api/network?type={snap|synthetic} contracts and validation
- POST /api/simulate contracts, tick sequence, and baseline vs knapsack comparison
- Health check endpoints
- Error handling (HTTP 400 and validation errors)
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.models import GraphResponse, SimResponse, SimRequest

client = TestClient(app)


def test_root_endpoint():
    """Verify root endpoint status and discovery."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "endpoints" in data


def test_health_check_endpoint():
    """Verify health probe endpoint."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_get_network_synthetic_contract():
    """Verify GET /api/network?type=synthetic conforms strictly to GraphResponse schema."""
    response = client.get("/api/network?type=synthetic")
    assert response.status_code == 200
    
    # Strict validation via Pydantic model
    validated = GraphResponse.model_validate(response.json())
    assert validated.dataset == "synthetic"
    assert validated.total_nodes > 0
    assert len(validated.nodes) == validated.total_nodes
    assert len(validated.links) > 0
    
    # Verify node structure
    first_node = validated.nodes[0]
    assert isinstance(first_node.id, str)
    assert isinstance(first_node.group, int)
    
    # Verify link structure
    first_link = validated.links[0]
    assert isinstance(first_link.source, str)
    assert isinstance(first_link.target, str)


def test_get_network_snap_contract():
    """Verify GET /api/network?type=snap conforms strictly to GraphResponse schema."""
    response = client.get("/api/network?type=snap")
    assert response.status_code == 200
    
    validated = GraphResponse.model_validate(response.json())
    assert validated.dataset == "snap"
    assert validated.total_nodes > 0
    assert len(validated.nodes) == validated.total_nodes
    assert len(validated.links) > 0


def test_get_network_invalid_type_returns_400():
    """Verify invalid network type returns HTTP 400 Bad Request."""
    response = client.get("/api/network?type=unsupported_type")
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
    assert "Invalid network type" in data["detail"]


def test_post_simulate_success_contract():
    """Verify POST /api/simulate conforms strictly to SimResponse schema and compares baseline vs optimized."""
    payload = {"start_node": "0", "budget": 3}
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200

    # Strict validation via Pydantic model
    validated = SimResponse.model_validate(response.json())

    # Baseline verification
    assert isinstance(validated.baseline.intervened_nodes, list)
    assert len(validated.baseline.intervened_nodes) == 3
    assert validated.baseline.total_reach >= 1
    assert len(validated.baseline.ticks) > 0

    # Step 0 tick verification
    tick_0_baseline = validated.baseline.ticks[0]
    assert tick_0_baseline.step == 0
    assert "0" in tick_0_baseline.newly_infected
    assert tick_0_baseline.cumulative_infected == 1

    # Optimized verification
    assert isinstance(validated.optimized.intervened_nodes, list)
    assert len(validated.optimized.intervened_nodes) == 3
    assert validated.optimized.total_reach >= 1
    assert len(validated.optimized.ticks) > 0

    tick_0_opt = validated.optimized.ticks[0]
    assert tick_0_opt.step == 0
    assert "0" in tick_0_opt.newly_infected

    # Verify that the knapsack strategy achieves better or equal containment compared to naive baseline
    assert validated.optimized.total_reach <= validated.baseline.total_reach


def test_post_simulate_zero_budget():
    """Verify simulation handles 0 budget correctly without error."""
    payload = {"start_node": "0", "budget": 0}
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200

    validated = SimResponse.model_validate(response.json())
    assert len(validated.baseline.intervened_nodes) == 0
    assert len(validated.optimized.intervened_nodes) == 0
    assert validated.baseline.total_reach == validated.optimized.total_reach


def test_post_simulate_invalid_start_node_returns_400():
    """Verify simulation with a non-existent start node returns HTTP 400."""
    payload = {"start_node": "nonexistent_node_9999", "budget": 2}
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
    assert "not found in the social network" in data["detail"]


def test_post_simulate_negative_budget_returns_error():
    """Verify negative budget is rejected with validation error."""
    payload = {"start_node": "0", "budget": -5}
    response = client.post("/api/simulate", json=payload)
    # FastAPI/Pydantic returns 422 Unprocessable Entity for schema violations
    assert response.status_code in [400, 422]


def test_post_simulate_empty_start_node_returns_error():
    """Verify empty start node is rejected."""
    payload = {"start_node": "", "budget": 2}
    response = client.post("/api/simulate", json=payload)
    assert response.status_code in [400, 422]


def test_cors_headers_allowed():
    """Verify CORS headers allow cross-origin requests from frontend."""
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
    }
    response = client.options("/api/simulate", headers=headers)
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers
