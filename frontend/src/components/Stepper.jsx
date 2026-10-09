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
    <div className="w-full py-6 px-8 bg-transparent">
      <div className="max-w-4xl mx-auto flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1px] bg-white/10 z-0">
          <div 
            className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6] transition-all duration-700 ease-in-out" 
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          ></div>
        </div>
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black font-mono transition-all duration-500
                  ${isActive ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.8)] border border-blue-400 scale-110' : 
                    isCompleted ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.5)] border border-white' : 'bg-black text-gray-600 border border-white/10'}`}
              >
                {isCompleted ? <Check strokeWidth={3} size={14} /> : step.id}
              </div>
              <span className={`text-[9px] font-bold absolute -bottom-7 whitespace-nowrap uppercase tracking-[0.2em] transition-colors duration-500
                ${isActive ? 'text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]' : isCompleted ? 'text-white' : 'text-gray-600'}`}>
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
