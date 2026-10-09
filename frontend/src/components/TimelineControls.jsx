import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

const TimelineControls = ({ currentStep, maxSteps, isPlaying, onTogglePlay, onReset, onSeek }) => {
  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[600px] bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-2xl p-4 shadow-2xl z-20 flex items-center gap-6">
      
      <div className="flex items-center gap-3">
        <button 
          onClick={onReset}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
          title="Restart"
        >
          <RotateCcw size={20} />
        </button>
        
        <button 
          onClick={onTogglePlay}
          className="w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-900/50 transition-all active:scale-95"
        >
          {isPlaying ? <Pause fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} className="ml-1" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <div className="flex justify-between items-end">
          <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">Timeline</span>
          <span className="text-sm font-bold text-gray-200">
            Tick {currentStep} <span className="text-gray-500 font-normal">/ {maxSteps}</span>
          </span>
        </div>
        
        <input 
          type="range" 
          min="0" 
          max={maxSteps} 
          value={currentStep} 
          onChange={(e) => onSeek(parseInt(e.target.value))}
          className="w-full accent-blue-500 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      
    </div>
  );
};

export default TimelineControls;
