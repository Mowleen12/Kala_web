import React from 'react';
import { 
  ArrowRight, 
  Building2, 
  FileText, 
  Users, 
  CheckCircle2, 
  Calendar, 
  Plus, 
  Search
} from 'lucide-react';
import { OrganiserStats, OrganiserProfile } from '../types';
import { KalaStar } from './KalaLogo';

interface OrganiserDashboardWidgetProps {
  stats: OrganiserStats;
  profile: OrganiserProfile;
  onPostOpportunity: () => void;
  onReviewApplicants: () => void;
  onScoutTalent: () => void;
  onViewListings: () => void;
  onViewProfile: () => void;
}

export const OrganiserDashboardWidget: React.FC<OrganiserDashboardWidgetProps> = ({
  stats,
  profile,
  onPostOpportunity,
  onReviewApplicants,
  onScoutTalent,
  onViewListings,
  onViewProfile,
}) => {
  return (
    <div className="space-y-5">
      {/* Primary Dashboard Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EDE8E0] shadow-xs">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <h3 className="text-base font-bold text-zinc-900 tracking-tight">
            Organiser Hub
          </h3>
          <button
            onClick={onViewListings}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#E45826] hover:text-[#C73E0E] transition-colors cursor-pointer"
          >
            <span>All Calls</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Institution Info */}
        <div 
          onClick={onViewProfile}
          className="flex items-center gap-3 pt-4 pb-4 cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-2xl bg-zinc-900 overflow-hidden ring-2 ring-[#FCEEE3] shrink-0">
            <img 
              src={profile.logo} 
              alt={profile.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-zinc-900 truncate group-hover:text-[#E45826] transition-colors">
                NCPA Mumbai
              </h4>
              {profile.verified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 fill-blue-50" />
              )}
            </div>
            <p className="text-xs text-zinc-500 truncate mt-0.5">
              Cultural Institution • Nariman Point
            </p>
          </div>
        </div>

        {/* 4 Stat Metrics Grid */}
        <div className="grid grid-cols-4 gap-2 text-center py-2">
          {/* Active Calls */}
          <div 
            onClick={onViewListings}
            className="bg-white p-2.5 rounded-xl border border-zinc-100 shadow-2xs hover:border-[#E45826]/30 cursor-pointer transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 mx-auto text-[#E45826] mb-1" />
            <div className="text-base font-extrabold text-zinc-900 leading-tight">
              {stats.activeListings}
            </div>
            <div className="text-[10px] text-zinc-500 font-medium mt-0.5">
              Active Calls
            </div>
          </div>

          {/* Total Applicants */}
          <div 
            onClick={onReviewApplicants}
            className="bg-white p-2.5 rounded-xl border border-zinc-100 shadow-2xs hover:border-[#E45826]/30 cursor-pointer transition-colors"
          >
            <Users className="w-3.5 h-3.5 mx-auto text-zinc-400 mb-1" />
            <div className="text-base font-extrabold text-zinc-900 leading-tight">
              {stats.totalApplicants}
            </div>
            <div className="text-[10px] text-zinc-500 font-medium mt-0.5">
              Total Submissions
            </div>
          </div>

          {/* Under Review */}
          <div 
            onClick={onReviewApplicants}
            className="bg-white p-2.5 rounded-xl border border-zinc-100 shadow-2xs hover:border-[#E45826]/30 cursor-pointer transition-colors"
          >
            <FileText className="w-3.5 h-3.5 mx-auto text-[#E45826] mb-1" />
            <div className="text-base font-extrabold text-zinc-900 leading-tight">
              {stats.underReview}
            </div>
            <div className="text-[10px] text-zinc-500 font-medium mt-0.5">
              In Review
            </div>
          </div>

          {/* Shortlisted / Auditions */}
          <div 
            onClick={onReviewApplicants}
            className="bg-white p-2.5 rounded-xl border border-zinc-100 shadow-2xs hover:border-[#E45826]/30 cursor-pointer transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mx-auto text-emerald-500 mb-1" />
            <div className="text-base font-extrabold text-zinc-900 leading-tight">
              {stats.interviewScheduled}
            </div>
            <div className="text-[10px] text-zinc-500 font-medium mt-0.5">
              Auditions
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-5 pt-4 border-t border-zinc-100">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-3">
            Curator Actions
          </span>
          <div className="space-y-2.5">
            <button
              id="org-qa-post-opportunity"
              onClick={onPostOpportunity}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#E45826] hover:bg-[#D44716] active:scale-98 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" />
                Post New Audition / Call
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              id="org-qa-review-pipeline"
              onClick={onReviewApplicants}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-50 active:scale-98 text-zinc-800 text-xs font-semibold border border-[#E2DDD3] shadow-2xs transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                Review Talent Pipeline ({stats.underReview} pending)
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            <button
              id="org-qa-scout-artists"
              onClick={onScoutTalent}
              className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFE7] active:scale-98 text-zinc-700 text-xs font-semibold border border-[#EBE5DA] transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-zinc-500" />
                Direct Talent Scout
              </span>
              <KalaStar size={12} className="text-[#E45826]" />
            </button>
          </div>
        </div>
      </div>

      {/* Inspirational Organiser Promo Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FDF0E9] via-[#FBE5DA] to-[#F7D8C8] p-6 text-zinc-900 shadow-xs border border-[#F3D5C3]">
        <div className="relative z-10">
          <h4 className="text-base font-bold leading-snug mb-2 text-zinc-950">
            Stage the future of Indian performance.
          </h4>
          <p className="text-sm text-zinc-600 leading-relaxed">
            Directly invite verified vocalists, dancers, and visual artists with proven portfolios to your prestigious season.
          </p>
          <button
            onClick={onScoutTalent}
            className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#E45826] hover:text-[#C73E0E] transition-colors cursor-pointer"
          >
            <span>Browse 12,400+ artists</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
