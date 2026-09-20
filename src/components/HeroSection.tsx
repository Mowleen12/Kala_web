import React from 'react';
import { ArrowRight } from 'lucide-react';
import { KalaStar } from './KalaLogo';

interface HeroSectionProps {
  onExplore: () => void;
  onJoin: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onExplore, onJoin }) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-transparent pb-6 pt-2">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Typography & CTA Column */}
        <div className="lg:col-span-6 z-10">
          {/* Mini Brandmark Tag */}
          <div className="inline-flex items-center gap-2 mb-4">
            <KalaStar size={20} className="text-[#E45826]" />
            <span className="font-brand font-black text-xl text-zinc-900 tracking-tight">kalā</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[46px] font-extrabold text-zinc-950 tracking-tight leading-[1.12] mb-5">
            Where India’s<br />
            emerging artists<br />
            build <span className="text-[#E45826]">careers</span>,<br />
            not just followers.
          </h1>

          {/* Subtitle */}
          <p className="text-[15px] sm:text-base text-zinc-600 leading-relaxed max-w-md mb-8">
            A platform to showcase your talent, discover real opportunities, and collaborate with creative minds.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3.5">
            <button
              id="hero-explore-btn"
              onClick={onExplore}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#E45826] text-white text-sm font-semibold shadow-sm hover:bg-[#D44716] active:scale-98 transition-all cursor-pointer"
            >
              <span>Explore Opportunities</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              id="hero-join-btn"
              onClick={onJoin}
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white text-zinc-800 text-sm font-semibold border border-[#DCD6CC] shadow-2xs hover:bg-[#F9F7F4] hover:border-zinc-400 active:scale-98 transition-all cursor-pointer"
            >
              Join as an Artist
            </button>
          </div>
        </div>

        {/* Right Dynamic Artistic Collage with Doodle Accents */}
        <div className="lg:col-span-6 relative flex justify-center lg:justify-end">
          {/* Organic Orange Doodle Vector Strokes */}
          <svg
            className="absolute -top-6 -left-6 w-full h-full pointer-events-none z-0 text-[#E45826]/75"
            viewBox="0 0 500 450"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Smooth swooping loop stroke matching the screenshot */}
            <path
              d="M 50 180 C 20 120, 10 300, 120 260 C 240 220, 200 40, 360 45 C 440 48, 480 90, 470 140 C 450 250, 300 420, 180 390 C 80 370, 70 280, 120 260"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray="none"
            />
          </svg>

          {/* 4-Image Grid Cluster */}
          <div className="grid grid-cols-2 gap-3.5 max-w-[460px] w-full relative z-10">
            {/* Top-Left: Concert Crowd with Handwritten Overlay */}
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-md group">
              <img
                src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=650&q=80"
                alt="Concert stage crowd"
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-3.5">
                <span className="font-script text-white text-xl sm:text-2xl font-bold leading-tight drop-shadow-md transform -rotate-3 select-none">
                  Create<br />
                  Collaborate<br />
                  Grow
                </span>
              </div>
            </div>

            {/* Top-Right: Mountain Hiker Scenic Summit */}
            <div className="rounded-2xl overflow-hidden aspect-[4/3] shadow-md group">
              <img
                src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=650&q=80"
                alt="Artist in nature"
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Bottom-Left: Neon Sign "You are what you listen to" */}
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-md group bg-zinc-950 flex items-center justify-center p-3 text-center border border-zinc-800">
              <div className="absolute inset-0 bg-radial from-amber-600/20 via-zinc-950/90 to-zinc-950" />
              <div className="relative z-10">
                <p className="font-script text-amber-400 text-lg sm:text-xl font-bold tracking-wide drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]">
                  you are ♫
                </p>
                <p className="font-script text-amber-300 text-lg sm:text-xl font-bold tracking-wide drop-shadow-[0_0_14px_rgba(251,191,36,0.7)] mt-0.5">
                  what you listen to
                </p>
              </div>
            </div>

            {/* Bottom-Right: Vintage Studio Microphone */}
            <div className="rounded-2xl overflow-hidden aspect-[4/3] shadow-md group">
              <img
                src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=650&q=80"
                alt="Classic studio microphone"
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
