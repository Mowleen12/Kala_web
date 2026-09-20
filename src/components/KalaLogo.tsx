import React from 'react';

export const KalaStar: React.FC<{ className?: string; size?: number }> = ({ 
  className = "w-6 h-6 text-[#E45826]", 
  size = 24 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Central 8-pointed rounded ray asterisk */}
      <g stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
        {/* Vertical ray */}
        <line x1="16" y1="4" x2="16" y2="28" />
        {/* Horizontal ray */}
        <line x1="4" y1="16" x2="28" y2="16" />
        {/* Diagonal 1 */}
        <line x1="7.5" y1="7.5" x2="24.5" y2="24.5" />
        {/* Diagonal 2 */}
        <line x1="7.5" y1="24.5" x2="24.5" y2="7.5" />
      </g>
    </svg>
  );
};

export const KalaLogo: React.FC<{ 
  className?: string; 
  starSize?: number; 
  textSize?: string;
  showWordmark?: boolean;
  onClick?: () => void;
}> = ({ 
  className = "", 
  starSize = 26, 
  textSize = "text-2xl font-black tracking-tight",
  showWordmark = true,
  onClick
}) => {
  return (
    <div 
      onClick={onClick}
      className={`inline-flex items-center gap-2 cursor-pointer select-none group ${className}`}
    >
      <KalaStar size={starSize} className="text-[#E45826] transition-transform duration-300 group-hover:rotate-45" />
      {showWordmark && (
        <span className={`font-brand font-black text-zinc-900 ${textSize}`}>
          kalā
        </span>
      )}
    </div>
  );
};
