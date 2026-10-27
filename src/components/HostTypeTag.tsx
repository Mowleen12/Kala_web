import React from 'react';
import { OrganiserType } from '../types';

interface HostTypeTagProps {
  organiserType?: OrganiserType | null;
  variant?: 'card' | 'inline';
}

export const HostTypeTag: React.FC<HostTypeTagProps> = ({ organiserType, variant = 'card' }) => {
  const isSociety = organiserType === 'society';
  const label = isSociety ? 'College Society / Club' : 'Cultural / Commercial Host';
  const cls =
    variant === 'card'
      ? `px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-xs whitespace-nowrap ${
          isSociety ? 'bg-white text-[#E45826]' : 'bg-white text-zinc-600'
        }`
      : `inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
          isSociety
            ? 'bg-[#FDEEE7] text-[#E45826] border border-[#FAD7C8]'
            : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
        }`;
  return <span className={cls}>{label}</span>;
};
