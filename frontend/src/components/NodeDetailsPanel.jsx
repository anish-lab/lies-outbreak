import React from 'react';
import { X, Activity, Shield, AlertTriangle, Cpu } from 'lucide-react';

const NodeDetailsPanel = ({ node, network, color, onClose }) => {
  if (!node) return null;

  const degree = network.links.filter(l => {
    const sId = typeof l.source === 'object' ? l.source.id : l.source;
    const tId = typeof l.target === 'object' ? l.target.id : l.target;
    return sId === node.id || tId === node.id;
  }).length;

  let stateLabel = 'Secure (Safe)';
  let stateColor = 'text-blue-400';
  let glowColor = 'shadow-[0_0_20px_rgba(59,130,246,0.3)]';
  let StateIcon = Activity;

  if (color === '#ef4444') {
    stateLabel = 'Compromised (Infected)';
    stateColor = 'text-red-500';
    glowColor = 'shadow-[0_0_30px_rgba(239,68,68,0.4)]';
    StateIcon = AlertTriangle;
  } else if (color === '#22c55e') {
    stateLabel = 'Hardened (Intervened)';
    stateColor = 'text-green-400';
    glowColor = 'shadow-[0_0_30px_rgba(34,197,94,0.3)]';
    StateIcon = Shield;
  }

  return (
    <div className={`absolute top-6 right-6 w-80 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl z-20 overflow-hidden transform transition-all ${glowColor}`}>
      <div className="relative h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      
      <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
        <div className="flex items-center gap-2">
          <Cpu className="text-gray-400" size={16} />
          <h3 className="font-black text-white text-lg tracking-wide uppercase">
            NODE <span className="text-blue-400">#{node.id}</span>
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
        >
          <X size={16} />
        </button>
      </div>
      
      <div className="p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl bg-black border border-white/10 ${stateColor} shadow-inner`}>
            <StateIcon size={24} />
          </div>
          <div>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em] mb-1">Current Status</p>
            <p className={`font-black text-sm uppercase tracking-wider ${stateColor}`}>{stateLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="bg-black/50 p-4 rounded-xl border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/5 translate-y-full group-hover:translate-y-0 transition-transform"></div>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.1em] mb-1">Bandwidth</p>
            <p className="text-2xl font-black text-white font-mono">{degree}</p>
          </div>
          <div className="bg-black/50 p-4 rounded-xl border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-purple-500/5 translate-y-full group-hover:translate-y-0 transition-transform"></div>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.1em] mb-1">Influence</p>
            <p className="text-2xl font-black text-white font-mono">{(degree * 1.5).toFixed(1)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeDetailsPanel;
