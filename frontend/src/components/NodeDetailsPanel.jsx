import React from 'react';
import { X, Activity, Shield, AlertTriangle } from 'lucide-react';

const NodeDetailsPanel = ({ node, network, color, onClose }) => {
  if (!node) return null;

  // Calculate degree (number of connections)
  const degree = network.links.filter(l => l.source.id === node.id || l.target.id === node.id || l.source === node.id || l.target === node.id).length;

  let stateLabel = 'Safe';
  let stateColor = 'text-blue-400';
  let StateIcon = Activity;

  if (color === '#ef4444') {
    stateLabel = 'Infected';
    stateColor = 'text-red-400';
    StateIcon = AlertTriangle;
  } else if (color === '#22c55e') {
    stateLabel = 'Intervened';
    stateColor = 'text-green-400';
    StateIcon = Shield;
  }

  return (
    <div className="absolute top-4 right-4 w-72 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl z-20 overflow-hidden transform transition-all">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
        <h3 className="font-bold text-gray-100 flex items-center gap-2">
          User #{node.id}
        </h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-gray-700"
        >
          <X size={16} />
        </button>
      </div>
      
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-gray-800/80 ${stateColor}`}>
            <StateIcon size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Current State</p>
            <p className={`font-semibold ${stateColor}`}>{stateLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
            <p className="text-xs text-gray-500 mb-1">Connections</p>
            <p className="text-xl font-bold text-gray-200">{degree}</p>
          </div>
          <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
            <p className="text-xs text-gray-500 mb-1">Influence</p>
            <p className="text-xl font-bold text-gray-200">{(degree * 1.5).toFixed(1)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeDetailsPanel;
