import React from 'react';
import { Activity, ShieldAlert, Zap } from 'lucide-react';

const Dashboard = ({ totalNodes, baselineCount, optimizedCount, intervenedCount, step, showCompare = false }) => {
  const savedCount = Math.max(0, baselineCount - optimizedCount);
  const percentSaved = totalNodes > 0 ? ((savedCount / totalNodes) * 100).toFixed(1) : 0;
  
  return (
    <div className="flex gap-2 items-center">
      <StatPill
        icon={<Activity size={11} className="text-blue-400" />}
        label="Tick"
        value={step}
      />
      
      {showCompare ? (
        <>
          <StatPill
            icon={<ShieldAlert size={11} className="text-red-500" />}
            label="Baseline"
            value={baselineCount}
            sub={`${((baselineCount / totalNodes) * 100).toFixed(1)}%`}
            color="text-red-400"
          />
          <StatPill
            icon={<ShieldAlert size={11} className="text-orange-400" />}
            label="Optimized"
            value={optimizedCount}
            sub={`${((optimizedCount / totalNodes) * 100).toFixed(1)}%`}
            color="text-orange-400"
          />
        </>
      ) : (
        <StatPill
          icon={<ShieldAlert size={11} className="text-red-500" />}
          label="Compromised"
          value={optimizedCount}
          sub={`${((optimizedCount / totalNodes) * 100).toFixed(1)}%`}
          color="text-red-400"
        />
      )}

      <div className="bg-black/60 border border-green-500/40 rounded-lg px-3 py-1 flex items-center gap-2 shadow-[inset_0_0_12px_rgba(34,197,94,0.08)]">
        <Zap size={11} className="text-green-400 shrink-0" fill="currentColor" />
        <span className="text-[9px] text-green-400 font-bold uppercase tracking-widest">Neutralized</span>
        <span className="text-sm font-black text-green-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.8)]">{savedCount}</span>
        <span className="text-[9px] font-mono text-green-600">({percentSaved}%)</span>
      </div>
    </div>
  );
};

const StatPill = ({ icon, label, value, sub, color = 'text-white' }) => (
  <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1 flex items-center gap-2">
    {icon}
    <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">{label}</span>
    <span className={`text-sm font-black ${color}`}>{value}</span>
    {sub && <span className="text-[8px] text-gray-600 font-mono">{sub}</span>}
  </div>
);

export default Dashboard;
