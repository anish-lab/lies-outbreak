import React from 'react';
import { Activity, Users, ShieldAlert, Zap } from 'lucide-react';

const Dashboard = ({ totalNodes, baselineCount, optimizedCount, intervenedCount, step, showCompare = false }) => {
  const savedCount = Math.max(0, baselineCount - optimizedCount);
  const percentSaved = totalNodes > 0 ? ((savedCount / totalNodes) * 100).toFixed(1) : 0;
  
  return (
    <div className="flex gap-4 items-stretch">
      <StatBox 
        icon={<Activity size={14} className="text-blue-400" />}
        label="Timeline Tick" 
        value={step} 
      />
      
      {showCompare ? (
        <>
          <StatBox 
            icon={<ShieldAlert size={14} className="text-red-500" />}
            label="Baseline Compromised" 
            value={baselineCount}
            subvalue={`${((baselineCount/totalNodes)*100).toFixed(1)}%`}
            color="text-red-500"
            glowColor="rgba(239, 68, 68, 0.2)"
          />
          <StatBox 
            icon={<ShieldAlert size={14} className="text-orange-400" />}
            label="Optimized Compromised" 
            value={optimizedCount}
            subvalue={`${((optimizedCount/totalNodes)*100).toFixed(1)}%`}
            color="text-orange-400"
            glowColor="rgba(251, 146, 60, 0.2)"
          />
        </>
      ) : (
        <StatBox 
          icon={<ShieldAlert size={14} className="text-red-500" />}
          label="Total Compromised" 
          value={optimizedCount}
          subvalue={`${((optimizedCount/totalNodes)*100).toFixed(1)}%`}
          color="text-red-500"
          glowColor="rgba(239, 68, 68, 0.2)"
        />
      )}

      <div className="bg-black/60 border border-green-500/40 rounded-xl px-6 py-2 flex flex-col justify-center min-w-[160px] shadow-[inset_0_0_20px_rgba(34,197,94,0.1),_0_0_20px_rgba(34,197,94,0.2)] backdrop-blur-md relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
        <div className="flex items-center gap-2 mb-1 relative z-10">
          <Zap size={14} className="text-green-400" fill="currentColor" />
          <span className="text-[10px] text-green-400 font-bold uppercase tracking-[0.2em]">Threats Neutralized</span>
        </div>
        <div className="flex items-baseline gap-2 relative z-10">
          <span className="text-2xl font-black text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]">{savedCount}</span>
          <span className="text-[10px] font-mono text-green-500">({percentSaved}%)</span>
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ icon, label, value, subvalue, color = "text-white", glowColor = "rgba(255,255,255,0.05)" }) => (
  <div 
    className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl px-5 py-2 flex flex-col justify-center min-w-[140px] transition-all duration-300"
    style={{ boxShadow: `inset 0 0 20px ${glowColor}` }}
  >
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em] whitespace-nowrap">{label}</span>
    </div>
    <div className="flex items-baseline gap-2">
      <span className={`text-xl font-black ${color}`}>{value}</span>
      {subvalue && <span className="text-[10px] text-gray-500 font-mono">{subvalue}</span>}
    </div>
  </div>
);

export default Dashboard;
