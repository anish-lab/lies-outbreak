import React from 'react';
import { Check } from 'lucide-react';

const steps = [
  { id: 1, name: 'Load Network' },
  { id: 2, name: 'Configure' },
  { id: 3, name: 'Simulate' },
  { id: 4, name: 'Explore' },
  { id: 5, name: 'Compare' }
];

const Stepper = ({ currentStep }) => {
  return (
    <div className="w-full py-6 px-8 bg-gray-900 border-b border-gray-800">
      <div className="max-w-3xl mx-auto flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gray-800 z-0">
          <div 
            className="h-full bg-blue-600 transition-all duration-300" 
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          ></div>
        </div>
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                  ${isActive ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.6)]' : 
                    isCompleted ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}
              >
                {isCompleted ? <Check size={16} /> : step.id}
              </div>
              <span className={`text-xs font-medium absolute -bottom-6 whitespace-nowrap
                ${isActive ? 'text-blue-400' : isCompleted ? 'text-gray-300' : 'text-gray-600'}`}>
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
