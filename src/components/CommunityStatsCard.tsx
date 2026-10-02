import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PlatformStats } from '../types';

interface CommunityStatsCardProps {
  stats: PlatformStats | null;
  onJoin: () => void;
}

const n = (value: number | undefined) => (value ?? 0).toLocaleString('en-IN');

export const CommunityStatsCard: React.FC<CommunityStatsCardProps> = ({ stats, onJoin }) => {
  const rows: { value: string; label: string }[] = [
    { value: stats ? n(stats.artists) : '—', label: 'Artists & Creators' },
    { value: stats ? n(stats.opportunities) : '—', label: 'Opportunities Listed' },
    { value: stats ? n(stats.cities) : '—', label: 'Cities Across India' },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFF5EE] to-[#FCEEE3] p-6 sm:p-7 border border-[#F3E3D5] shadow-sm flex flex-col justify-between h-full">
      {/* Soft abstract background glow circle */}
      <div className="absolute -bottom-12 -right-12 w-44 h-44 rounded-full bg-[#FCE5D4]/60 blur-2xl pointer-events-none" />

      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 leading-snug mb-6">
          Join a growing<br />creative community
        </h3>

        <div className="space-y-5">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="text-3xl sm:text-4xl font-extrabold text-[#E45826] tracking-tight">
                {row.value}
              </div>
              <div className="text-xs sm:text-sm font-medium text-zinc-600 mt-0.5">
                {row.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <button
          id="community-join-btn"
          onClick={onJoin}
          aria-label="Explore community opportunities"
          className="w-10 h-10 rounded-full bg-white border border-[#E45826] text-[#E45826] flex items-center justify-center shadow-2xs hover:bg-[#FDEEE7] active:scale-95 transition-all cursor-pointer"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
