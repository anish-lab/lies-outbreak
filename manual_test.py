import urllib.request
import gzip
from backend.data_engine import ingest_snap_dataset, get_graph_as_dicts

def run_manual_test():
    # 1. Download the SNAP Facebook dataset
    url = "https://snap.stanford.edu/data/facebook_combined.txt.gz"
    print("Downloading SNAP Facebook data...")
    response = urllib.request.urlopen(url)
    compressed_file = response.read()

    # 2. Extract and parse edges into the expected format
    print("Parsing edges...")
    edges = []
    data = gzip.decompress(compressed_file).decode('utf-8')
    for line in data.strip().split('\n'):
        u, v = line.split()
        edges.append({"source": u, "target": v})

    print(f"Loaded {len(edges)} edges from SNAP.")

    # 3. Use the Data Engine to sample a subgraph of ~300 nodes
    print("Ingesting and sampling graph using BFS...")
    G = ingest_snap_dataset(edges, target_size=300)
    print(f"Sampled Graph: {len(G.nodes)} nodes, {len(G.edges)} edges.")

    # 4. Convert to Python dicts for the frontend/simulation
    graph_dicts = get_graph_as_dicts(G)

    # Inspect the results manually
    print("\n--- Example Node Output ---")
    print(graph_dicts['nodes'][0])

    print("\n--- Example Edge Output ---")
    print(graph_dicts['edges'][0])

if __name__ == "__main__":
    run_manual_test()
