import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import GraphCanvas from './components/GraphCanvas';
import { fetchNetwork, runSimulation } from './services/api';

function App() {
  const [network, setNetwork] = useState({ nodes: [], links: [] });
  const [sourceNode, setSourceNode] = useState('');
  const [budget, setBudget] = useState(3);
  
  const [simData, setSimData] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const maxStepsRef = useRef(0);
  
  // Dictionaries mapping nodeId -> color
  const [baselineColors, setBaselineColors] = useState({});
  const [optimizedColors, setOptimizedColors] = useState({});
  
  // Dictionaries tracking cumulative infected sets for stats
  const [baselineInfectedCount, setBaselineInfectedCount] = useState(0);
  const [optimizedInfectedCount, setOptimizedInfectedCount] = useState(0);

  useEffect(() => {
    fetchNetwork().then(data => {
      setNetwork({
        nodes: data?.nodes || [],
        links: data?.links || []
      });
      if (data?.nodes?.length > 0) {
        setSourceNode(data.nodes[0].id);
      }
      resetColors(data?.nodes || []);
    });
  }, []);

  const resetColors = (nodes) => {
    const defaultColors = {};
    nodes.forEach(n => {
      defaultColors[n.id] = '#3b82f6'; // Blue = Safe
    });
    setBaselineColors({ ...defaultColors });
    setOptimizedColors({ ...defaultColors });
    setBaselineInfectedCount(0);
    setOptimizedInfectedCount(0);
    setCurrentStep(0);
    setSimData(null);
  };

  const handleRun = async () => {
    resetColors(network.nodes);
    setIsRunning(true);
    
    const data = await runSimulation(sourceNode, budget);
    setSimData(data);
    
    const maxB = data?.baseline?.ticks?.length || 0;
    const maxO = data?.optimized?.ticks?.length || 0;
    maxStepsRef.current = Math.max(maxB, maxO);
    
    // Set initially intervened nodes (Green)
    const newOptColors = {};
    (data?.optimized?.intervened_nodes || []).forEach(id => {
      newOptColors[id] = '#22c55e'; // Green = Intervened
    });
    setOptimizedColors(prev => ({ ...prev, ...newOptColors }));
    
    setCurrentStep(0);
  };
  
  useEffect(() => {
    let intervalId;
    
    if (isRunning && simData && currentStep < maxStepsRef.current) {
      intervalId = setInterval(() => {
        const step = currentStep;
        
        // Update Baseline
        if (step < (simData?.baseline?.ticks?.length || 0)) {
          const tick = simData.baseline.ticks[step];
          const newColors = {};
          (tick?.newly_infected || []).forEach(id => {
            newColors[id] = '#ef4444'; // Red = Infected
          });
          setBaselineColors(prev => ({ ...prev, ...newColors }));
          setBaselineInfectedCount(prev => prev + (tick?.newly_infected?.length || 0));
        }
        
        // Update Optimized
        if (step < (simData?.optimized?.ticks?.length || 0)) {
          const tick = simData.optimized.ticks[step];
          const newColors = {};
          
          setOptimizedColors(prev => {
            const next = { ...prev };
            (tick?.newly_infected || []).forEach(id => {
              if (next[id] !== '#22c55e') {
                next[id] = '#ef4444'; // Only infect if not intervened
              }
            });
            return next;
          });
          
          // Count only those that actually get infected
          let actualNewInfections = 0;
          setOptimizedColors(prev => {
             (tick?.newly_infected || []).forEach(id => {
               if (prev[id] !== '#22c55e') {
                  actualNewInfections++;
               }
             });
             return prev;
          });
          setOptimizedInfectedCount(prev => prev + actualNewInfections);
        }
        
        setCurrentStep(prev => prev + 1);
      }, 800); // 800ms per tick
    } else if (currentStep >= maxStepsRef.current) {
      setIsRunning(false);
    }
    
    return () => clearInterval(intervalId);
  }, [isRunning, simData, currentStep]);

  return (
    <div className="flex h-screen bg-gray-950 text-slate-200">
      <Sidebar 
        nodes={network?.nodes || []}
        sourceNode={sourceNode}
        setSourceNode={setSourceNode}
        budget={budget}
        setBudget={setBudget}
        onRun={handleRun}
        isRunning={isRunning}
      />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-md z-10">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              Outbreak of Lies
            </h1>
            <p className="text-sm text-gray-400 mt-1">Rumour Propagation & Intervention Simulation</p>
          </div>
          
          <Dashboard 
            totalNodes={network?.nodes?.length || 0}
            baselineCount={baselineInfectedCount}
            optimizedCount={optimizedInfectedCount}
            intervenedCount={simData?.optimized?.intervened_nodes?.length || 0}
            step={currentStep}
          />
        </header>

        <div className="flex-1 flex flex-row w-full h-full">
          {/* Baseline View */}
          <div className="flex-1 border-r border-gray-800 relative min-w-0">
            <div className="absolute top-4 left-4 z-10 bg-gray-900/80 px-4 py-2 rounded-lg border border-gray-700 shadow-xl backdrop-blur-sm">
              <h2 className="font-semibold text-gray-200">Baseline Spread</h2>
              <p className="text-xs text-gray-400">No Intervention</p>
            </div>
            <GraphCanvas network={JSON.parse(JSON.stringify(network))} colors={baselineColors} />
          </div>
          
          {/* Optimized View */}
          <div className="flex-1 relative min-w-0">
            <div className="absolute top-4 right-4 z-10 bg-gray-900/80 px-4 py-2 rounded-lg border border-gray-700 shadow-xl backdrop-blur-sm text-right">
              <h2 className="font-semibold text-gray-200">Optimized Strategy</h2>
              <p className="text-xs text-gray-400">Fact-Checking & Blocking</p>
            </div>
            <GraphCanvas network={JSON.parse(JSON.stringify(network))} colors={optimizedColors} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
