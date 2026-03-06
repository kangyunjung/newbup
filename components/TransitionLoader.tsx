
import React from 'react';

interface TransitionLoaderProps {
  message: string;
}

export const TransitionLoader: React.FC<TransitionLoaderProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#fffdf5] flex flex-col items-center justify-center animate-fade-in text-black">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-4">
        {/* Animated Icon */}
        <div className="w-24 h-24 mb-8 bg-[#facc15] border-[4px] border-black shadow-[8px_8px_0px_0px_#000] flex items-center justify-center animate-bounce">
          <span className="text-4xl font-black">B</span>
        </div>

        {/* Text */}
        <h3 className="text-4xl font-black text-black mb-4 uppercase tracking-tighter">Loading...</h3>
        <p className="text-black font-bold text-lg mb-8 bg-white border-2 border-black px-4 py-1 shadow-[4px_4px_0px_0px_#000]">
          {message}
        </p>

        {/* Progress Bar */}
        <div className="w-full h-8 bg-white border-[3px] border-black rounded-none overflow-hidden relative shadow-[4px_4px_0px_0px_#000]">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.1)_25%,rgba(0,0,0,0.1)_50%,transparent_50%,transparent_75%,rgba(0,0,0,0.1)_75%,rgba(0,0,0,0.1)_100%)] [background-size:20px_20px] animate-[slide_1s_linear_infinite] opacity-50 z-10"></div>
          <div className="h-full bg-[#ff6b6b] w-full origin-left animate-[grow_2s_ease-in-out_infinite]"></div>
        </div>
        
        <style>{`
          @keyframes slide {
            0% { background-position: 0 0; }
            100% { background-position: 20px 20px; }
          }
          @keyframes grow {
            0% { transform: scaleX(0); }
            50% { transform: scaleX(0.7); }
            100% { transform: scaleX(1); }
          }
        `}</style>
      </div>
    </div>
  );
};
