import axios from 'axios';

// Long timeout for compute-heavy benchmark/sweep endpoints (100 runs × 5 strategies)
const LONG_TIMEOUT = 60000; // 60 seconds

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
export const runSimulation = async (start_node, budget, dataset = 'snap') => {
  const res = await axios.post('/api/simulate', { start_node, budget, dataset });
  if (!res.data || !res.data.none) {
    throw new Error('Invalid simulation response from server: missing none/degree/optimized results.');
  }
  return res.data;
};

/**
 * Run a multi-run Monte Carlo benchmark (100 runs per strategy with shared seeds).
 * Returns statistical means, standard deviations, 95% Confidence Intervals, and leaderboard.
 * Uses a 60s timeout since precomputing interventions + 100×5 runs takes ~2-3s server-side.
 */
export const runBenchmark = async (start_node, budget = 3, dataset = 'snap', runs = 100) => {
  const res = await axios.post('/api/benchmark', {
    start_node,
    budget,
    dataset,
    runs,
  }, { timeout: LONG_TIMEOUT });
  if (!res.data || !res.data.leaderboard) {
    throw new Error('Invalid benchmark response: missing leaderboard data.');
  }
  return res.data;
};

/**
 * Run a budget sweep (k = 1 to 15) to identify diminishing returns / flattening elbow.
 * Uses a 60s timeout since sweeping 15 budgets × 20 seeds takes ~4-5s server-side.
 */
export const runSweep = async (start_node, min_budget = 1, max_budget = 15, dataset = 'snap', runs_per_budget = 20) => {
  const res = await axios.post('/api/sweep', {
    start_node,
    min_budget,
    max_budget,
    dataset,
    runs_per_budget,
  }, { timeout: LONG_TIMEOUT });
  if (!res.data || !res.data.points) {
    throw new Error('Invalid budget sweep response: missing data points.');
  }
  return res.data;
};
