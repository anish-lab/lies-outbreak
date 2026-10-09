import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

const TimelineControls = ({ currentStep, maxSteps, isPlaying, onTogglePlay, onReset, onSeek }) => {
  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[700px] max-w-[90vw] bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 shadow-[0_10px_50px_rgba(0,0,0,0.9)] z-20 flex items-center gap-8">
      
      <div className="flex items-center gap-4 border-r border-white/10 pr-6">
        <button 
          onClick={onReset}
          className="p-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors group"
          title="Restart"
        >
          <RotateCcw size={20} className="group-active:-rotate-90 transition-transform duration-300" />
        </button>
        
        <button 
          onClick={onTogglePlay}
          className="w-14 h-14 flex items-center justify-center bg-white text-black hover:bg-gray-200 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all active:scale-90"
        >
          {isPlaying ? <Pause fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} className="ml-1" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-3">
        <div className="flex justify-between items-end">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em]">Temporal Scrubber</span>
          <span className="text-xs font-mono font-bold text-white bg-white/10 px-3 py-1 rounded-full border border-white/10">
            TICK {String(currentStep).padStart(2, '0')} <span className="text-gray-500 font-normal">/ {String(maxSteps).padStart(2, '0')}</span>
          </span>
        </div>
        
        <div className="relative w-full flex items-center h-2 bg-gray-900 rounded-full overflow-hidden border border-white/5">
          <div 
             className="absolute left-0 top-0 bottom-0 bg-blue-500 shadow-[0_0_10px_#3b82f6]"
             style={{ width: `${maxSteps > 0 ? (currentStep / maxSteps) * 100 : 0}%` }}
          ></div>
          <input 
            type="range" 
            min="0" 
            max={maxSteps} 
            value={currentStep} 
            onChange={(e) => onSeek(parseInt(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
      
    </div>
  );
};

export default TimelineControls;
