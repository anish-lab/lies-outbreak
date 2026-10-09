import axios from 'axios';

// Mock data
const mockNetwork = {
  nodes: [
    { id: '1', group: 1 }, { id: '2', group: 1 }, { id: '3', group: 1 },
    { id: '4', group: 2 }, { id: '5', group: 2 }, { id: '6', group: 2 },
    { id: '7', group: 3 }, { id: '8', group: 3 }, { id: '9', group: 3 },
    { id: '10', group: 4 }, { id: '11', group: 4 }, { id: '12', group: 4 }
  ],
  links: [
    { source: '1', target: '2' }, { source: '1', target: '3' },
    { source: '2', target: '4' }, { source: '3', target: '5' },
    { source: '4', target: '6' }, { source: '5', target: '7' },
    { source: '6', target: '8' }, { source: '7', target: '9' },
    { source: '8', target: '10' }, { source: '9', target: '11' },
    { source: '10', target: '12' }, { source: '11', target: '12' },
    { source: '1', target: '12' }, { source: '4', target: '9' }
  ]
};

const mockSimulation = {
  baseline: {
    intervened_nodes: [],
    ticks: [
      { step: 0, newly_infected: ['1'] },
      { step: 1, newly_infected: ['2', '3'] },
      { step: 2, newly_infected: ['4', '5'] },
      { step: 3, newly_infected: ['6', '7', '12'] },
      { step: 4, newly_infected: ['8', '9'] },
      { step: 5, newly_infected: ['10', '11'] }
    ]
  },
  optimized: {
    intervened_nodes: ['2', '5', '12'],
    ticks: [
      { step: 0, newly_infected: ['1'] },
      { step: 1, newly_infected: ['3'] }, // 2 intervened
      { step: 2, newly_infected: [] }, // 4 not reached from 2, 5 intervened
      { step: 3, newly_infected: ['7'] }, // 12 intervened
      { step: 4, newly_infected: ['9'] },
      { step: 5, newly_infected: ['11'] }
    ]
  }
};

export const fetchNetwork = async () => {
  try {
    const res = await axios.get('/api/network');
    // If Vite returns index.html or an empty object, force throw to use mock
    if (!res.data || !res.data.nodes) throw new Error('Invalid network data');
    
    // The backend uses "edges", but react-force-graph-2d expects "links"
    return { 
      nodes: res.data.nodes, 
      links: res.data.edges || res.data.links || []
    };
  } catch (err) {
    console.warn('Backend unavailable, using mock network data');
    return mockNetwork;
  }
};

export const runSimulation = async (sourceNode, budget) => {
  try {
    const res = await axios.post('/api/simulate', { sourceNode, budget });
    if (!res.data || !res.data.baseline) throw new Error('Invalid simulation data');
    return res.data;
  } catch (err) {
    console.warn('Backend unavailable, using mock simulation data');
    return mockSimulation;
  }
};
