"""Pydantic models and data contracts for 'Outbreak of Lies' API.

Shared contracts:
- GraphResponse: {"dataset": str, "total_nodes": int, "nodes": [{"id": str, "group": int}], "links": [{"source": str, "target": str}]}
- SimRequest: {"start_node": str, "budget": int}
- SimResponse: {"baseline": SimResult, "optimized": SimResult}
  where SimResult is {"intervened_nodes": list, "total_reach": int, "ticks": [{"step": int, "newly_infected": list, "cumulative_infected": int}]}
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class GraphNode(BaseModel):
    """Represents a node in the social network (e.g., student account)."""
    id: str = Field(..., description="Unique node identifier")
    group: int = Field(default=1, description="Community/cluster group index")

    model_config = ConfigDict(extra="ignore")


class GraphLink(BaseModel):
    """Represents a relationship/link between two nodes in the network."""
    source: str = Field(..., description="Source node id")
    target: str = Field(..., description="Target node id")

    model_config = ConfigDict(extra="ignore")


class GraphResponse(BaseModel):
    """Payload returned by GET /api/network."""
    dataset: str = Field(..., description="Dataset name, e.g. 'snap' or 'synthetic'")
    total_nodes: int = Field(..., description="Total number of nodes in the network")
    nodes: List[GraphNode] = Field(..., description="List of social network nodes")
    links: List[GraphLink] = Field(..., description="List of relationships/edges")

    model_config = ConfigDict(extra="ignore")


class SimRequest(BaseModel):
    """Payload accepted by POST /api/simulate."""
    start_node: str = Field(..., min_length=1, description="Origin account where the rumour begins")
    budget: int = Field(..., ge=0, description="Intervention budget (accounts fact-checked/blocked)")
    dataset: str = Field(default="synthetic", description="Dataset to simulate on: 'snap' or 'synthetic'")

    model_config = ConfigDict(extra="ignore")


class Tick(BaseModel):
    """Discrete time step capturing the rumour propagation."""
    step: int = Field(..., ge=0, description="Step index (0 is outbreak start)")
    newly_infected: List[str] = Field(default_factory=list, description="Accounts newly influenced/infected this step")
    cumulative_infected: int = Field(..., ge=0, description="Total infected accounts reach at this step")

    model_config = ConfigDict(extra="ignore")


class SimResult(BaseModel):
    """Simulation outcome and timeline for an intervention strategy."""
    intervened_nodes: List[str] = Field(default_factory=list, description="Accounts blocked or fact-checked")
    total_reach: int = Field(..., ge=0, description="Total number of infected accounts at end of simulation")
    ticks: List[Tick] = Field(..., description="Sequential timeline of rumour progression")

    model_config = ConfigDict(extra="ignore")


class SimResponse(BaseModel):
    """Payload returned by POST /api/simulate comparing all intervention strategies."""
    none: SimResult = Field(..., description="Simulation outcome with no intervention (true baseline)")
    degree: SimResult = Field(..., description="Simulation outcome under degree-centrality intervention")
    optimized: SimResult = Field(..., description="Simulation outcome under knapsack/optimized intervention")
    random: Optional[SimResult] = Field(default=None, description="Simulation outcome under uniform random intervention")
    betweenness: Optional[SimResult] = Field(default=None, description="Simulation outcome under pure static betweenness intervention")
    baseline: Optional[SimResult] = Field(default=None, description="Backward compatibility alias for degree baseline")

    model_config = ConfigDict(extra="ignore")


class BenchmarkRequest(BaseModel):
    """Payload accepted by POST /api/benchmark."""
    start_node: str = Field(..., min_length=1, description="Origin account where the rumour begins")
    budget: int = Field(default=3, ge=0, description="Intervention budget for defense strategies")
    runs: int = Field(default=100, ge=1, le=500, description="Number of simulation runs per strategy (default 100)")
    dataset: str = Field(default="snap", description="Dataset to benchmark on: 'snap' or 'synthetic'")

    model_config = ConfigDict(extra="ignore")


class StrategyBenchmarkResult(BaseModel):
    """Statistical summary for an intervention strategy across Monte Carlo runs."""
    strategy: str = Field(..., description="Identifier of the strategy")
    label: str = Field(..., description="Human-readable title")
    runs: int = Field(..., description="Number of simulation runs evaluated")
    mean_reach: float = Field(..., description="Mean infected count across runs")
    std_dev: float = Field(..., description="Sample standard deviation of infected count")
    ci95_lower: float = Field(..., description="Lower bound of 95% Confidence Interval")
    ci95_upper: float = Field(..., description="Upper bound of 95% Confidence Interval")
    ci95_margin: float = Field(..., description="Margin of error (half-width) for 95% CI")
    min_reach: int = Field(..., description="Minimum reach observed across all runs")
    max_reach: int = Field(..., description="Maximum reach observed across all runs")
    reduction_pct: float = Field(..., description="Percentage reduction compared to 'none' strategy")
    users_saved: float = Field(..., description="Average number of users saved vs 'none'")
    intervened_nodes: List[str] = Field(default_factory=list, description="Nodes blocked under this strategy")

    model_config = ConfigDict(extra="ignore")


class BenchmarkResponse(BaseModel):
    """Payload returned by POST /api/benchmark."""
    dataset: str = Field(..., description="Dataset benchmarked")
    start_node: str = Field(..., description="Rumour origin node")
    budget: int = Field(..., description="Defense budget applied")
    runs: int = Field(..., description="Monte Carlo runs per strategy")
    strategies: Dict[str, StrategyBenchmarkResult] = Field(..., description="Benchmark stats keyed by strategy")
    leaderboard: List[StrategyBenchmarkResult] = Field(..., description="Leaderboard sorted by mean reach ascending")

    model_config = ConfigDict(extra="ignore")


class SweepRequest(BaseModel):
    """Payload accepted by POST /api/sweep for budget sweep evaluation."""
    start_node: str = Field(..., min_length=1, description="Origin account where the rumour begins")
    min_budget: int = Field(default=1, ge=0, description="Minimum budget (e.g. 1)")
    max_budget: int = Field(default=15, ge=1, description="Maximum budget (e.g. 15)")
    runs_per_budget: int = Field(default=20, ge=1, le=100, description="Monte Carlo runs per budget level")
    dataset: str = Field(default="snap", description="Dataset to evaluate on")

    model_config = ConfigDict(extra="ignore")


class SweepPoint(BaseModel):
    """Data point for a budget level across all strategies."""
    budget: int = Field(..., description="Intervention budget k")
    strategies: Dict[str, float] = Field(..., description="Mean reach for each strategy at budget k")

    model_config = ConfigDict(extra="ignore")


class SweepResponse(BaseModel):
    """Payload returned by POST /api/sweep."""
    dataset: str = Field(..., description="Dataset evaluated")
    start_node: str = Field(..., description="Rumour origin node")
    min_budget: int = Field(..., description="Minimum budget")
    max_budget: int = Field(..., description="Maximum budget")
    runs_per_budget: int = Field(..., description="Runs evaluated per point")
    points: List[SweepPoint] = Field(..., description="Trajectory points from min_budget to max_budget")
    flattening_budget: Optional[int] = Field(default=None, description="Detected budget where knapsack returns flatten")

    model_config = ConfigDict(extra="ignore")


class ErrorResponse(BaseModel):
    """Standardized error response payload."""
    detail: str = Field(..., description="Error message details")

