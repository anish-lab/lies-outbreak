import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import GraphCanvas from './components/GraphCanvas';
import Stepper from './components/Stepper';
import NodeDetailsPanel from './components/NodeDetailsPanel';
import TimelineControls from './components/TimelineControls';
import EventLog from './components/EventLog';
import BenchmarkPanel from './components/BenchmarkPanel';
import { fetchNetwork, runSimulation } from './services/api';
import { Loader2, ArrowLeft, ArrowRight, ShieldCheck, Info, AlertTriangle, X, BarChart3, Activity, Play } from 'lucide-react';

function App() {
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState('sim'); // 'sim' | 'benchmark'

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
    fetchNetwork('snap')
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
      const data = await runSimulation(sourceNode, budget, 'snap');
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
    <div className="flex flex-col h-screen bg-[#050505] text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden">

      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <header className="flex-none bg-black/90 border-b border-white/5 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl relative">
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        {/* Slim top row */}
        <div className="px-6 py-3 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <ShieldCheck className="text-blue-400" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-tighter leading-none">
                OUTBREAK <span className="font-light opacity-50">OF LIES</span>
              </h1>
              <p className="text-[8px] text-blue-400/60 uppercase tracking-[0.25em] font-mono leading-none mt-0.5">Misinformation Propagation Simulator</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-black/60 border border-white/10 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setActiveTab('sim')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'sim'
                  ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ShieldCheck size={12} />
              Simulation View
            </button>
            <button
              onClick={() => setActiveTab('benchmark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'benchmark'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BarChart3 size={12} />
              Benchmark (100 Runs) &amp; Sweep
            </button>
          </div>

          {/* Dashboard stats — only in sim mode steps 4+ */}
          {(step >= 4 && activeTab === 'sim') && (
            <div className="flex items-center gap-2 ml-auto">
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
                  className="flex items-center gap-1.5 bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg font-bold shadow-[0_0_16px_rgba(255,255,255,0.2)] transition-all uppercase tracking-widest text-[10px] shrink-0"
                >
                  Split View <ArrowRight size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Slim stepper — sim mode only */}
        {activeTab === 'sim' && <Stepper currentStep={step} />}
      </header>

      {/* ─── ERROR BANNER ──────────────────────────────────────────── */}
      {errorMsg && (
        <div className="flex-none bg-red-900/80 border-b border-red-500/40 backdrop-blur-xl px-6 py-2 flex items-center gap-3 z-30">
          <AlertTriangle className="text-red-400 shrink-0" size={16} />
          <p className="text-red-200 text-sm flex-1 font-mono">{errorMsg}</p>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-400 hover:text-red-200 transition-colors"
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── MAIN CONTENT ──────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 flex overflow-hidden relative">

        {/* ── BENCHMARK TAB ── */}
        {activeTab === 'benchmark' && (
          <BenchmarkPanel
            sourceNode={sourceNode}
            budget={budget}
            dataset="snap"
            onError={setErrorMsg}
              onBack={() => { setActiveTab('sim'); setStep(2); }}
          />
        )}

        {/* ── STEP 1: System Initialized ── */}
        {activeTab === 'sim' && step === 1 && (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-lg bg-black/60 border border-white/10 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-[80px]" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-[80px]" />

              <div className="relative z-10 text-center">
                <h2 className="text-3xl font-black text-white mb-3 tracking-tight">System Initialized</h2>
                <p className="text-gray-400 mb-6 font-light text-sm leading-relaxed">
                  A social network topography has been loaded into memory. This graph represents individuals (nodes) and their communication channels (links).
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                    <p className="text-[10px] text-blue-400 font-mono uppercase tracking-widest mb-1">Monitored Users</p>
                    <p className="text-4xl font-black text-white">{network.nodes.length}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                    <p className="text-[10px] text-purple-400 font-mono uppercase tracking-widest mb-1">Data Pathways</p>
                    <p className="text-4xl font-black text-white">{network.links.length}</p>
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-xl font-bold shadow-[0_0_24px_rgba(37,99,235,0.4)] transition-all uppercase tracking-widest text-sm"
                >
                  Configure Threat Parameters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Set Parameters ── */}
        {activeTab === 'sim' && step === 2 && (
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
            <div className="flex-1 relative min-h-0 h-full">
               <div className="absolute top-4 left-4 z-10 max-w-xs bg-black/85 border border-blue-500/30 p-4 rounded-xl shadow-[0_0_24px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                 <div className="flex items-start gap-2.5">
                   <Info className="text-blue-400 shrink-0 mt-0.5" size={16} />
                   <div>
                     <h3 className="font-bold text-white mb-1.5 text-sm">Configuration Mode</h3>
                     <p className="text-xs text-gray-400 leading-relaxed">
                       Select the <strong className="text-red-400">Patient Zero</strong> and set your <strong className="text-green-400">Intervention Budget</strong> (key accounts to protect via fact-checking).
                     </p>
                     <button
                       onClick={handleRunSimulation}
                       className="mt-3 w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2 px-3 rounded-lg shadow-[0_0_16px_rgba(37,99,235,0.4)] text-[10px] uppercase tracking-wider transition-all cursor-pointer active:scale-95"
                     >
                       <Play size={12} fill="currentColor" /> Run Simulation Now
                     </button>
                   </div>
                 </div>
               </div>
               <GraphCanvas network={network} colors={noneColors} staticMode={true} />
               <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none opacity-40" />
            </div>
          </>
        )}

        {/* ── STEP 3: Computing ── */}
        {activeTab === 'sim' && step === 3 && (
          <div className="flex-1 flex flex-col items-center justify-center bg-black/40 rounded-2xl border border-white/5">
             <div className="relative">
               <div className="w-28 h-28 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
               <div className="w-28 h-28 border-4 border-purple-500/20 border-b-purple-500 rounded-full animate-spin absolute inset-0 animation-delay-500" />
             </div>
             <h2 className="text-xl font-black text-white mt-6 tracking-widest uppercase">Calculating Trajectories</h2>
             <p className="text-blue-400/60 mt-2 font-mono text-xs">Simulating no-intervention vs. degree vs. knapsack...</p>
          </div>
        )}

        {/* ── STEP 4: Active Defense — graph takes full remaining height ── */}
        {activeTab === 'sim' && step === 4 && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Graph area — grows to fill */}
            <div className="flex-1 relative min-h-0 flex">
              <div className="absolute top-4 left-4 z-10 bg-black/80 px-4 py-3 rounded-xl border border-green-500/30 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                <h2 className="font-black text-white text-base tracking-tight">Active Defense Network</h2>
                <p className="text-xs text-gray-400 mt-0.5 font-light">High-Density Analytics 2D View. Crisp &amp; readable.</p>
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
            </div>

            {/* Docked scrubber bar — below graph, never overlaps */}
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

        {/* ── STEP 5: Split View — graph takes full remaining height ── */}
        {activeTab === 'sim' && step === 5 && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Back button row */}
            <div className="flex-none flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/40">
              <button
                onClick={() => { setActiveTab('sim'); setStep(2); }}
                className="bg-black/80 hover:bg-white hover:text-black border border-white/20 text-white px-4 py-1.5 rounded-full text-[10px] font-bold transition-all shadow-[0_0_16px_rgba(0,0,0,0.5)] tracking-widest uppercase"
              >
                ← Return to 3D Explorer
              </button>
              <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Comparative Analysis — Tick {currentTick}</span>
            </div>

            {/* Three graph panels */}
            <div className="flex-1 flex gap-3 min-h-0 p-3">
              {/* Panel 1: No Intervention */}
              <div className="flex-1 relative rounded-xl overflow-hidden border border-red-500/20 shadow-[0_0_24px_rgba(239,68,68,0.08)] min-h-0">
                <div className="absolute top-3 left-3 z-10 bg-black/80 px-3 py-2 rounded-lg border border-red-500/30 backdrop-blur-xl">
                  <h2 className="font-black text-red-400 tracking-wide uppercase text-xs">Unprotected</h2>
                  <p className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-widest">No Intervention</p>
                  <p className="text-[9px] text-red-400/70 mt-0.5 font-mono">reach: {simData?.none?.total_reach ?? '—'}</p>
                </div>
                <GraphCanvas network={network} colors={noneColors} staticMode={true} />
              </div>

              {/* Panel 2: Degree Baseline */}
              <div className="flex-1 relative rounded-xl overflow-hidden border border-amber-500/20 shadow-[0_0_24px_rgba(245,158,11,0.08)] min-h-0">
                <div className="absolute top-3 left-3 z-10 bg-black/80 px-3 py-2 rounded-lg border border-amber-500/30 backdrop-blur-xl">
                  <h2 className="font-black text-amber-400 tracking-wide uppercase text-xs">Degree Baseline</h2>
                  <p className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-widest">Top-k Degree Heuristic</p>
                  <p className="text-[9px] text-amber-400/70 mt-0.5 font-mono">reach: {simData?.degree?.total_reach ?? '—'}</p>
                </div>
                <GraphCanvas network={network} colors={degreeColors} staticMode={true} />
              </div>

              {/* Panel 3: Knapsack Optimized */}
              <div className="flex-1 relative rounded-xl overflow-hidden border border-green-500/20 shadow-[0_0_24px_rgba(34,197,94,0.08)] min-h-0">
                <div className="absolute top-3 right-3 z-10 bg-black/80 px-3 py-2 rounded-lg border border-green-500/30 backdrop-blur-xl text-right">
                  <h2 className="font-black text-green-400 tracking-wide uppercase text-xs">Knapsack Optimal</h2>
                  <p className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-widest">Greedy Betweenness ROI</p>
                  <p className="text-[9px] text-green-400/70 mt-0.5 font-mono">reach: {simData?.optimized?.total_reach ?? '—'}</p>
                </div>
                <GraphCanvas network={network} colors={optimizedColors} staticMode={true} />
              </div>
            </div>

            {/* Docked scrubber bar — below all 3 panels, never overlaps */}
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
