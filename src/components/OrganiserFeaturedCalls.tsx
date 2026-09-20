import React from 'react';
import { ArrowRight, MapPin, Calendar, Users, IndianRupee, ExternalLink } from 'lucide-react';
import { KalaStar } from './KalaLogo';
import { Opportunity } from '../types';

interface OrganiserFeaturedCallsProps {
  opportunities: Opportunity[];
  onReviewOpportunityApplicants: (opp: Opportunity) => void;
  onViewOpportunityDetails: (opp: Opportunity) => void;
  onViewAll: () => void;
}

export const OrganiserFeaturedCalls: React.FC<OrganiserFeaturedCallsProps> = ({
  opportunities,
  onReviewOpportunityApplicants,
  onViewOpportunityDetails,
  onViewAll,
}) => {
  const featured = opportunities.slice(0, 3);

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
              Active Production Calls & Casting
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Real-time applicant pipelines, scheduled auditions, and stage programming.
          </p>
        </div>

        <button
          onClick={onViewAll}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#E45826] hover:text-[#C73E0E] transition-colors self-start sm:self-auto cursor-pointer"
        >
          <span>View All Calls</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {featured.map((opp) => (
          <div
            key={opp.id}
            className="group bg-white rounded-2xl overflow-hidden border border-[#EDE8E0] shadow-2xs hover:shadow-md hover:border-[#E0D7CB] transition-all flex flex-col justify-between"
          >
            <div>
              {/* Image & Badges */}
              <div
                className="relative aspect-[16/9] overflow-hidden cursor-pointer"
                onClick={() => onViewOpportunityDetails(opp)}
              >
                <img
                  src={opp.imageUrl}
                  alt={opp.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-xs ${getCategoryBadgeStyle(
                      opp.category
                    )}`}
                  >
                    {opp.category}
                  </span>
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/95 text-zinc-900 border border-zinc-200/60 shadow-xs backdrop-blur-xs flex items-center gap-1">
                    <Users className="w-3 h-3 text-[#E45826]" />
                    {opp.applicantCount || 0} Submissions
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5">
                <h3
                  onClick={() => onViewOpportunityDetails(opp)}
                  className="text-base font-bold text-zinc-900 line-clamp-1 group-hover:text-[#E45826] transition-colors cursor-pointer"
                >
                  {opp.title}
                </h3>
                <div className="flex items-center gap-1.5 text-zinc-500 text-xs mt-2.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{opp.location}</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500 text-xs mt-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>{opp.dateRange}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-2 flex items-center justify-between border-t border-zinc-100 mt-auto">
              <div>
                <span className="text-xs text-zinc-400 block font-medium">Commission</span>
                <span className="text-sm font-bold text-[#E45826]">
                  {opp.compensation}
                </span>
              </div>
              <button
                onClick={() => onReviewOpportunityApplicants(opp)}
                className="px-4 py-2 rounded-full bg-[#E45826] hover:bg-[#D44716] active:scale-95 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Review ({opp.applicantCount || 0})</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
