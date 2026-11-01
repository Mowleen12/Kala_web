import React from 'react';
import { CallType } from '../types';
import { callTypeLabel } from '../lib/offer';

/**
 * The kind of call, stated plainly. Every listing used to read as an
 * "audition"; an artist now sees whether a call is a competition, a booked
 * event slot, a residency, a workshop, or a commission before opening it.
 */
const STYLES: Record<CallType, string> = {
  audition: 'bg-[#0F172A] text-white',
  competition: 'bg-[#B91C1C] text-white',
  event: 'bg-[#1D4ED8] text-white',
  residency: 'bg-[#047857] text-white',
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
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${STYLES[callType]}`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide shadow-xs whitespace-nowrap ${STYLES[callType]}`}
    >
      {label}
    </span>
  );
};
