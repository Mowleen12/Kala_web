import React, { useEffect, useState } from 'react';
import { KalaLogo, KalaStar } from './KalaLogo';

interface OnboardingLoadingScreenProps {
  onComplete: () => void;
  title?: string;
  subtitle?: string;
}

export const OnboardingLoadingScreen: React.FC<OnboardingLoadingScreenProps> = ({
  onComplete,
  title = "Almost there...",
  subtitle = "We're setting up your creative space."
}) => {
  const [progress, setProgress] = useState(15);
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    // Smooth progress increment
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(onComplete, 400);
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 10;
      });
    }, 280);

    const dotInterval = setInterval(() => {
      setActiveDot((prev) => (prev + 1) % 3);
    }, 600);

    return () => {
      clearInterval(progressInterval);
      clearInterval(dotInterval);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#FAF7F2] flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-hidden animate-in fade-in duration-300">
      {/* Background Soft Organic Orange Curves */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none text-[#FCEEE7]"
        viewBox="0 0 800 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="100" cy="100" r="280" fill="currentColor" fillOpacity="0.3" />
        <circle cx="750" cy="400" r="320" fill="currentColor" fillOpacity="0.4" />
        <path
          d="M -50 700 C 200 650, 250 850, 500 750 C 750 650, 780 780, 850 800"
          stroke="#E45826"
          strokeWidth="1.5"
          strokeOpacity="0.25"
          fill="none"
        />
      </svg>

      {/* Top spacer */}
      <div className="w-full flex justify-center pt-8 relative z-10">
        <KalaLogo starSize={28} textSize="text-3xl" />
      </div>

      {/* Center Setup Animation & Status */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm px-4">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight mb-2">
          {title}
        </h2>
        <p className="text-sm text-zinc-500 mb-10">
          {subtitle}
        </p>

        {/* Circular Progress Ring with Central Starburst */}
        <div className="relative w-32 h-32 flex items-center justify-center mb-8">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r="40"
              className="text-[#F5E8DD]"
              strokeWidth="6"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Active Progress Arc */}
            <circle
              cx="50"
              cy="50"
              r="40"
              className="text-[#E45826] transition-all duration-300 ease-out"
              strokeWidth="6"
              strokeDasharray={251.2}
              strokeDashoffset={251.2 - (251.2 * progress) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          {/* Central Pulsing Star */}
          <div className="absolute inset-0 flex items-center justify-center">
            <KalaStar size={30} className="text-[#E45826] animate-pulse" />
          </div>
        </div>

        <p className="text-xs text-zinc-500 font-medium mb-6">
          Good things take a little time.
        </p>

        {/* 3 Step Indicator Dots */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                activeDot === dot
                  ? 'bg-[#E45826] scale-125 w-4'
                  : 'bg-[#F2DDD2]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Corner Script Branding (matching Image 3) */}
      <div className="w-full flex justify-end pb-4 pr-4 sm:pr-8 relative z-10">
        <span className="font-script text-[#E45826] text-2xl sm:text-3xl font-bold leading-tight transform -rotate-6 select-none opacity-85">
          Create<br />
          Collaborate<br />
          Grow
        </span>
      </div>
    </div>
  );
};
