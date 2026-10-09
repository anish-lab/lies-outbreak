import pytest
import networkx as nx
from backend.data_engine import generate_synthetic_graph, ingest_snap_dataset, get_graph_as_dicts
from backend.algorithms import calculate_degree_centrality, calculate_betweenness_centrality

def test_generate_synthetic_graph():
    # Generate graph with 3 cliques of size 10 (30 nodes) for faster testing
    G = generate_synthetic_graph(l=3, k=10)
    
    assert isinstance(G, nx.Graph)
    assert len(G.nodes) == 30
    
    # Check attributes
    for n, data in G.nodes(data=True):
        assert isinstance(n, str)
        assert 'group' in data
        assert isinstance(data['group'], int)
        assert 'degree' in data
        assert isinstance(data['degree'], int)
        assert 'betweenness' in data
        assert isinstance(data['betweenness'], float)
        assert 0.0 <= data['betweenness'] <= 1.0
        assert 'susceptibility' in data
        assert isinstance(data['susceptibility'], float)
        assert 0.0 <= data['susceptibility'] <= 1.0

def test_ingest_snap_dataset():
    # Create a simple edge list
    edges = [
        {"source": "1", "target": "2"},
        {"source": "2", "target": "3"},
        {"source": "3", "target": "4"},
        {"source": "4", "target": "1"},
        {"source": "1", "target": "5"},
        {"source": "5", "target": "6"},
    ]
    
    # Target size 4
    G = ingest_snap_dataset(edges, target_size=4)
    
    assert isinstance(G, nx.Graph)
    # The sampled graph could be exactly 4 nodes, but might be slightly smaller
    # if the connected component logic trims it (though BFS ensures it).
    # Since we have 6 connected nodes in total, it should return exactly 4.
    assert len(G.nodes) == 4
    
    # Check attributes
    for n, data in G.nodes(data=True):
        assert isinstance(n, str)
        assert 'group' in data
        assert isinstance(data['group'], int)
        assert 'degree' in data
        assert isinstance(data['degree'], int)
        assert 'betweenness' in data
        assert isinstance(data['betweenness'], float)
        assert 0.0 <= data['betweenness'] <= 1.0
        assert 'susceptibility' in data
        assert isinstance(data['susceptibility'], float)
        assert 0.0 <= data['susceptibility'] <= 1.0

def test_get_graph_as_dicts():
    G = generate_synthetic_graph(l=2, k=5)
    graph_dict = get_graph_as_dicts(G)
    
    assert "nodes" in graph_dict
    assert "edges" in graph_dict
    
    assert len(graph_dict["nodes"]) == 10
    
    # Verify node schema
    node = graph_dict["nodes"][0]
    assert "id" in node and isinstance(node["id"], str)
    assert "group" in node and isinstance(node["group"], int)
    assert "degree" in node and isinstance(node["degree"], int)
    assert "betweenness" in node and isinstance(node["betweenness"], float)
    assert "susceptibility" in node and isinstance(node["susceptibility"], float)
    
    # Verify edge schema
    edge = graph_dict["edges"][0]
    assert "source" in edge and isinstance(edge["source"], str)
    assert "target" in edge and isinstance(edge["target"], str)

def test_algorithms():
    # Create a star graph
    G = nx.star_graph(4)
    
    deg_cent = calculate_degree_centrality(G)
    bet_cent = calculate_betweenness_centrality(G)
    
    assert isinstance(deg_cent, dict)
    assert isinstance(bet_cent, dict)
    
    for n in G.nodes():
        assert n in deg_cent
        assert isinstance(deg_cent[n], float)
        assert 0.0 <= deg_cent[n] <= 1.0
        
        assert n in bet_cent
        assert isinstance(bet_cent[n], float)
        assert 0.0 <= bet_cent[n] <= 1.0
