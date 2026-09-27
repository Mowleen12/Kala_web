import React from 'react';
import { ArrowRight } from 'lucide-react';

interface OrganiserStatsCardProps {
  onPostCall: () => void;
}

export const OrganiserStatsCard: React.FC<OrganiserStatsCardProps> = ({ onPostCall }) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFF5EE] to-[#FCEEE3] p-6 sm:p-7 border border-[#F3E3D5] shadow-sm flex flex-col justify-between h-full">
      {/* Soft abstract background glow circle */}
      <div className="absolute -bottom-12 -right-12 w-44 h-44 rounded-full bg-[#FCE5D4]/60 blur-2xl pointer-events-none" />

      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 leading-snug mb-6">
          Scout & curate<br />with confidence
        </h3>

        <div className="space-y-5">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#E45826] tracking-tight">
              12.4K+
            </div>
            <div className="text-xs sm:text-sm font-medium text-zinc-600 mt-0.5">
              Verified Portfolios & Reels
            </div>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#E45826] tracking-tight">
              94%
            </div>
            <div className="text-xs sm:text-sm font-medium text-zinc-600 mt-0.5">
              Audition Attendance Rate
            </div>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#E45826] tracking-tight">
              &lt; 48h
            </div>
            <div className="text-xs sm:text-sm font-medium text-zinc-600 mt-0.5">
              Average Time to Shortlist
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button
          id="org-stats-post-btn"
          onClick={onPostCall}
          aria-label="Post an opportunity call"
          className="w-10 h-10 rounded-full bg-white border border-[#E45826] text-[#E45826] flex items-center justify-center shadow-2xs hover:bg-[#FDEEE7] active:scale-95 transition-all cursor-pointer"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
