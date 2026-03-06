
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, fullWidth = false }) => {
  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 relative z-0 text-black">
      {/* Header */}
      <header className={`w-full ${fullWidth ? 'max-w-[95%]' : 'max-w-7xl'} flex justify-between items-center mb-12 px-2`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#2563eb] border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-white font-black text-2xl transform -rotate-3">
            B
          </div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase italic" style={{ textShadow: '2px 2px 0px #d1d5db' }}>
            Build Up
          </h1>
        </div>
        <div className="text-sm font-bold text-black bg-[#facc15] border-[3px] border-black px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-full">
          Corporate Value Workshop
        </div>
      </header>

      {/* Main Content */}
      <main className={`w-full ${fullWidth ? 'max-w-[95%]' : 'max-w-7xl'} flex-grow flex flex-col relative z-10`}>
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-16 text-center text-black font-bold py-6 w-full border-t-2 border-black/10">
        <p className="uppercase tracking-widest text-xs">© 2026 REFERENCE HRD. All Rights Reserved.</p>
      </footer>
    </div>
  );
};
