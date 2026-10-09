import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import GraphCanvas from './components/GraphCanvas';
import Stepper from './components/Stepper';
import NodeDetailsPanel from './components/NodeDetailsPanel';
import TimelineControls from './components/TimelineControls';
import EventLog from './components/EventLog';
import { fetchNetwork, runSimulation } from './services/api';
import { Loader2, ArrowRight, ShieldCheck, Info, AlertTriangle, X } from 'lucide-react';

function App() {
  const [step, setStep] = useState(1);

  const [network, setNetwork] = useState({ nodes: [], links: [] });
  const [sourceNode, setSourceNode] = useState('');
  const [budget, setBudget] = useState(3);

  const [simData, setSimData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTick, setCurrentTick] = useState(0);
  const maxTicksRef = useRef(0);

  // Three colour maps: no intervention, degree baseline, knapsack optimized
  const [noneColors, setNoneColors] = useState({});
  const [degreeColors, setDegreeColors] = useState({});
  const [optimizedColors, setOptimizedColors] = useState({});

  const [noneInfectedCount, setNoneInfectedCount] = useState(0);
  const [degreeInfectedCount, setDegreeInfectedCount] = useState(0);
  const [optimizedInfectedCount, setOptimizedInfectedCount] = useState(0);

  const [selectedNode, setSelectedNode] = useState(null);

  // Error banner state
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchNetwork()
      .then(data => {
        setNetwork({
          nodes: data?.nodes || [],
          links: data?.links || [],
        });
        if (data?.nodes?.length > 0) {
          setSourceNode(data.nodes[0].id);
        }
        resetColors(data?.nodes || []);
      })
      .catch(err => {
        setErrorMsg(`Failed to load network: ${err?.response?.data?.detail || err.message}`);
      });
  }, []);

  const resetColors = (nodes) => {
    const defaultColors = {};
    nodes.forEach(n => { defaultColors[n.id] = '#3b82f6'; });
    setNoneColors({ ...defaultColors });
    setDegreeColors({ ...defaultColors });
    setOptimizedColors({ ...defaultColors });
    setNoneInfectedCount(0);
    setDegreeInfectedCount(0);
    setOptimizedInfectedCount(0);
  };

  const handleRunSimulation = async () => {
    setStep(3);
    setErrorMsg(null);
    resetColors(network.nodes);

    try {
      const data = await runSimulation(sourceNode, budget);
      setSimData(data);

      const maxNone = data?.none?.ticks?.length || 0;
      const maxDeg = data?.degree?.ticks?.length || 0;
      const maxOpt = data?.optimized?.ticks?.length || 0;
      maxTicksRef.current = Math.max(maxNone, maxDeg, maxOpt);

      // Pre-color intervened nodes for degree and knapsack panels
      const newDegColors = {};
      (data?.degree?.intervened_nodes || []).forEach(id => {
        newDegColors[id] = '#f59e0b'; // amber for degree-blocked
      });
      setDegreeColors(prev => ({ ...prev, ...newDegColors }));

      const newOptColors = {};
      (data?.optimized?.intervened_nodes || []).forEach(id => {
        newOptColors[id] = '#22c55e'; // green for knapsack-blocked
      });
      setOptimizedColors(prev => ({ ...prev, ...newOptColors }));

      setCurrentTick(0);
      setStep(4);
      setIsPlaying(true);
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message;
      setErrorMsg(`Simulation failed: ${detail}`);
      setStep(2); // go back to config
    }
  };

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

  useEffect(() => {
    applyTickState(currentTick);
  }, [currentTick, simData, network]);

  const applyTickState = (targetTick) => {
    if (!simData) return;

    const nColors = {};
    const dColors = {};
    const oColors = {};
    network.nodes.forEach(n => {
      nColors[n.id] = '#3b82f6';
      dColors[n.id] = '#3b82f6';
      oColors[n.id] = '#3b82f6';
    });

    // Pre-mark intervened nodes
    (simData.degree?.intervened_nodes || []).forEach(id => {
      dColors[id] = '#f59e0b';
    });
    (simData.optimized?.intervened_nodes || []).forEach(id => {
      oColors[id] = '#22c55e';
    });

    let nInfected = 0;
    let dInfected = 0;
    let oInfected = 0;
    for (let i = 0; i <= targetTick; i++) {
      // None (no intervention)
      if (i < (simData.none?.ticks?.length || 0)) {
        const tick = simData.none.ticks[i];
        (tick?.newly_infected || []).forEach(id => {
          nColors[id] = '#ef4444';
          nInfected++;
        });
      }

      // Degree baseline
      if (i < (simData.degree?.ticks?.length || 0)) {
        const tick = simData.degree.ticks[i];
        (tick?.newly_infected || []).forEach(id => {
          if (dColors[id] !== '#f59e0b') {
            dColors[id] = '#ef4444';
            dInfected++;
          }
        });
      }

      // Knapsack optimized
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

    setNoneColors(nColors);
    setDegreeColors(dColors);
    setOptimizedColors(oColors);
    setNoneInfectedCount(nInfected);
    setDegreeInfectedCount(dInfected);
    setOptimizedInfectedCount(oInfected);
  };

  const handleSeek = (newTick) => {
    setIsPlaying(false);
    setCurrentTick(newTick);
    applyTickState(newTick);
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-slate-200 font-sans selection:bg-blue-500/30">

      <header className="flex-none bg-black/90 border-b border-white/5 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl relative">
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
        <div className="px-8 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <ShieldCheck className="text-blue-400" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-tighter">
                OUTBREAK<span className="font-light opacity-50"> OF LIES</span>
              </h1>
              <p className="text-[10px] text-blue-400/70 mt-1 uppercase tracking-[0.3em] font-mono">MISINFORMATION PROPAGATION SIMULATOR</p>
            </div>
          </div>

          {(step >= 4) && (
            <div className="flex items-center gap-6">
              <Dashboard
                totalNodes={network?.nodes?.length || 0}
                baselineCount={noneInfectedCount}
                optimizedCount={optimizedInfectedCount}
                intervenedCount={simData?.optimized?.intervened_nodes?.length || 0}
                step={currentTick}
                showCompare={step === 5}
              />
              {step === 4 && (
                <button
                  onClick={() => setStep(5)}
                  className="ml-4 flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-6 py-3 rounded-lg font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all uppercase tracking-widest text-xs"
                >
                  Split View <ArrowRight size={16} />
                </button>
              )}
            </div>
          )}
        </div>
        <Stepper currentStep={step} />
      </header>

      {/* Error Banner */}
      {errorMsg && (
        <div className="flex-none bg-red-900/80 border-b border-red-500/40 backdrop-blur-xl px-8 py-3 flex items-center gap-3 z-30">
          <AlertTriangle className="text-red-400 shrink-0" size={18} />
          <p className="text-red-200 text-sm flex-1 font-mono">{errorMsg}</p>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-400 hover:text-red-200 transition-colors"
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden relative p-4 gap-4">

        {step === 1 && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="max-w-2xl w-full bg-black/60 border border-white/10 rounded-3xl p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden">
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px]"></div>
              <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px]"></div>

              <div className="relative z-10 text-center">
                <h2 className="text-4xl font-black text-white mb-4 tracking-tight">System Initialized</h2>
                <p className="text-gray-400 text-lg mb-10 font-light">
                  A social network topography has been loaded into memory. This graph represents individuals (nodes) and their communication channels (links).
                </p>

                <div className="grid grid-cols-2 gap-6 mb-12">
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                    <p className="text-xs text-blue-400 font-mono uppercase tracking-widest mb-2">Monitored Users</p>
                    <p className="text-5xl font-black text-white">{network.nodes.length}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                    <p className="text-xs text-purple-400 font-mono uppercase tracking-widest mb-2">Data Pathways</p>
                    <p className="text-5xl font-black text-white">{network.links.length}</p>
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 rounded-xl font-bold shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all uppercase tracking-widest text-sm"
                >
                  Configure Threat Parameters
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <>
            <Sidebar
              nodes={network?.nodes || []}
              sourceNode={sourceNode}
              setSourceNode={setSourceNode}
              budget={budget}
              setBudget={setBudget}
              onRun={handleRunSimulation}
              isRunning={false}
            />
            <div className="flex-1 relative">
               <div className="absolute top-6 left-6 z-10 max-w-sm bg-black/80 border border-blue-500/30 p-5 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                 <div className="flex items-start gap-3">
                   <Info className="text-blue-400 shrink-0 mt-1" size={20} />
                   <div>
                     <h3 className="font-bold text-white mb-2">Configuration Mode</h3>
                     <p className="text-sm text-gray-400 leading-relaxed">
                       Select the <strong className="text-red-400">Patient Zero</strong> (the user who starts spreading the lie) and set your <strong className="text-green-400">Intervention Budget</strong> (how many key accounts our system can protect via fact-checking).
                     </p>
                   </div>
                 </div>
               </div>
               <GraphCanvas network={network} colors={noneColors} />
               <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none opacity-40"></div>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="flex-1 flex flex-col items-center justify-center bg-black/40 rounded-2xl border border-white/5">
             <div className="relative">
               <div className="w-32 h-32 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
               <div className="w-32 h-32 border-4 border-purple-500/20 border-b-purple-500 rounded-full animate-spin absolute inset-0 animation-delay-500"></div>
             </div>
             <h2 className="text-2xl font-black text-white mt-8 tracking-widest uppercase">Calculating Trajectories</h2>
             <p className="text-blue-400/60 mt-3 font-mono text-sm">Simulating no-intervention vs. degree vs. knapsack...</p>
          </div>
        )}

        {step === 4 && (
          <div className="flex-1 relative w-full h-full flex">
            <div className="absolute top-6 left-6 z-10 bg-black/80 px-6 py-4 rounded-2xl border border-green-500/30 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-xl">
              <h2 className="font-black text-white text-xl tracking-tight">Active Defense Network</h2>
              <p className="text-sm text-gray-400 mt-1 font-light">High-Density Analytics 2D View. Crisp & readable.</p>
            </div>

            <GraphCanvas
              network={network}
              colors={optimizedColors}
              onNodeClick={node => setSelectedNode(node)}
              selectedNodeId={selectedNode?.id}
            />
            <EventLog 
              simData={simData} 
              currentTick={currentTick} 
              isOptimized={true} 
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
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
               <button
                  onClick={() => setStep(4)}
                  className="bg-black/80 hover:bg-white hover:text-black border border-white/20 text-white px-6 py-2 rounded-full text-xs font-bold transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] tracking-widest uppercase"
                >
                  Return to 3D Explorer
                </button>
            </div>

            <div className="flex-1 flex gap-4 w-full h-full">
              {/* Panel 1: No Intervention */}
              <div className="flex-1 relative rounded-2xl overflow-hidden border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                <div className="absolute top-6 left-6 z-10 bg-black/80 px-5 py-3 rounded-xl border border-red-500/30 backdrop-blur-xl">
                  <h2 className="font-black text-red-400 tracking-wide uppercase text-sm">Unprotected</h2>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">No Intervention</p>
                  <p className="text-[10px] text-red-400/70 mt-1 font-mono">reach: {simData?.none?.total_reach ?? '—'}</p>
                </div>
                <GraphCanvas network={network} colors={noneColors} />
              </div>

              {/* Panel 2: Degree Baseline */}
              <div className="flex-1 relative rounded-2xl overflow-hidden border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                <div className="absolute top-6 left-6 z-10 bg-black/80 px-5 py-3 rounded-xl border border-amber-500/30 backdrop-blur-xl">
                  <h2 className="font-black text-amber-400 tracking-wide uppercase text-sm">Degree Baseline</h2>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">Top-k Degree Heuristic</p>
                  <p className="text-[10px] text-amber-400/70 mt-1 font-mono">reach: {simData?.degree?.total_reach ?? '—'}</p>
                </div>
                <GraphCanvas network={network} colors={degreeColors} />
              </div>

              {/* Panel 3: Knapsack Optimized */}
              <div className="flex-1 relative rounded-2xl overflow-hidden border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                <div className="absolute top-6 right-6 z-10 bg-black/80 px-5 py-3 rounded-xl border border-green-500/30 backdrop-blur-xl text-right">
                  <h2 className="font-black text-green-400 tracking-wide uppercase text-sm">Knapsack Optimal</h2>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">Greedy Betweenness ROI</p>
                  <p className="text-[10px] text-green-400/70 mt-1 font-mono">reach: {simData?.optimized?.total_reach ?? '—'}</p>
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
