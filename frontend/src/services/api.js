import axios from 'axios';

/**
 * Fetch the social network topology from the real backend.
 * Throws on failure — no mock fallback. Caller should show an error banner.
 */
export const fetchNetwork = async (type = 'synthetic') => {
  const res = await axios.get(`/api/network?type=${type}`);
  if (!res.data || !res.data.nodes) {
    throw new Error('Invalid network response from server: missing nodes.');
  }
  // Backend returns "links" (GraphLink schema)
  return {
    nodes: res.data.nodes,
    links: res.data.links || [],
  };
};

/**
 * Run a simulation on the real backend.
 * Payload uses start_node (not sourceNode).
 * Throws on failure — caller shows an error banner instead of fake data.
 */
export const runSimulation = async (start_node, budget, dataset = 'synthetic') => {
  const res = await axios.post('/api/simulate', { start_node, budget, dataset });
  if (!res.data || !res.data.none) {
    throw new Error('Invalid simulation response from server: missing none/degree/optimized results.');
  }
  return res.data;
};
