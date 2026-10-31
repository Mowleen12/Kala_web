import React from 'react';

const bgColorMap: Record<string, string> = {
  'Music & Dance': 'bg-[#E03A67] text-white',
  'Film & Photography': 'bg-[#9333EA] text-white',
  'Visual Arts': 'bg-[#EA580C] text-white',
  'Theatre & Performance': 'bg-[#D97706] text-white',
  'Writing & Content': 'bg-[#3B82F6] text-white',
  'Design & Fashion': 'bg-[#D946EF] text-white',
  'College Societies & Clubs': 'bg-[#F43F5E] text-white',
};

export const CategoryBadge = ({ category }: { category: string }) => {
  const cls = bgColorMap[category] || 'bg-[#E45826] text-white';

  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-xs whitespace-nowrap ${cls}`}>
      {category}
    </span>
  );
};