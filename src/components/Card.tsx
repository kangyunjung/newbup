
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = "", onClick, disabled }) => {
  // Removed active:translate-y-[2px] active:translate-x-[2px]
  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={`
        bg-white border-[3px] border-black
        shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
        rounded-lg p-6 transition-all duration-150 ease-in-out
        text-black
        ${disabled 
          ? 'opacity-60 cursor-not-allowed bg-gray-100 border-gray-400 text-gray-500 shadow-none' 
          : 'hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
};
