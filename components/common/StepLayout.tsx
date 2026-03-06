import React from 'react';
import { Card } from '../Card';

interface StepLayoutProps {
  title: string;
  borderColorClass: string; // e.g., "border-t-[#a855f7]"
  children: React.ReactNode;
}

export const StepLayout: React.FC<StepLayoutProps> = ({ title, borderColorClass, children }) => {
  return (
    <div className="space-y-8 w-full max-w-6xl mx-auto pb-20">
      <Card className={`border-t-[8px] ${borderColorClass}`}>
        <h2 className="text-4xl font-black mb-8 text-black italic">{title}</h2>
        {children}
      </Card>
    </div>
  );
};
