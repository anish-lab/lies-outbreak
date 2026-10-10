"""Pydantic models and data contracts for 'Outbreak of Lies' API.

Shared contracts:
- GraphResponse: {"dataset": str, "total_nodes": int, "nodes": [{"id": str, "group": int}], "links": [{"source": str, "target": str}]}
- SimRequest: {"start_node": str, "budget": int}
- SimResponse: {"baseline": SimResult, "optimized": SimResult}
  where SimResult is {"intervened_nodes": list, "total_reach": int, "ticks": [{"step": int, "newly_infected": list, "cumulative_infected": int}]}
"""

from typing import List, Optional
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
    """Payload returned by POST /api/simulate comparing none, degree, and knapsack strategies."""
    none: SimResult = Field(..., description="Simulation outcome with no intervention (true baseline)")
    degree: SimResult = Field(..., description="Simulation outcome under degree-centrality intervention")
    optimized: SimResult = Field(..., description="Simulation outcome under knapsack/optimized intervention")

    model_config = ConfigDict(extra="ignore")


class ErrorResponse(BaseModel):
    """Standardized error response payload."""
    detail: str = Field(..., description="Error message details")

class BenchmarkRequest(BaseModel):
    """Request payload for benchmark endpoint."""
    start_node: str = Field(..., min_length=1, description="Origin node for simulations")
    budget: int = Field(..., ge=0, description="Intervention budget for each run")
    runs: int = Field(100, ge=1, description="Number of Monte Carlo runs per strategy")
    seed: Optional[int] = Field(None, description="Base seed for reproducibility")
    dataset: str = Field(default="synthetic", description="Dataset to use: 'snap' or 'synthetic'")

class StrategyStats(BaseModel):
    """Aggregated statistics for a simulation strategy."""
    strategy: str = Field(..., description="Strategy name, e.g., 'degree' or 'knapsack'")
    mean_total_reach: float = Field(..., description="Mean total reach across runs")
    std_total_reach: float = Field(..., description="Standard deviation of total reach")
    ci95_low: float = Field(..., description="Lower bound of 95% confidence interval")
    ci95_high: float = Field(..., description="Upper bound of 95% confidence interval")
    mean_ticks: List[float] = Field(..., description="Mean newly infected count per tick")
    mean_cumulative: List[float] = Field(..., description="Mean cumulative infected per tick")

class BenchmarkResponse(BaseModel):
    """Response containing stats for each strategy."""
    results: List[StrategyStats] = Field(..., description="List of strategy statistics")

    """Standardized error response payload."""
    detail: str = Field(..., description="Error message details")
