import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart3,
  TrendingDown,
  Award,
  ShieldCheck,
  Zap,
  Play,
  Loader2,
  RefreshCw,
  Info,
  CheckCircle2,
  Sliders,
  Sparkles, ArrowLeft
} from 'lucide-react';
import { runBenchmark, runSweep } from '../services/api';

const STRATEGY_COLORS = {
  knapsack: {
    hex: '#22c55e',
    fill: 'rgba(34, 197, 94, 0.8)',
    border: '#22c55e',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    name: 'Knapsack Optimal (ROI)',
  },
  betweenness: {
    hex: '#06b6d4',
    fill: 'rgba(6, 182, 212, 0.8)',
    border: '#06b6d4',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    name: 'Pure Betweenness',
  },
  degree: {
    hex: '#f59e0b',
    fill: 'rgba(245, 158, 11, 0.8)',
    border: '#f59e0b',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    name: 'Degree Centrality',
  },
  random: {
    hex: '#a855f7',
    fill: 'rgba(168, 85, 247, 0.8)',
    border: '#a855f7',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    name: 'Random Baseline',
  },
  none: {
    hex: '#f43f5e',
    fill: 'rgba(244, 63, 94, 0.8)',
    border: '#f43f5e',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    name: 'Unprotected (None)',
  },
};

export default function BenchmarkPanel({
  sourceNode,
  budget,
  dataset = 'snap',
  onError,
  onBack,
}) {
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [sweepData, setSweepData] = useState(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [isSweeping, setIsSweeping] = useState(false);
  const [runsCount, setRunsCount] = useState(100);
  const [hoveredStrat, setHoveredStrat] = useState(null);
  const [hoveredK, setHoveredK] = useState(null);
  // Guard: only auto-fetch once when sourceNode first becomes available
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (sourceNode && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      handleRunBenchmark();
      handleRunSweep();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceNode]);

  const handleRunBenchmark = async () => {
    if (!sourceNode) return;
    setIsBenchmarking(true);
    try {
      const data = await runBenchmark(sourceNode, budget, dataset, runsCount);
      setBenchmarkData(data);
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message;
      if (onError) onError(`Benchmark error: ${msg}`);
    } finally {
      setIsBenchmarking(false);
    }
  };

  const handleRunSweep = async () => {
    if (!sourceNode) return;
    setIsSweeping(true);
    try {
      const data = await runSweep(sourceNode, 1, 15, dataset, 20);
      setSweepData(data);
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message;
      if (onError) onError(`Budget sweep error: ${msg}`);
    } finally {
      setIsSweeping(false);
    }
  };

  const leaderboard = benchmarkData?.leaderboard || [];

  // SVG dimensions for Bar Chart
  const barChartWidth = 720;
  const barChartHeight = 280;
  const barMargin = { top: 30, right: 30, bottom: 50, left: 60 };
  const innerWidth = barChartWidth - barMargin.left - barMargin.right;
  const innerHeight = barChartHeight - barMargin.top - barMargin.bottom;

  const maxMean = benchmarkData
    ? Math.max(
        ...Object.values(benchmarkData.strategies).map(s => s.ci95_upper || s.mean_reach)
      ) * 1.15 || 100
    : 100;

  // SVG dimensions for Line Chart
  const lineChartWidth = 720;
  const lineChartHeight = 280;
  const lineMargin = { top: 30, right: 40, bottom: 45, left: 60 };
  const lineInnerW = lineChartWidth - lineMargin.left - lineMargin.right;
  const lineInnerH = lineChartHeight - lineMargin.top - lineMargin.bottom;

  const sweepPoints = sweepData?.points || [];
  const maxSweepReach = sweepPoints.length
    ? Math.max(
        ...sweepPoints.flatMap(p => Object.values(p.strategies))
      ) * 1.1 || 100
    : 100;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto w-full relative">
      {onBack && (
        <button onClick={onBack} className="absolute top-8 right-8 bg-black/80 hover:bg-white hover:text-black border border-white/20 text-white px-4 py-1.5 rounded-full text-[10px] font-bold transition-all shadow-[0_0_16px_rgba(0,0,0,0.5)] tracking-widest uppercase flex items-center gap-2 z-50">
          <ArrowLeft size={14} /> Go Back to Configuration
        </button>
      )}
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-blue-500/20 rounded-2xl p-6 shadow-[0_0_40px_rgba(30,58,138,0.2)] backdrop-blur-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 bg-blue-500/20 border border-blue-500/40 rounded-lg text-blue-400">
                <BarChart3 size={20} />
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Statistical Evidence & Monte Carlo Benchmark
              </h2>
            </div>
            <p className="text-gray-400 text-sm max-w-3xl leading-relaxed">
              Empirical multi-run evaluation (<strong className="text-blue-400">100 runs per strategy</strong> with shared stochastic seeds).
              Validates rumour containment significance with <strong>mean, standard deviation, and 95% Confidence Intervals</strong>, plus a budget sweep from <strong className="text-green-400">k = 1 to 15</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunBenchmark}
              disabled={isBenchmarking || !sourceNode}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(37,99,235,0.4)] disabled:opacity-50 transition-all cursor-pointer"
            >
              {isBenchmarking ? (
                <>
                  <Loader2 className="animate-spin text-white" size={16} />
                  Running 100 Runs...
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" />
                  Run Benchmark (100 Runs)
                </>
              )}
            </button>

            <button
              onClick={handleRunSweep}
              disabled={isSweeping || !sourceNode}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSweeping ? (
                <Loader2 className="animate-spin text-white" size={16} />
              ) : (
                <RefreshCw size={16} />
              )}
              Budget Sweep (k=1..15)
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Bar Chart with Error Bars & Budget Sweep Line Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requirement 6: Bar Chart with Error Bars */}
        <div className="bg-black/70 border border-white/10 rounded-2xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <BarChart3 className="text-blue-400" size={18} />
                Mean Infection Reach & 95% Confidence Interval
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Bar height = Mean Infected Reach. Error bars = ± 1.96 × SE (95% CI).
              </p>
            </div>
            {benchmarkData && (
              <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full font-bold">
                N = {benchmarkData.runs} runs/strat
              </span>
            )}
          </div>

          {isBenchmarking && !benchmarkData ? (
            <div className="h-64 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-blue-400 mb-3" size={32} />
              <p className="text-sm text-gray-400 font-mono">Running 100 Monte Carlo simulations per strategy...</p>
            </div>
          ) : leaderboard.length > 0 ? (
            <div className="relative overflow-x-auto">
              <svg viewBox={`0 0 ${barChartWidth} ${barChartHeight}`} className="w-full h-auto select-none">
                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                  const y = barMargin.top + innerHeight * (1 - ratio);
                  const val = Math.round(maxMean * ratio);
                  return (
                    <g key={idx}>
                      <line
                        x1={barMargin.left}
                        y1={y}
                        x2={barChartWidth - barMargin.right}
                        y2={y}
                        stroke="rgba(255,255,255,0.08)"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={barMargin.left - 10}
                        y={y + 4}
                        fill="#94a3b8"
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor="end"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Bars & Error Whiskers */}
                {leaderboard.map((item, idx) => {
                  const nBars = leaderboard.length;
                  const barSlot = innerWidth / nBars;
                  const barWidth = Math.min(60, barSlot * 0.65);
                  const x = barMargin.left + idx * barSlot + (barSlot - barWidth) / 2;

                  const barH = (item.mean_reach / maxMean) * innerHeight;
                  const y = barMargin.top + innerHeight - barH;

                  // Error bar positions
                  const yCiUpper = barMargin.top + innerHeight - (item.ci95_upper / maxMean) * innerHeight;
                  const yCiLower = barMargin.top + innerHeight - (item.ci95_lower / maxMean) * innerHeight;
                  const xCenter = x + barWidth / 2;
                  const whiskerCap = 12;

                  const colorInfo = STRATEGY_COLORS[item.strategy] || STRATEGY_COLORS.degree;
                  const isHovered = hoveredStrat === item.strategy;

                  return (
                    <g
                      key={item.strategy}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredStrat(item.strategy)}
                      onMouseLeave={() => setHoveredStrat(null)}
                      opacity={hoveredStrat && !isHovered ? 0.45 : 1}
                    >
                      {/* Bar rectangle */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barH}
                        rx={6}
                        fill={colorInfo.fill}
                        stroke={colorInfo.border}
                        strokeWidth={isHovered ? 2.5 : 1.5}
                        filter={isHovered ? 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' : undefined}
                      />

                      {/* Error bar vertical line */}
                      <line
                        x1={xCenter}
                        y1={yCiUpper}
                        x2={xCenter}
                        y2={yCiLower}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                      {/* Top whisker cap */}
                      <line
                        x1={xCenter - whiskerCap / 2}
                        y1={yCiUpper}
                        x2={xCenter + whiskerCap / 2}
                        y2={yCiUpper}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                      {/* Bottom whisker cap */}
                      <line
                        x1={xCenter - whiskerCap / 2}
                        y1={yCiLower}
                        x2={xCenter + whiskerCap / 2}
                        y2={yCiLower}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />

                      {/* Mean value label */}
                      <text
                        x={xCenter}
                        y={Math.min(yCiUpper - 8, y - 8)}
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {item.mean_reach}
                      </text>

                      {/* Error margin ± text */}
                      <text
                        x={xCenter}
                        y={y + barH / 2}
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                        opacity={0.8}
                      >
                        ±{item.ci95_margin}
                      </text>

                      {/* Strategy label on X axis */}
                      <text
                        x={xCenter}
                        y={barChartHeight - 16}
                        fill={colorInfo.hex}
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {item.strategy === 'knapsack' ? 'Knapsack (ROI)' : item.label.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 font-mono text-sm">
              Click "Run Benchmark" to execute 100 runs across all strategies.
            </div>
          )}
        </div>

        {/* Requirement 8: Budget Sweep (k = 1 to 15) Line Chart */}
        <div className="bg-black/70 border border-white/10 rounded-2xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <TrendingDown className="text-green-400" size={18} />
                Budget Sweep Trajectory (k = 1 to 15)
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Visualizing where each strategy's returns flatten (diminishing returns threshold).
              </p>
            </div>
            {sweepData?.flattening_budget && (
              <span className="text-[10px] font-mono bg-green-500/10 text-green-400 border border-green-500/30 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                <Sparkles, ArrowLeft size={12} /> Flattens at k = {sweepData.flattening_budget}
              </span>
            )}
          </div>

          {isSweeping && !sweepData ? (
            <div className="h-64 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-green-400 mb-3" size={32} />
              <p className="text-sm text-gray-400 font-mono">Sweeping budgets k=1 to 15 across 5 strategies...</p>
            </div>
          ) : sweepPoints.length > 0 ? (
            <div className="relative overflow-x-auto">
              <svg viewBox={`0 0 ${lineChartWidth} ${lineChartHeight}`} className="w-full h-auto select-none">
                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                  const y = lineMargin.top + lineInnerH * (1 - ratio);
                  const val = Math.round(maxSweepReach * ratio);
                  return (
                    <g key={idx}>
                      <line
                        x1={lineMargin.left}
                        y1={y}
                        x2={lineChartWidth - lineMargin.right}
                        y2={y}
                        stroke="rgba(255,255,255,0.08)"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={lineMargin.left - 10}
                        y={y + 4}
                        fill="#94a3b8"
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor="end"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical grid lines & X-axis ticks (k=1..15) */}
                {sweepPoints.map(p => {
                  const x = lineMargin.left + ((p.budget - 1) / 14) * lineInnerW;
                  return (
                    <g key={p.budget}>
                      <line
                        x1={x}
                        y1={lineMargin.top}
                        x2={x}
                        y2={lineMargin.top + lineInnerH}
                        stroke="rgba(255,255,255,0.04)"
                      />
                      <text
                        x={x}
                        y={lineChartHeight - 15}
                        fill={p.budget === sweepData?.flattening_budget ? '#22c55e' : '#64748b'}
                        fontSize="10"
                        fontWeight={p.budget === sweepData?.flattening_budget ? 'bold' : 'normal'}
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {p.budget}
                      </text>
                    </g>
                  );
                })}

                {/* Flattening threshold vertical dashed line */}
                {sweepData?.flattening_budget && (
                  (() => {
                    const k = sweepData.flattening_budget;
                    const xElbow = lineMargin.left + ((k - 1) / 14) * lineInnerW;
                    return (
                      <g>
                        <line
                          x1={xElbow}
                          y1={lineMargin.top}
                          x2={xElbow}
                          y2={lineMargin.top + lineInnerH}
                          stroke="#22c55e"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          opacity={0.8}
                        />
                        <rect
                          x={xElbow - 45}
                          y={lineMargin.top - 20}
                          width={90}
                          height={18}
                          rx={4}
                          fill="#14532d"
                          stroke="#22c55e"
                          strokeWidth={1}
                        />
                        <text
                          x={xElbow}
                          y={lineMargin.top - 8}
                          fill="#86efac"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          ELBOW (k={k})
                        </text>
                      </g>
                    );
                  })()
                )}

                {/* Draw Strategy Lines */}
                {['none', 'random', 'degree', 'betweenness', 'knapsack'].map(strat => {
                  const color = STRATEGY_COLORS[strat]?.hex || '#fff';
                  const isKnapsack = strat === 'knapsack';
                  const pathD = sweepPoints
                    .map((p, idx) => {
                      const val = p.strategies[strat] || 0;
                      const x = lineMargin.left + ((p.budget - 1) / 14) * lineInnerW;
                      const y = lineMargin.top + lineInnerH - (val / maxSweepReach) * lineInnerH;
                      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                    })
                    .join(' ');

                  return (
                    <g key={strat}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={color}
                        strokeWidth={isKnapsack ? 3.5 : 2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={hoveredStrat && hoveredStrat !== strat ? 0.25 : 1}
                      />
                      {/* Dots on points */}
                      {sweepPoints.map(p => {
                        const val = p.strategies[strat] || 0;
                        const x = lineMargin.left + ((p.budget - 1) / 14) * lineInnerW;
                        const y = lineMargin.top + lineInnerH - (val / maxSweepReach) * lineInnerH;
                        return (
                          <circle
                            key={p.budget}
                            cx={x}
                            cy={y}
                            r={isKnapsack ? 4.5 : 3}
                            fill={color}
                            stroke="#000"
                            strokeWidth={1.5}
                            className="cursor-pointer transition-all hover:scale-150"
                          />
                        );
                      })}
                    </g>
                  );
                })}
              </svg>

              {/* Line chart legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-3">
                {['knapsack', 'betweenness', 'degree', 'random', 'none'].map(strat => {
                  const c = STRATEGY_COLORS[strat];
                  return (
                    <div
                      key={strat}
                      className="flex items-center gap-2 cursor-pointer"
                      onMouseEnter={() => setHoveredStrat(strat)}
                      onMouseLeave={() => setHoveredStrat(null)}
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }}></span>
                      <span className="text-xs font-mono text-gray-300 font-bold">{c.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 font-mono text-sm">
              Click "Budget Sweep" to simulate k=1 to 15 curves.
            </div>
          )}
        </div>
      </div>

      {/* Requirement 7: Full 5-Row Statistical Leaderboard */}
      <div className="bg-black/70 border border-white/10 rounded-2xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400">
              <Award size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Intervention Strategy Performance Leaderboard
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Comparative ranking across 100 stochastic evaluations. Lower reach indicates superior containment.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <span>Evaluated on: <strong className="text-white">{dataset.toUpperCase()}</strong> network</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Strategy</th>
                <th className="py-3 px-4 text-center">Blocked Accounts</th>
                <th className="py-3 px-4 text-right">Mean Reach</th>
                <th className="py-3 px-4 text-right">95% Conf. Interval</th>
                <th className="py-3 px-4 text-right">Std Dev (σ)</th>
                <th className="py-3 px-4 text-right">Threat Reduction</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {leaderboard.map((item, idx) => {
                const color = STRATEGY_COLORS[item.strategy] || STRATEGY_COLORS.degree;
                const isKnapsack = item.strategy === 'knapsack';
                const rankLabels = ['#1 Champion', '#2 Contender', '#3 Baseline', '#4 Control', '#5 Baseline'];

                return (
                  <tr
                    key={item.strategy}
                    className={`transition-colors hover:bg-white/5 ${
                      isKnapsack ? 'bg-green-500/5' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs font-mono border ${
                            idx === 0
                              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                              : idx === 1
                              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                              : idx === 2
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-white/5 text-gray-400 border-white/10'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        {idx === 0 && (
                          <span className="text-[10px] uppercase font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/30">
                            BEST
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Strategy Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color.hex }}></span>
                        <div>
                          <p className="font-bold text-white text-sm">{color.name}</p>
                          <p className="text-[11px] text-gray-400 font-mono">
                            {item.strategy === 'knapsack'
                              ? 'Iterative greedy knapsack on betweenness ROI'
                              : item.strategy === 'betweenness'
                              ? 'Static top-k betweenness centrality'
                              : item.strategy === 'degree'
                              ? 'Top-k highest degree heuristics'
                              : item.strategy === 'random'
                              ? 'Uniform random candidate selection'
                              : 'Zero defense fact-checking applied'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Blocked Accounts */}
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1 rounded-lg font-mono text-xs text-gray-300">
                        <ShieldCheck size={13} className={color.text} />
                        <span>{item.intervened_nodes.length} nodes</span>
                      </div>
                    </td>

                    {/* Mean Reach */}
                    <td className="py-4 px-4 text-right font-mono">
                      <span className="text-base font-black text-white">{item.mean_reach}</span>
                      <span className="text-xs text-gray-500 ml-1">users</span>
                    </td>

                    {/* 95% Confidence Interval */}
                    <td className="py-4 px-4 text-right font-mono text-xs">
                      <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-gray-300">
                        [{item.ci95_lower} – {item.ci95_upper}] <strong className="text-blue-400 font-bold">(±{item.ci95_margin})</strong>
                      </span>
                    </td>

                    {/* Std Dev */}
                    <td className="py-4 px-4 text-right font-mono text-xs text-gray-400">
                      σ = {item.std_dev}
                    </td>

                    {/* Threat Reduction % */}
                    <td className="py-4 px-4 text-right font-mono">
                      <span
                        className={`font-black text-sm ${
                          item.reduction_pct > 30
                            ? 'text-green-400'
                            : item.reduction_pct > 0
                            ? 'text-amber-400'
                            : 'text-gray-500'
                        }`}
                      >
                        {item.reduction_pct > 0 ? `-${item.reduction_pct}%` : '0%'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                          idx === 0
                            ? 'bg-green-500/10 text-green-400 border-green-500/30'
                            : item.reduction_pct > 0
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {idx === 0 ? 'Optimal' : item.reduction_pct > 0 ? 'Mitigated' : 'Vulnerable'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
