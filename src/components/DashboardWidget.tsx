import React from 'react';
import { 
  ArrowRight, 
  Sun, 
  FileText, 
  Eye, 
  Star, 
  X, 
  Radio, 
  CalendarDays 
} from 'lucide-react';
import { UserStats } from '../types';

interface DashboardWidgetProps {
  stats: UserStats;
  userName?: string;
  onViewAll: () => void;
  onFindAuditions: () => void;
  onContinueApplications: () => void;
  onCompleteProfile: () => void;
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  stats,
  userName = '',
  onViewAll,
  onFindAuditions,
  onContinueApplications,
  onCompleteProfile,
}) => {
  return (
    <div className="space-y-5">
      {/* Primary Dashboard Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EDE8E0] shadow-xs">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <h3 className="text-base font-bold text-zinc-900 tracking-tight">
            Your Dashboard
          </h3>
          <button
            onClick={onViewAll}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#E45826] hover:text-[#C73E0E] transition-colors cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Morning Greeting */}
        <div className="flex items-start gap-3 pt-4 pb-4">
          <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-900">
              Good morning{userName ? `, ${userName}` : ''}
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Keep creating, keep moving.
            </p>
          </div>
        </div>

        {/* Profile Completion Bar */}
        <div 
          onClick={onCompleteProfile}
          className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#F0ECE4] cursor-pointer hover:border-[#E45826]/40 transition-colors mb-5"
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-zinc-700">Complete your profile</span>
            <span className="text-[#E45826] font-bold">{stats.profileCompletion}%</span>
          </div>
          <div className="w-full bg-[#EAE5DC] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#E45826] to-[#F97316] h-full rounded-full transition-all duration-700"
              style={{ width: `${stats.profileCompletion}%` }}
            />
          </div>
        </div>

        {/* 4 Stat Metrics Grid */}
        <div className="grid grid-cols-4 gap-2 text-center py-1">
          {/* Applications */}
          <div className="bg-white p-2.5 rounded-xl border border-zinc-100 shadow-2xs">
            <FileText className="w-3.5 h-3.5 mx-auto text-zinc-400 mb-1" />
            <div className="text-base font-extrabold text-zinc-900 leading-tight">
              {stats.applications}
            </div>
            <div className="text-[10px] text-zinc-500 font-medium mt-0.5">
              Applications
            </div>
          </div>

          {/* Interviews */}
          <div className="bg-white p-2.5 rounded-xl border border-zinc-100 shadow-2xs">
            <Eye className="w-3.5 h-3.5 mx-auto text-amber-500 mb-1" />
            <div className="text-base font-extrabold text-zinc-900 leading-tight">
              {stats.interviews}
            </div>
            <div className="text-[10px] text-zinc-500 font-medium mt-0.5">
              Interviews
            </div>
          </div>

          {/* Selected */}
          <div className="bg-white p-2.5 rounded-xl border border-zinc-100 shadow-2xs">
            <Star className="w-3.5 h-3.5 mx-auto text-emerald-500 mb-1" />
            <div className="text-base font-extrabold text-zinc-900 leading-tight">
              {stats.selected}
            </div>
            <div className="text-[10px] text-zinc-500 font-medium mt-0.5">
              Selected
            </div>
          </div>

          {/* Rejected */}
          <div className="bg-white p-2.5 rounded-xl border border-zinc-100 shadow-2xs">
            <X className="w-3.5 h-3.5 mx-auto text-rose-400 mb-1" />
            <div className="text-base font-extrabold text-zinc-900 leading-tight">
              {stats.rejected}
            </div>
            <div className="text-[10px] text-zinc-500 font-medium mt-0.5">
              Rejected
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-5 pt-4 border-t border-zinc-100">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-3">
            Quick Actions
          </span>
          <div className="space-y-2.5">
            <button
              id="qa-find-auditions"
              onClick={onFindAuditions}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#E45826] hover:bg-[#D44716] active:scale-98 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5" />
                Find Auditions
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              id="qa-continue-applications"
              onClick={onContinueApplications}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-50 active:scale-98 text-zinc-800 text-xs font-semibold border border-[#E2DDD3] shadow-2xs transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-zinc-500" />
                Continue Applications
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Warm Promo Card at Bottom of Right Column */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FDEFE7] via-[#FCEAE0] to-[#FCDED0] p-5 sm:p-6 border border-[#F3DEC9] shadow-xs flex items-center justify-between">
        <div className="z-10 max-w-[62%]">
          <h4 className="text-base sm:text-lg font-black text-zinc-900 leading-snug">
            Your art<br />matters.
          </h4>
          <p className="text-sm text-zinc-600 font-medium mt-1 mb-3 leading-snug">
            Find your people. Build your future.
          </p>
          <button
            id="promo-explore-btn"
            onClick={onFindAuditions}
            aria-label="Discover opportunities"
            className="w-8 h-8 rounded-full bg-white border border-[#E45826] text-[#E45826] flex items-center justify-center shadow-2xs hover:bg-[#FDEEE7] active:scale-95 transition-all cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Silhouette Image of Artist in Warm Light */}
        <div className="absolute right-0 bottom-0 top-0 w-36 pointer-events-none overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
            alt="Artist silhouette"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover object-center mix-blend-multiply opacity-85"
          />
        </div>
      </div>
    </div>
  );
};
