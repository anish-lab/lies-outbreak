import random
from collections import deque
from typing import Dict, Any, List

import networkx as nx

from .algorithms import calculate_betweenness_centrality, calculate_degree_centrality

def generate_synthetic_graph(l: int = 5, k: int = 60) -> nx.Graph:
    """
    Generate a synthetic clustered graph using networkx.connected_caveman_graph
    to represent a college network.
    
    Args:
        l (int): Number of cliques (groups).
        k (int): Size of each clique.
    
    Returns:
        nx.Graph: A NetworkX Graph with ~300 nodes (if l=5, k=60).
    """
    if l < 1 or k < 1:
        raise ValueError("Number of cliques (l) and size (k) must be at least 1.")
        
    G = nx.connected_caveman_graph(l, k)
    
    # Convert nodes to string to match schema {"id": str}
    G = nx.relabel_nodes(G, {n: str(n) for n in G.nodes()})
    
    # Assign groups based on connected caveman structure
    # For connected_caveman_graph(l, k), nodes are 0 to l*k-1
    # Clique i has nodes i*k to (i+1)*k - 1
    for n in G.nodes():
        node_idx = int(n)
        G.nodes[n]['group'] = node_idx // k
        
    G = _enrich_graph_attributes(G)
    return G

def ingest_snap_dataset(edges: List[Dict[str, str]], target_size: int = 300) -> nx.Graph:
    """
    Ingest the SNAP Facebook dataset (an edge list), sample ~target_size nodes 
    using BFS to ensure connectivity, and return a NetworkX graph.
    
    Args:
        edges (List[Dict[str, str]]): List of edge dictionaries.
        target_size (int): Target number of nodes to sample.
        
    Returns:
        nx.Graph: Subsampled NetworkX graph.
    """
    if not edges:
        raise ValueError("Edge list cannot be empty.")
        
    full_graph = nx.Graph()
    for edge in edges:
        if 'source' not in edge or 'target' not in edge:
            raise KeyError("Edges must contain 'source' and 'target' keys.")
        full_graph.add_edge(str(edge['source']), str(edge['target']))
        
    if len(full_graph) == 0:
        return full_graph

    # Extract largest connected component to ensure BFS can reach enough nodes
    largest_cc = max(nx.connected_components(full_graph), key=len)
    full_graph = full_graph.subgraph(largest_cc).copy()
    
    if len(full_graph) == 0:
        return full_graph

    # Sample nodes using BFS
    start_node = random.choice(list(full_graph.nodes()))
    sampled_nodes = {start_node}
    queue = deque([start_node])
    
    while queue and len(sampled_nodes) < target_size:
        current = queue.popleft()
        for neighbor in full_graph.neighbors(current):
            if neighbor not in sampled_nodes:
                sampled_nodes.add(neighbor)
                queue.append(neighbor)
                if len(sampled_nodes) >= target_size:
                    break
            if len(sampled_nodes) >= target_size:
                break

    # Induce subgraph on sampled nodes
    subgraph = full_graph.subgraph(sampled_nodes).copy()
    
    # Ensure it remains fully connected
    if len(subgraph) > 0:
        largest_cc_sub = max(nx.connected_components(subgraph), key=len)
        subgraph = subgraph.subgraph(largest_cc_sub).copy()
    
    # Assign random groups since SNAP Facebook dataset doesn't have explicit groups
    for n in subgraph.nodes():
        subgraph.nodes[n]['group'] = random.randint(0, 5)
        
    subgraph = _enrich_graph_attributes(subgraph)
    return subgraph

def _enrich_graph_attributes(G: nx.Graph) -> nx.Graph:
    """
    Calculate and attach degree, betweenness, and susceptibility to the graph nodes.
    """
    if len(G) == 0:
        return G
        
    betweenness = calculate_betweenness_centrality(G)
    
    for n in G.nodes():
        G.nodes[n]['degree'] = int(G.degree(n))
        G.nodes[n]['betweenness'] = float(betweenness[n])
        G.nodes[n]['susceptibility'] = random.uniform(0.0, 1.0)
        
    return G

def get_graph_as_dicts(G: nx.Graph) -> Dict[str, List[Dict[str, Any]]]:
    """
    Helper to return pure Python dictionaries representing the graph 
    (to be used by FastAPI routes/simulations).
    
    Returns:
        Dict with "nodes" and "edges" lists.
    """
    nodes = []
    for n, data in G.nodes(data=True):
        nodes.append({
            "id": str(n),
            "group": data.get("group", 0),
            "degree": data.get("degree", 0),
            "betweenness": data.get("betweenness", 0.0),
            "susceptibility": data.get("susceptibility", 0.0)
        })
        
    edges = []
    for u, v in G.edges():
        edges.append({
            "source": str(u),
            "target": str(v)
        })
        
    return {"nodes": nodes, "edges": edges}
