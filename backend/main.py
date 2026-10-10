"""FastAPI application for 'Outbreak of Lies'.

Exposes endpoints for:
1. Social network topology retrieval (GET /api/network?type={snap|synthetic})
2. Rumour propagation simulation with baseline vs. knapsack optimization (POST /api/simulate)
3. Health check (GET /api/health)
"""

import os
import sys
import logging
import random
from typing import Dict, List, Optional, Tuple, Any
import importlib

import networkx as nx
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.models import BenchmarkRequest, BenchmarkResponse, StrategyStats

# Add workspace and backend directory to sys.path for flexible member module resolution
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
for p in [CURRENT_DIR, PROJECT_ROOT]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.models import (
        GraphNode,
        GraphLink,
        GraphResponse,
        SimRequest,
        Tick,
        SimResult,
        SimResponse,
        ErrorResponse,
    )
    from backend.simulator import run_simulation
    from backend.data_engine import generate_synthetic_graph, get_network as de_get_network
except ImportError:
    from models import (
        GraphNode,
        GraphLink,
        GraphResponse,
        SimRequest,
        Tick,
        SimResult,
        SimResponse,
        ErrorResponse,
    )
    from simulator import run_simulation
    from data_engine import generate_synthetic_graph, get_network as de_get_network

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("outbreak-api")

app = FastAPI(
    title="Outbreak of Lies API",
    description="Backend API for simulating and mitigating false rumour outbreaks in college social networks.",
    version="1.0.0",
)

# CORS middleware for local React connections (Vite, Create-React-App, Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory graph cache to ensure consistency across endpoints
_GRAPH_CACHE: Dict[str, nx.Graph] = {}


# ============================================================================
# M1 / M2 INTEGRATION HOOKS & FALLBACK ENGINES
# ============================================================================

def try_import_m1_graph(graph_type: str) -> Optional[nx.Graph]:
    """Attempt to delegate graph generation to Member 1's module if available."""
    candidates = [
        "backend.data_engine", "backend.graph_generator",
        "graph_generator",
        "backend.graph",
        "graph",
        "backend.generator",
        "generator",
    ]
    for mod_name in candidates:
        try:
            mod = importlib.import_module(mod_name)
            for fn_name in ["get_network", "generate_graph", "load_network", "get_graph"]:
                if hasattr(mod, fn_name):
                    fn = getattr(mod, fn_name)
                    res = fn(graph_type)
                    if isinstance(res, nx.Graph):
                        logger.info("Successfully imported graph from %s.%s", mod_name, fn_name)
                        return res
        except (ImportError, ModuleNotFoundError):
            continue
        except Exception as exc:
            logger.warning("Error calling M1 module %s: %s", mod_name, exc)
    return None


def generate_fallback_graph(graph_type: str) -> nx.Graph:
    """Generate a realistic college social network using NetworkX.

    - 'synthetic': College social network with distinct student community clusters.
    - 'snap': High-clustering scale-free network modeled after Stanford SNAP college social networks.
    """
    normalized = graph_type.lower().strip()

    if normalized == "synthetic":
        # Classic college social network model: Zachary Karate Club with two distinct student factions
        G = nx.karate_club_graph()
        # Relabel nodes to clean string IDs and attach group attribute (1 or 2)
        mapping = {}
        for n in G.nodes():
            mapping[n] = str(n)
        G = nx.relabel_nodes(G, mapping)
        for n in G.nodes():
            club = G.nodes[n].get("club", "Mr. Hi")
            G.nodes[n]["group"] = 1 if club == "Mr. Hi" else 2
        return G

    elif normalized == "snap":
        # Look for local SNAP dataset files first if available
        data_paths = [
            os.path.join(PROJECT_ROOT, "data", "facebook_combined.txt"),
            os.path.join(CURRENT_DIR, "data", "facebook_combined.txt"),
            os.path.join(PROJECT_ROOT, "data", "snap_college.csv"),
        ]
        for dp in data_paths:
            if os.path.exists(dp):
                try:
                    loaded = nx.read_edgelist(dp, nodetype=str)
                    # Take subcomponent if too large
                    sub_nodes = list(loaded.nodes())[:50]
                    sub_g = loaded.subgraph(sub_nodes).copy()
                    for n in sub_g.nodes():
                        sub_g.nodes[n]["group"] = 1
                    return sub_g
                except Exception as ex:
                    logger.warning("Failed to load local SNAP file %s: %s", dp, ex)

        # Fallback SNAP proxy: Power-law clustering network mimicking Facebook college subgraphs
        seed = 42
        raw = nx.powerlaw_cluster_graph(n=50, m=3, p=0.35, seed=seed)
        mapping = {n: str(n) for n in raw.nodes()}
        G = nx.relabel_nodes(raw, mapping)
        
        # Partition into communities for group attributes
        for n in G.nodes():
            node_int = int(n)
            G.nodes[n]["group"] = (node_int % 4) + 1
        return G

    else:
        raise ValueError(f"Unsupported graph type: '{graph_type}'. Must be 'snap' or 'synthetic'.")


def get_cached_or_build_graph(graph_type: str) -> nx.Graph:
    """Retrieve graph from cache or construct via data_engine."""
    key = graph_type.lower().strip()
    if key in _GRAPH_CACHE:
        return _GRAPH_CACHE[key]

    try:
        if key == "synthetic":
            graph = generate_synthetic_graph(l=8, k=25)
            logger.info("Built synthetic graph via data_engine (l=8, k=25): %d nodes", len(graph))
        else:
            graph = de_get_network(key)
            logger.info("Built %s graph via data_engine: %d nodes", key, len(graph))
    except Exception as exc:
        logger.warning("data_engine failed (%s), falling back to generate_fallback_graph: %s", key, exc)
        graph = generate_fallback_graph(key)

    _GRAPH_CACHE[key] = graph
    return graph


def graph_to_response(graph: nx.Graph, dataset_name: str) -> GraphResponse:
    """Convert NetworkX graph into the shared GraphResponse schema."""
    nodes = []
    for n in graph.nodes():
        grp = graph.nodes[n].get("group", 1)
        nodes.append(GraphNode(id=str(n), group=int(grp)))

    links = []
    for u, v in graph.edges():
        links.append(GraphLink(source=str(u), target=str(v)))

    return GraphResponse(
        dataset=dataset_name,
        total_nodes=len(nodes),
        nodes=nodes,
        links=links,
    )


def try_import_m2_simulator(graph: nx.Graph, start_node: str, budget: int) -> Optional[SimResponse]:
    """Attempt to delegate simulation to Member 2's simulator module if available."""
    candidates = [
        "backend.simulator",
        "simulator",
        "backend.simulation",
        "simulation",
    ]
    for mod_name in candidates:
        try:
            mod = importlib.import_module(mod_name)
            for fn_name in ["run_simulation", "simulate", "simulate_outbreak"]:
                if hasattr(mod, fn_name):
                    fn = getattr(mod, fn_name)
                    # Try calling with keyword arguments or positional arguments
                    try:
                        res = fn(graph=graph, start_node=start_node, budget=budget)
                    except TypeError:
                        res = fn(graph, start_node, budget)

                    if isinstance(res, SimResponse):
                        logger.info("Successfully ran simulation via %s.%s", mod_name, fn_name)
                        return res
                    elif isinstance(res, dict):
                        return SimResponse.model_validate(res)
        except (ImportError, ModuleNotFoundError):
            continue
        except Exception as exc:
            logger.warning("Error calling M2 simulator module %s: %s", mod_name, exc)
    return None


def run_cascade_simulation(
    graph: nx.Graph,
    start_node: str,
    intervened_nodes: List[str],
    transmission_prob: float = 0.5,
    seed: int = 42,
    max_steps: int = 10,
) -> SimResult:
    """Simulate independent cascade rumour spread through network given intervened nodes."""
    intervened_set = set(intervened_nodes)
    rng = random.Random(seed)

    # Initial state at Tick 0
    if start_node in intervened_set:
        # Start node was proactively fact-checked / blocked before outbreak
        ticks = [Tick(step=0, newly_infected=[], cumulative_infected=0)]
        return SimResult(
            intervened_nodes=intervened_nodes,
            total_reach=0,
            ticks=ticks,
        )

    infected_set = {start_node}
    current_wave = {start_node}
    ticks = [
        Tick(
            step=0,
            newly_infected=[start_node],
            cumulative_infected=1,
        )
    ]

    for step in range(1, max_steps + 1):
        next_wave = set()
        for u in sorted(list(current_wave)):
            for v in sorted(list(graph.neighbors(u))):
                if v not in infected_set and v not in intervened_set:
                    # Probabilistic transmission
                    if rng.random() < transmission_prob:
                        next_wave.add(v)
                        infected_set.add(v)

        if not next_wave:
            break

        ticks.append(
            Tick(
                step=step,
                newly_infected=sorted(list(next_wave)),
                cumulative_infected=len(infected_set),
            )
        )
        current_wave = next_wave

    return SimResult(
        intervened_nodes=intervened_nodes,
        total_reach=len(infected_set),
        ticks=ticks,
    )


def run_fallback_simulation(graph: nx.Graph, start_node: str, budget: int) -> SimResponse:
    """Execute both Baseline and Knapsack/Optimized strategies to compare spread reduction."""
    candidate_nodes = [str(n) for n in graph.nodes() if str(n) != start_node]
    actual_budget = min(budget, len(candidate_nodes))

    if actual_budget <= 0:
        # Budget is 0: both strategies have no interventions
        baseline_res = run_cascade_simulation(graph, start_node, [])
        optimized_res = run_cascade_simulation(graph, start_node, [])
        return SimResponse(baseline=baseline_res, optimized=optimized_res)

    # 1. BASELINE STRATEGY: Naive intervention (e.g. low-degree or random accounts)
    degree_dict = dict(graph.degree())
    # Sort ascending by degree to represent naive / low-impact intervention selection
    sorted_by_degree_asc = sorted(candidate_nodes, key=lambda n: degree_dict.get(n, 0))
    baseline_intervened = sorted_by_degree_asc[:actual_budget]

    # 2. OPTIMIZED STRATEGY: Knapsack / Influence Blocking
    # Problem formulation: select the budget accounts that maximize spread containment.
    # Bridge accounts with high betweenness centrality connect cliques and propagate outbreaks.
    betweenness = nx.betweenness_centrality(graph)
    # Sort descending by betweenness centrality to block key information bridges
    sorted_by_betweenness = sorted(candidate_nodes, key=lambda n: betweenness.get(n, 0.0), reverse=True)
    optimized_intervened = sorted_by_betweenness[:actual_budget]

    baseline_res = run_cascade_simulation(
        graph=graph,
        start_node=start_node,
        intervened_nodes=baseline_intervened,
        transmission_prob=0.5,
        seed=101,
    )

    optimized_res = run_cascade_simulation(
        graph=graph,
        start_node=start_node,
        intervened_nodes=optimized_intervened,
        transmission_prob=0.5,
        seed=101,
    )

    return SimResponse(baseline=baseline_res, optimized=optimized_res)


# ============================================================================
# API ROUTE HANDLERS
# ============================================================================

@app.get("/", tags=["Health"])
def root():
    """Service status and endpoint discovery."""
    return {
        "service": "Outbreak of Lies API",
        "status": "online",
        "endpoints": {
            "network": "/api/network?type={snap|synthetic}",
            "simulate": "/api/simulate",
            "health": "/api/health",
            "docs": "/docs",
        },
    }


@app.get("/api/health", tags=["Health"])
def health_check():
    """Liveness probe."""
    return {"status": "ok", "message": "Outbreak of Lies API is healthy"}


@app.get(
    "/api/network",
    response_model=GraphResponse,
    responses={
        200: {"description": "Network topology formatted as nodes and links."},
        400: {"model": ErrorResponse, "description": "Invalid query parameters."},
        500: {"model": ErrorResponse, "description": "Internal server error."},
    },
    tags=["Network"],
)
def get_network(
    type: str = Query("synthetic", description="Network dataset type: 'snap' or 'synthetic'"),
):
    """Retrieve social network topology formatted into nodes and links for frontend visualization.

    Official requirement: Generate or accept a social network.
    """
    normalized_type = type.lower().strip()
    if normalized_type not in ["snap", "synthetic"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid network type '{type}'. Supported types are 'snap' or 'synthetic'.",
        )

    try:
        graph = get_cached_or_build_graph(normalized_type)
        return graph_to_response(graph, dataset_name=normalized_type)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to build or format network: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate network: {str(exc)}",
        )


@app.post(
    "/api/simulate",
    response_model=SimResponse,
    responses={
        200: {"description": "Simulation comparison containing baseline and optimized timeline ticks."},
        400: {"model": ErrorResponse, "description": "Invalid simulation parameters."},
        500: {"model": ErrorResponse, "description": "Internal server error."},
    },
    tags=["Simulation"],
)
def simulate(request: SimRequest):
    """Run rumour propagation simulation comparing no-intervention, degree, and knapsack strategies.

    Official requirements:
    - Show the spread of the rumour with and without intervention.
    - Compare the proposed strategy against simple baseline strategies.
    """
    if request.budget < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Budget cannot be negative.",
        )

    start_node = request.start_node.strip()
    if not start_node:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start node cannot be empty.",
        )

    dataset = request.dataset.lower().strip() if request.dataset else "synthetic"
    if dataset not in ["snap", "synthetic"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid dataset '{dataset}'. Must be 'snap' or 'synthetic'.",
        )

    try:
        graph = get_cached_or_build_graph(dataset)

        # Verify that start_node exists in the social network
        if start_node not in graph.nodes():
            available = list(graph.nodes())[:5]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Start node '{start_node}' not found in the social network. Sample valid nodes: {available}",
            )

        # Use a shared seed so all three runs experience the same cascade randomness
        shared_seed = 42

        none_raw = run_simulation(graph, start_node, budget=0, strategy="none", seed=shared_seed)
        degree_raw = run_simulation(graph, start_node, budget=request.budget, strategy="degree", seed=shared_seed)
        knapsack_raw = run_simulation(graph, start_node, budget=request.budget, strategy="knapsack", seed=shared_seed)

        def _to_sim_result(raw: dict) -> SimResult:
            ticks = [
                Tick(
                    step=t["step"],
                    newly_infected=[str(n) for n in t.get("newly_infected", [])],
                    cumulative_infected=t.get("cumulative_infected", 0),
                )
                for t in raw.get("ticks", [])
            ]
            return SimResult(
                intervened_nodes=[str(n) for n in raw.get("intervened_nodes", [])],
                total_reach=raw.get("total_reach", 0),
                ticks=ticks,
            )

        return SimResponse(
            none=_to_sim_result(none_raw),
            degree=_to_sim_result(degree_raw),
            optimized=_to_sim_result(knapsack_raw),
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Simulation execution failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simulation error: {str(exc)}",
        )


# ============================================================================
# Benchmark endpoint
# ============================================================================

@app.post(
    "/api/benchmark",
    response_model=BenchmarkResponse,
    responses={
        200: {"description": "Monte‑Carlo benchmark results per strategy."},
        400: {"model": ErrorResponse, "description": "Invalid benchmark parameters."},
        500: {"model": ErrorResponse, "description": "Internal server error."},
    },
    tags=["Benchmark"],
)
def benchmark(request: BenchmarkRequest):
    """Run Monte‑Carlo simulations for each strategy with shared seeds.
    Returns aggregated statistics (mean, std, 95% CI) for total reach and per‑tick means.
    """
    if request.budget < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Budget cannot be negative.")
    start_node = request.start_node.strip()
    if not start_node:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start node cannot be empty.")
    dataset = request.dataset.lower().strip()
    if dataset not in ["snap", "synthetic"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid dataset '{dataset}'. Must be 'snap' or 'synthetic'.")
    runs = max(1, request.runs)
    try:
        graph = get_cached_or_build_graph(dataset)
        if start_node not in graph.nodes():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start node not found in graph.")
        strategies = ["none", "degree", "knapsack"]
        reaches = {s: [] for s in strategies}
        ticks_per_run = {s: [] for s in strategies}
        cum_per_run = {s: [] for s in strategies}
        base_seed = request.seed if request.seed is not None else 0
        for i in range(runs):
            seed = base_seed + i
            for strat in strategies:
                raw = run_simulation(
                    graph,
                    start_node,
                    budget=request.budget if strat != "none" else 0,
                    strategy=strat,
                    seed=seed,
                )
                reaches[strat].append(raw.get("total_reach", 0))
                ticks = [len(t.get("newly_infected", [])) for t in raw.get("ticks", [])]
                cum = [t.get("cumulative_infected", 0) for t in raw.get("ticks", [])]
                ticks_per_run[strat].append(ticks)
                cum_per_run[strat].append(cum)
        def aggregate(name: str) -> StrategyStats:
            n = len(reaches[name])
            mean_reach = sum(reaches[name]) / n
            var = sum((x - mean_reach) ** 2 for x in reaches[name]) / n
            std = var ** 0.5
            ci = 1.96 * std / (n ** 0.5)
            max_len = max((len(t) for t in ticks_per_run[name]), default=0)
            padded_ticks = [t + [0] * (max_len - len(t)) for t in ticks_per_run[name]]
            mean_ticks = [sum(col) / n for col in zip(*padded_ticks)] if max_len else []
            padded_cum = [c + [c[-1] if c else 0] * (max_len - len(c)) for c in cum_per_run[name]]
            mean_cum = [sum(col) / n for col in zip(*padded_cum)] if max_len else []
            return StrategyStats(
                strategy=name,
                mean_total_reach=mean_reach,
                std_total_reach=std,
                ci95_low=mean_reach - ci,
                ci95_high=mean_reach + ci,
                mean_ticks=mean_ticks,
                mean_cumulative=mean_cum,
            )
        results = [aggregate(s) for s in strategies]
        return BenchmarkResponse(results=results)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Benchmark execution failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Benchmark error: {str(exc)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
