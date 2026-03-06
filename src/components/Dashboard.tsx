
import React from 'react';
import { Card } from './Card';
import { StepId } from '../types';
import { STEP_INFO } from '../constants';

interface DashboardProps {
  unlockedSteps: StepId[];
  onSelectStep: (step: StepId) => void;
  completedSteps: StepId[];
}

export const Dashboard: React.FC<DashboardProps> = ({ unlockedSteps, onSelectStep, completedSteps }) => {
  const steps = [
    StepId.INTRO, 
    StepId.MISSION, 
    StepId.VISION, 
    StepId.VALUE, 
    StepId.INTERNALIZATION, 
    StepId.OUTRO
  ];

  return (
    <div className="w-full h-full flex flex-col">
      <div className="mb-8 p-6 bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000]">
        <h2 className="text-4xl font-black text-black mb-2 italic">Dashboard</h2>
        <p className="text-black font-bold text-lg">순서대로 임무를 완수하여 다음 단계의 <span className="bg-black text-white px-1">자물쇠</span>를 해제하세요.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr pb-20">
        {steps.map((step) => {
          const isUnlocked = unlockedSteps.includes(step);
          const isCompleted = completedSteps.includes(step);
          const info = STEP_INFO[step];

          return (
            <Card 
              key={step} 
              className={`
                flex flex-col justify-between h-60 relative overflow-hidden group
                ${!isUnlocked 
                  ? 'opacity-80 bg-gray-100 border-gray-400 text-gray-500 cursor-not-allowed shadow-none' 
                  : 'cursor-pointer hover:bg-[#fff9c4]'
                }
              `}
              disabled={!isUnlocked}
              onClick={() => isUnlocked && onSelectStep(step)}
            >
              {/* Completed Badge */}
              {isCompleted && (
                <div className="absolute top-4 right-4 z-20 animate-fade-in">
                  <div className="bg-[#10b981] text-white border-[2px] border-black px-3 py-1 font-black text-xs shadow-[3px_3px_0px_0px_#000] uppercase">
                    완료
                  </div>
                </div>
              )}

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div></div>
                  {!isUnlocked && !isCompleted && (
                    <span className="text-3xl grayscale opacity-50">🔒</span>
                  )}
                  {isUnlocked && !isCompleted && (
                    <span className="text-3xl animate-pulse">🔓</span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-black mb-2 leading-tight">{info.title}</h3>
                <p className="text-sm font-bold text-gray-600 border-t-2 border-black pt-2 inline-block">{info.subtitle}</p>
              </div>

              {/* Decorative Number */}
              <div className={`absolute -bottom-6 -right-2 text-9xl font-black transition-all duration-500 select-none ${isUnlocked ? 'text-black/5 group-hover:text-black/10' : 'text-gray-300'}`}>
                {step}
              </div>
              
              {isUnlocked && (
                <div className="relative z-10 mt-auto flex justify-end">
                   <div className="w-12 h-12 bg-white border-[3px] border-black flex items-center justify-center transition-all duration-300 group-hover:bg-black group-hover:text-white shadow-[4px_4px_0px_0px_#000]">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                   </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
