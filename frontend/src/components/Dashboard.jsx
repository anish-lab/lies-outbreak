import React from 'react';
import { Activity, Users, Shield, TrendingUp } from 'lucide-react';

const Dashboard = ({ totalNodes, baselineCount, optimizedCount, intervenedCount, step, showCompare = false }) => {
  const savedCount = Math.max(0, baselineCount - optimizedCount);
  const percentSaved = totalNodes > 0 ? ((savedCount / totalNodes) * 100).toFixed(1) : 0;
  
  return (
    <div className="flex gap-4">
      <StatBox 
        icon={<Activity size={16} className="text-blue-400" />}
        label="Time Step" 
        value={step} 
      />
      
      {showCompare ? (
        <>
          <StatBox 
            icon={<TrendingUp size={16} className="text-red-400" />}
            label="Baseline Affected" 
            value={baselineCount}
            subvalue={`${((baselineCount/totalNodes)*100).toFixed(1)}%`}
            color="text-red-400"
          />
          <StatBox 
            icon={<Shield size={16} className="text-orange-400" />}
            label="Optimized Affected" 
            value={optimizedCount}
            subvalue={`${((optimizedCount/totalNodes)*100).toFixed(1)}%`}
            color="text-orange-400"
          />
        </>
      ) : (
        <StatBox 
          icon={<TrendingUp size={16} className="text-red-400" />}
          label="Total Affected" 
          value={optimizedCount}
          subvalue={`${((optimizedCount/totalNodes)*100).toFixed(1)}%`}
          color="text-red-400"
        />
      )}

      <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/20 border border-green-500/30 rounded-xl px-5 py-2 flex flex-col justify-center min-w-[140px] shadow-[0_0_15px_rgba(16,185,129,0.1)]">
        <div className="flex items-center gap-2 mb-1">
          <Users size={14} className="text-green-400" />
          <span className="text-xs text-green-400/80 font-semibold uppercase tracking-wider">Users Saved</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-green-400 drop-shadow-md">{savedCount}</span>
          <span className="text-xs font-medium text-green-500/70">({percentSaved}%)</span>
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ icon, label, value, subvalue, color = "text-gray-100" }) => (
  <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-xl px-5 py-2 flex flex-col justify-center min-w-[130px] shadow-lg">
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <div className="flex items-baseline gap-2">
      <span className={`text-xl font-bold ${color}`}>{value}</span>
      {subvalue && <span className="text-xs text-gray-500 font-medium">{subvalue}</span>}
    </div>
  </div>
);

export default Dashboard;
