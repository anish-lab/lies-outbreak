import React from 'react';
import { Play, Loader2, Shield, Users, Activity } from 'lucide-react';

const Sidebar = ({ nodes, sourceNode, setSourceNode, budget, setBudget, onRun, isRunning }) => {
  return (
    <aside className="w-80 md:w-96 bg-black/90 border-r border-blue-500/20 flex flex-col h-full max-h-full z-20 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden shrink-0">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <Activity className="text-blue-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Threat Config</h2>
            <p className="text-[10px] text-blue-400 font-mono uppercase tracking-[0.2em]">Parametric Tuning</p>
          </div>
        </div>
        
        <div className="space-y-5">
          {/* Patient Zero Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-2 uppercase tracking-widest">
              <Users size={14} className="text-red-400" /> Patient Zero
            </label>
            <div className="relative">
              <select 
                value={sourceNode} 
                onChange={e => setSourceNode(e.target.value)}
                disabled={isRunning}
                className="w-full bg-black/90 border border-gray-700 hover:border-red-500/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all disabled:opacity-50 appearance-none text-white font-mono shadow-[inset_0_0_20px_rgba(0,0,0,1)] cursor-pointer"
              >
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>NODE ID: {n.id}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
            </div>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Origin point of the malicious payload (rumour).</p>
          </div>
          
          {/* Budget Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-2 uppercase tracking-widest">
                <Shield size={14} className="text-green-400" /> Defenses
              </label>
              <span className="bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                {budget} NODES
              </span>
            </div>
            <input 
              type="range" 
              min="1" 
              max={Math.max(1, Math.floor(nodes.length / 2))} 
              value={budget} 
              onChange={e => setBudget(parseInt(e.target.value))}
              disabled={isRunning}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500 disabled:opacity-50"
            />
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider leading-relaxed">
              Allocated bandwidth for fact-checking protocols.
            </p>
          </div>
        </div>
      </div>
      
      {/* Sticky Bottom Action Button */}
      <div className="p-4 bg-black/95 border-t border-white/10 shrink-0 sticky bottom-0 z-30">
        <button 
          onClick={onRun} 
          disabled={isRunning}
          className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-white via-gray-100 to-gray-200 hover:from-blue-500 hover:to-indigo-600 hover:text-white text-black font-black py-3.5 px-4 rounded-xl shadow-[0_0_25px_rgba(255,255,255,0.25)] transition-all active:scale-95 disabled:opacity-50 uppercase tracking-[0.2em] text-xs cursor-pointer"
        >
          {isRunning ? (
            <><Loader2 className="animate-spin text-blue-600" size={16} /> Executing...</>
          ) : (
            <><Play fill="currentColor" className="text-blue-600 group-hover:text-white" size={16} /> Execute Simulation</>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
