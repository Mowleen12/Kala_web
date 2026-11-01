import React from 'react';

/**
 * Load-time placeholders that mirror the real layouts. A lone spinner makes the
 * page snap into a different shape when data lands; these keep the space
 * reserved so nothing jumps (CLS stays near zero).
 */

export const OpportunityCardSkeleton: React.FC = () => (
  <div
    aria-hidden="true"
    className="bg-white rounded-2xl overflow-hidden border border-[#EDE8E0] shadow-2xs animate-pulse"
  >
    <div className="aspect-[16/9] bg-[#F1EBE3]" />
    <div className="p-4 sm:p-5 space-y-3">
      <div className="h-4 w-3/4 rounded bg-[#F1EBE3]" />
      <div className="h-3 w-1/2 rounded bg-[#F5F0E9]" />
      <div className="h-3 w-1/3 rounded bg-[#F5F0E9]" />
      <div className="pt-3 flex items-center justify-between border-t border-zinc-100">
        <div className="h-4 w-20 rounded bg-[#F1EBE3]" />
        <div className="h-7 w-24 rounded-full bg-[#F1EBE3]" />
      </div>
    </div>
  </div>
);

export const WorkspaceSkeleton: React.FC = () => (
  <div className="space-y-6" aria-busy="true" aria-live="polite">
    <span className="sr-only">Loading your workspace</span>
    {/* Page heading */}
    <div className="space-y-2 animate-pulse">
      <div className="h-6 w-56 rounded bg-[#EDE6DC]" />
      <div className="h-3 w-80 rounded bg-[#F2ECE3]" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <OpportunityCardSkeleton key={i} />
      ))}
    </div>
  </div>
);
