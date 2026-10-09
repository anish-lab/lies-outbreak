import React from 'react';
import { Play, Loader2, Shield, Share2, Users } from 'lucide-react';

const Sidebar = ({ nodes, sourceNode, setSourceNode, budget, setBudget, onRun, isRunning }) => {
  return (
    <aside className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col z-20 shadow-2xl">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Share2 className="text-blue-400" size={24} />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Configuration</h2>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Users size={16} /> Patient Zero (Source)
            </label>
            <select 
              value={sourceNode} 
              onChange={e => setSourceNode(e.target.value)}
              disabled={isRunning}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-50 appearance-none"
            >
              {nodes.map(n => (
                <option key={n.id} value={n.id}>User #{n.id}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Shield size={16} /> Intervention Budget
              </label>
              <span className="bg-indigo-500/20 text-indigo-400 text-xs font-bold px-2 py-1 rounded-md">
                {budget} Accounts
              </span>
            </div>
            <input 
              type="range" 
              min="1" 
              max={Math.max(1, Math.floor(nodes.length / 2))} 
              value={budget} 
              onChange={e => setBudget(parseInt(e.target.value))}
              disabled={isRunning}
              className="w-full accent-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500">
              Maximum number of accounts the college can intervene with.
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-auto p-6 bg-gray-900/50 border-t border-gray-800">
        <button 
          onClick={onRun} 
          disabled={isRunning}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        >
          {isRunning ? (
            <><Loader2 className="animate-spin" size={20} /> Simulating...</>
          ) : (
            <><Play fill="currentColor" size={20} /> Run Simulation</>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
