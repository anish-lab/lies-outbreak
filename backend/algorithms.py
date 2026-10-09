import networkx as nx
from typing import Dict

def calculate_degree_centrality(graph: nx.Graph) -> Dict[str, float]:
    """
    Calculate Degree Centrality for all nodes in the graph.
    Returns a dictionary mapping node IDs to their degree centrality score.
    """
    return nx.degree_centrality(graph)

def calculate_betweenness_centrality(graph: nx.Graph) -> Dict[str, float]:
    """
    Calculate Betweenness Centrality for all nodes in the graph.
    Returns a dictionary mapping node IDs to their betweenness centrality score.
    """
    return nx.betweenness_centrality(graph)
