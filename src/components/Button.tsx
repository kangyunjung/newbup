
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  loading = false, 
  className = "", 
  disabled,
  ...props 
}) => {
  // Removed active:translate-x-[2px] active:translate-y-[2px]
  const baseStyle = "px-6 py-3 rounded-lg font-black text-lg border-[3px] border-black transition-all duration-150 flex items-center justify-center gap-2 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none";
  
  const variants = {
    // Hot Pink / Magenta for Primary
    primary: "bg-[#ff6b6b] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ff5252]",
    
    // Bright Yellow for Secondary
    secondary: "bg-[#facc15] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#eab308]",
    
    // White/Transparent for Outline
    outline: "bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50",
    
    // Ghost (Minimal)
    ghost: "bg-transparent border-transparent shadow-none hover:bg-black/5 !border-0 text-black",

    // Danger
    danger: "bg-red-600 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-red-700"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant] || variants.primary} ${className}`} 
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};
