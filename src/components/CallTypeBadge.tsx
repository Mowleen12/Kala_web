import React from 'react';
import { CallType } from '../types';
import { callTypeLabel } from '../lib/offer';

/**
 * The kind of call, stated plainly: competition, showcase, festival,
 * residency, stage production, exhibition, workshop, or commission.
 */
const STYLES: Record<string, string> = {
  competition: 'bg-[#B91C1C] text-white',
  showcase: 'bg-[#1D4ED8] text-white',
  festival: 'bg-[#E45826] text-white',
  residency: 'bg-[#047857] text-white',
  stage_production: 'bg-[#0F172A] text-white',
  exhibition: 'bg-[#0891B2] text-white',
  workshop: 'bg-[#7C3AED] text-white',
  commission: 'bg-[#B45309] text-white',
};

interface CallTypeBadgeProps {
  callType?: CallType | null;
  variant?: 'card' | 'inline';
}

export const CallTypeBadge: React.FC<CallTypeBadgeProps> = ({ callType, variant = 'card' }) => {
  if (!callType) return null;
  const label = callTypeLabel(callType);

  if (variant === 'inline') {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${STYLES[callType] || 'bg-zinc-800 text-white'}`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide shadow-xs whitespace-nowrap ${STYLES[callType] || 'bg-zinc-800 text-white'}`}
    >
      {label}
    </span>
  );
};
