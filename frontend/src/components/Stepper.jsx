import React from 'react';
import { Check } from 'lucide-react';

const steps = [
  { id: 1, name: 'Load Topography' },
  { id: 2, name: 'Set Parameters' },
  { id: 3, name: 'Compute Trajectories' },
  { id: 4, name: 'Active Defense' },
  { id: 5, name: 'Comparative Analysis' }
];

const Stepper = ({ currentStep }) => {
  return (
    <div className="w-full pt-2 pb-2.5 px-6 bg-black/60 border-t border-white/5 select-none">
      <div className="max-w-4xl mx-auto relative">
        {/* Progress line running through the center of the circles (height is 24px, so center is top-3) */}
        <div className="absolute left-4 right-4 top-3 -translate-y-1/2 h-[2px] bg-white/10 z-0">
          <div
            className="h-full bg-blue-500 shadow-[0_0_8px_#3b82f6] transition-all duration-700 ease-in-out"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>

        <div className="flex items-start justify-between relative z-10">
          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;

            return (
              <div key={step.id} className="flex flex-col items-center group">
                {/* Circle badge */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black font-mono transition-all duration-500
                    ${isActive
                      ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.9)] border-2 border-blue-400 scale-110'
                      : isCompleted
                      ? 'bg-white text-black border border-white'
                      : 'bg-[#0a0a0a] text-gray-500 border border-white/15'
                    }`}
                >
                  {isCompleted ? <Check strokeWidth={3} size={11} /> : step.id}
                </div>
                {/* Label below the circle so the progress line never strikes through it */}
                <span
                  className={`mt-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-center whitespace-nowrap transition-colors duration-300
                    ${isActive ? 'text-blue-400 font-black' : isCompleted ? 'text-gray-300' : 'text-gray-600'}`}
                >
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Stepper;
