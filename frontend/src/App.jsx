import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import GraphCanvas from './components/GraphCanvas';
import Stepper from './components/Stepper';
import NodeDetailsPanel from './components/NodeDetailsPanel';
import TimelineControls from './components/TimelineControls';
import { fetchNetwork, runSimulation } from './services/api';
import { Loader2, ArrowRight } from 'lucide-react';

function App() {
  const [step, setStep] = useState(1); // 1: Load, 2: Config, 3: Simulating, 4: Explore, 5: Compare
  
  const [network, setNetwork] = useState({ nodes: [], links: [] });
  const [sourceNode, setSourceNode] = useState('');
  const [budget, setBudget] = useState(3);
  
  const [simData, setSimData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTick, setCurrentTick] = useState(0);
  const maxTicksRef = useRef(0);
  
  const [baselineColors, setBaselineColors] = useState({});
  const [optimizedColors, setOptimizedColors] = useState({});
  const [baselineInfectedCount, setBaselineInfectedCount] = useState(0);
  const [optimizedInfectedCount, setOptimizedInfectedCount] = useState(0);
  
  const [selectedNode, setSelectedNode] = useState(null);

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
    nodes.forEach(n => { defaultColors[n.id] = '#3b82f6'; });
    setBaselineColors({ ...defaultColors });
    setOptimizedColors({ ...defaultColors });
    setBaselineInfectedCount(0);
    setOptimizedInfectedCount(0);
  };

  const handleRunSimulation = async () => {
    setStep(3); // Loading state
    resetColors(network.nodes);
    
    const data = await runSimulation(sourceNode, budget);
    setSimData(data);
    
    const maxB = data?.baseline?.ticks?.length || 0;
    const maxO = data?.optimized?.ticks?.length || 0;
    maxTicksRef.current = Math.max(maxB, maxO);
    
    // Initial intervened nodes
    const newOptColors = {};
    (data?.optimized?.intervened_nodes || []).forEach(id => {
      newOptColors[id] = '#22c55e';
    });
    setOptimizedColors(prev => ({ ...prev, ...newOptColors }));
    
    setCurrentTick(0);
    setStep(4); // Move to Explore
    setIsPlaying(true); // Auto-play
  };
  
  // Timeline Animation Effect
  useEffect(() => {
    let intervalId;
    if (isPlaying && step >= 4 && currentTick < maxTicksRef.current) {
      intervalId = setInterval(() => {
        applyTickState(currentTick + 1);
        setCurrentTick(prev => prev + 1);
      }, 800);
    } else if (currentTick >= maxTicksRef.current) {
      setIsPlaying(false);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, step, currentTick, simData]);

  // Apply state up to a specific tick
  const applyTickState = (targetTick) => {
    if (!simData) return;
    
    // Recompute colors and counts from tick 0 to targetTick
    const bColors = {};
    const oColors = {};
    network.nodes.forEach(n => {
      bColors[n.id] = '#3b82f6';
      oColors[n.id] = '#3b82f6';
    });
    
    (simData.optimized?.intervened_nodes || []).forEach(id => {
      oColors[id] = '#22c55e';
    });
    
    let bInfected = 0;
    let oInfected = 0;
    
    for (let i = 0; i < targetTick; i++) {
      if (i < (simData.baseline?.ticks?.length || 0)) {
        const tick = simData.baseline.ticks[i];
        (tick?.newly_infected || []).forEach(id => {
          bColors[id] = '#ef4444';
          bInfected++;
        });
      }
      
      if (i < (simData.optimized?.ticks?.length || 0)) {
        const tick = simData.optimized.ticks[i];
        (tick?.newly_infected || []).forEach(id => {
          if (oColors[id] !== '#22c55e') {
            oColors[id] = '#ef4444';
            oInfected++;
          }
        });
      }
    }
    
    setBaselineColors(bColors);
    setOptimizedColors(oColors);
    setBaselineInfectedCount(bInfected);
    setOptimizedInfectedCount(oInfected);
  };

  const handleSeek = (newTick) => {
    setIsPlaying(false);
    setCurrentTick(newTick);
    applyTickState(newTick);
  };
  
  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-slate-200 font-sans">
      
      {/* Header & Stepper */}
      <header className="flex-none bg-gray-900 border-b border-gray-800 z-10">
        <div className="px-6 py-4 flex justify-between items-center bg-gray-900/50 backdrop-blur-md">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent tracking-tight">
              Outbreak of Lies
            </h1>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold">Rumour Propagation Sim</p>
          </div>
          
          {(step >= 4) && (
            <div className="flex items-center gap-4">
              <Dashboard 
                totalNodes={network?.nodes?.length || 0}
                baselineCount={baselineInfectedCount}
                optimizedCount={optimizedInfectedCount}
                intervenedCount={simData?.optimized?.intervened_nodes?.length || 0}
                step={currentTick}
                showCompare={step === 5}
              />
              {step === 4 && (
                <button 
                  onClick={() => setStep(5)}
                  className="ml-4 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-900/40 transition-all"
                >
                  Compare Strategies <ArrowRight size={18} />
                </button>
              )}
            </div>
          )}
        </div>
        <Stepper currentStep={step} />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {step === 1 && (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl text-center">
              <h2 className="text-3xl font-bold mb-4">Network Loaded</h2>
              <div className="flex justify-center gap-8 mb-8">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Users</p>
                  <p className="text-4xl font-black text-blue-400">{network.nodes.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Connections</p>
                  <p className="text-4xl font-black text-indigo-400">{network.links.length}</p>
                </div>
              </div>
              <button 
                onClick={() => setStep(2)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold shadow-lg transition-all"
              >
                Proceed to Configuration
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex">
            <Sidebar 
              nodes={network?.nodes || []}
              sourceNode={sourceNode}
              setSourceNode={setSourceNode}
              budget={budget}
              setBudget={setBudget}
              onRun={handleRunSimulation}
              isRunning={false}
            />
            <div className="flex-1 relative bg-gray-950">
               {/* Show static graph preview during config */}
               <GraphCanvas network={network} colors={baselineColors} />
               <div className="absolute inset-0 bg-gray-950/40 pointer-events-none"></div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-950">
             <Loader2 size={48} className="animate-spin text-blue-500 mb-6" />
             <h2 className="text-2xl font-bold text-gray-300">Simulating Propagation...</h2>
             <p className="text-gray-500 mt-2">Computing baseline and optimized strategies</p>
          </div>
        )}

        {step === 4 && (
          <div className="flex-1 relative w-full h-full">
            <div className="absolute top-4 left-4 z-10 bg-gray-900/90 px-5 py-3 rounded-xl border border-gray-700 shadow-xl backdrop-blur-md">
              <h2 className="font-bold text-gray-100 text-lg">Optimized Intervention</h2>
              <p className="text-sm text-gray-400">Showing the network with active fact-checking</p>
            </div>
            
            <GraphCanvas 
              network={network} 
              colors={optimizedColors} 
              onNodeClick={handleNodeClick}
              selectedNodeId={selectedNode?.id}
            />
            
            <NodeDetailsPanel 
              node={selectedNode}
              network={network}
              color={selectedNode ? optimizedColors[selectedNode.id] : null}
              onClose={() => setSelectedNode(null)}
            />
            
            <TimelineControls 
              currentStep={currentTick}
              maxSteps={maxTicksRef.current}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onReset={() => handleSeek(0)}
              onSeek={handleSeek}
            />
          </div>
        )}

        {step === 5 && (
          <div className="flex-1 flex flex-col relative w-full h-full">
            <div className="absolute top-4 right-4 z-20">
               <button 
                  onClick={() => setStep(4)}
                  className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Back to Single View
                </button>
            </div>

            <div className="flex-1 flex flex-row w-full h-full">
              <div className="flex-1 border-r border-gray-800 relative min-w-0">
                <div className="absolute top-4 left-4 z-10 bg-gray-900/90 px-4 py-2 rounded-xl border border-gray-700 shadow-xl backdrop-blur-sm">
                  <h2 className="font-bold text-red-400">Baseline Spread</h2>
                  <p className="text-xs text-gray-400">No Intervention</p>
                </div>
                <GraphCanvas network={network} colors={baselineColors} />
              </div>
              
              <div className="flex-1 relative min-w-0">
                <div className="absolute top-4 left-4 z-10 bg-gray-900/90 px-4 py-2 rounded-xl border border-gray-700 shadow-xl backdrop-blur-sm">
                  <h2 className="font-bold text-green-400">Optimized Strategy</h2>
                  <p className="text-xs text-gray-400">Fact-Checking Active</p>
                </div>
                <GraphCanvas network={network} colors={optimizedColors} />
              </div>
            </div>
            
            <TimelineControls 
              currentStep={currentTick}
              maxSteps={maxTicksRef.current}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onReset={() => handleSeek(0)}
              onSeek={handleSeek}
            />
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
