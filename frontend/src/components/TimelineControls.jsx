import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

const TimelineControls = ({ currentStep, maxSteps, isPlaying, onTogglePlay, onReset, onSeek }) => {
  const progress = maxSteps > 0 ? (currentStep / maxSteps) * 100 : 0;

  return (
    // Docked bottom bar — flex-none so it never overlaps the canvas above
    <div className="flex-none h-12 bg-black/95 border-t border-white/10 px-4 flex items-center gap-4 z-20 shrink-0">

      {/* Reset */}
      <button
        onClick={onReset}
        className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors group"
        title="Restart"
      >
        <RotateCcw size={15} className="group-active:-rotate-90 transition-transform duration-300" />
      </button>

      {/* Play / Pause */}
      <button
        onClick={onTogglePlay}
        className="w-8 h-8 flex items-center justify-center bg-white text-black hover:bg-gray-200 rounded-full shadow-[0_0_12px_rgba(255,255,255,0.25)] transition-all active:scale-90 shrink-0"
      >
        {isPlaying ? <Pause fill="currentColor" size={14} /> : <Play fill="currentColor" size={14} className="ml-0.5" />}
      </button>

      {/* Label */}
      <span className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.25em] shrink-0">Temporal Scrubber</span>

      {/* Scrubber track */}
      <div className="relative flex-1 flex items-center h-2 bg-gray-900 rounded-full overflow-hidden border border-white/5">
        <div
          className="absolute left-0 top-0 bottom-0 bg-blue-500 shadow-[0_0_8px_#3b82f6] transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
        <input
          type="range"
          min="0"
          max={maxSteps}
          value={currentStep}
          onChange={(e) => onSeek(parseInt(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>

      {/* Tick counter */}
      <span className="text-xs font-mono font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10 shrink-0">
        TICK {String(currentStep).padStart(2, '0')} <span className="text-gray-500 font-normal">/ {String(maxSteps).padStart(2, '0')}</span>
      </span>
    </div>
  );
};

export default TimelineControls;
