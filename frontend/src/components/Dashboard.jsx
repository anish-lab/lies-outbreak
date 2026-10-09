import React from 'react';

const Dashboard = ({ totalNodes, baselineCount, optimizedCount, intervenedCount, step }) => {
  const savedCount = Math.max(0, baselineCount - optimizedCount);
  
  return (
    <div className="flex gap-4">
      <StatBox 
        label="Time Step" 
        value={step} 
        color="text-gray-300"
      />
      <StatBox 
        label="Baseline Infected" 
        value={`${baselineCount} / ${totalNodes}`} 
        color="text-red-400"
      />
      <StatBox 
        label="Optimized Infected" 
        value={`${optimizedCount} / ${totalNodes}`} 
        color="text-orange-400"
      />
      <div className="bg-gray-950/50 border border-green-900/30 rounded-lg px-4 py-2 flex flex-col items-center justify-center min-w-[120px] relative overflow-hidden">
        <div className="absolute inset-0 bg-green-500/10"></div>
        <span className="text-xs text-green-400 font-medium z-10">Users Saved</span>
        <span className="text-xl font-bold text-green-300 z-10">{savedCount}</span>
      </div>
    </div>
  );
};

const StatBox = ({ label, value, color }) => (
  <div className="bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 flex flex-col items-center justify-center min-w-[120px]">
    <span className="text-xs text-gray-500 font-medium mb-1">{label}</span>
    <span className={`text-lg font-bold ${color}`}>{value}</span>
  </div>
);

export default Dashboard;
