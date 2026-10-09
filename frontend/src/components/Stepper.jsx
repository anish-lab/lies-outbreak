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
    <div className="w-full py-2 px-8 bg-black/40 border-t border-white/5">
      <div className="max-w-4xl mx-auto flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1px] bg-white/10 z-0">
          <div
            className="h-full bg-blue-500 shadow-[0_0_6px_#3b82f6] transition-all duration-700 ease-in-out"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {steps.map((step) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;

          return (
            <div key={step.id} className="relative z-10 flex items-center gap-1.5">
              {/* Circle badge */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black font-mono transition-all duration-500
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.8)] border border-blue-400 scale-110'
                    : isCompleted
                    ? 'bg-white text-black border border-white'
                    : 'bg-black text-gray-600 border border-white/10'
                  }`}
              >
                {isCompleted ? <Check strokeWidth={3} size={10} /> : step.id}
              </div>
              {/* Label — only show on active/completed to save space */}
              <span
                className={`text-[9px] font-bold uppercase tracking-[0.15em] whitespace-nowrap transition-colors duration-500 hidden sm:block
                  ${isActive ? 'text-blue-400' : isCompleted ? 'text-white/60' : 'text-gray-700'}`}
              >
                {step.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Stepper;
