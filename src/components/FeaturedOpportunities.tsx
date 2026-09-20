import React from 'react';
import { ArrowRight, MapPin, Calendar } from 'lucide-react';
import { KalaStar } from './KalaLogo';
import { Opportunity } from '../types';

interface FeaturedOpportunitiesProps {
  opportunities: Opportunity[];
  onApply: (opp: Opportunity) => void;
  onViewDetails: (opp: Opportunity) => void;
  onViewAll: () => void;
}

export const FeaturedOpportunities: React.FC<FeaturedOpportunitiesProps> = ({
  opportunities,
  onApply,
  onViewDetails,
  onViewAll,
}) => {
  const getCategoryBadgeStyle = (category: string) => {
    switch (category) {
      case 'Music & Dance':
        return 'bg-[#E03A67] text-white';
      case 'Film & Photography':
        return 'bg-[#9333EA] text-white';
      case 'Visual Arts':
        return 'bg-[#EA580C] text-white';
      case 'Theatre & Performance':
        return 'bg-[#D97706] text-white';
      default:
        return 'bg-[#E45826] text-white';
    }
  };

  return (
    <section className="mb-10">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <KalaStar size={18} className="text-[#E45826]" />
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Featured Opportunities
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Live events, auditions, and programs tailored for you.
          </p>
        </div>

        <button
          id="view-all-featured-btn"
          onClick={onViewAll}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#E45826] hover:text-[#C73E0E] transition-colors self-start sm:self-auto cursor-pointer"
        >
          <span>View All</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {opportunities.slice(0, 3).map((opp) => (
          <div
            key={opp.id}
            id={`opp-card-${opp.id}`}
            className="group bg-white rounded-2xl overflow-hidden border border-[#EDE8E0] shadow-2xs hover:shadow-md hover:border-[#E0D7CB] transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              {/* Card Image Banner with Badges */}
              <div 
                className="relative aspect-[16/9] overflow-hidden cursor-pointer"
                onClick={() => onViewDetails(opp)}
              >
                <img
                  src={opp.imageUrl}
                  alt={opp.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                />
                
                {/* Overlay Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide shadow-xs ${getCategoryBadgeStyle(opp.category)}`}>
                    {opp.category}
                  </span>
                </div>

                <div className="absolute top-3 right-3">
                  {opp.statusBadge.variant === 'countdown' ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-900/90 text-white backdrop-blur-xs shadow-xs">
                      {opp.statusBadge.label}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#16A34A] text-white shadow-xs">
                      {opp.statusBadge.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Content Body */}
              <div className="p-4 sm:p-5">
                <h3 
                  onClick={() => onViewDetails(opp)}
                  className="text-base font-bold text-zinc-900 line-clamp-1 group-hover:text-[#E45826] transition-colors cursor-pointer"
                >
                  {opp.title}
                </h3>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-zinc-500 text-xs mt-2.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{opp.location}</span>
                </div>

                {/* Date Range */}
                <div className="flex items-center gap-1.5 text-zinc-500 text-xs mt-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>{opp.dateRange}</span>
                </div>
              </div>
            </div>

            {/* Card Footer with Price & CTA */}
            <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2 flex items-center justify-between border-t border-zinc-100 mt-auto">
              <div>
                <span className="text-sm font-bold text-[#E45826]">
                  {opp.compensation}
                </span>
              </div>

              <button
                id={`apply-btn-${opp.id}`}
                onClick={() => onApply(opp)}
                className="px-4 py-1.5 rounded-full bg-[#E45826] hover:bg-[#D44716] active:scale-95 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                Apply Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
