import React from 'react';
import { motion } from 'motion/react';
import { Plus, Users } from 'lucide-react';
import { KalaStar } from './KalaLogo';
import { Opportunity } from '../types';
import { daysUntil } from '../lib/listings';

interface OrganiserHeroSectionProps {
  onPostOpportunity: () => void;
  onReviewApplicants: () => void;
  activeCalls: number;
  totalApplicants: number;
  underReview: number;
  latest: Opportunity | null;
}

const deadlineLabel = (deadline?: string | null): string => {
  const days = daysUntil(deadline);
  if (days === null) return 'Open call';
  if (days < 0) return 'Deadline passed';
  if (days === 0) return 'Closes today';
  return `Closes in ${days} day${days === 1 ? '' : 's'}`;
};

export const OrganiserHeroSection: React.FC<OrganiserHeroSectionProps> = ({
  onPostOpportunity,
  onReviewApplicants,
  activeCalls,
  totalApplicants,
  underReview,
  latest,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-transparent pb-6 pt-2">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Typography & CTA Column */}
        <div className={`z-10 ${latest ? 'lg:col-span-6' : 'lg:col-span-12'}`}>
          {/* Organiser Badge Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FDEEE7] border border-[#FAD7C8] mb-4">
            <KalaStar size={16} className="text-[#E45826]" />
            <span className="text-xs font-bold text-[#E45826] tracking-wider uppercase">
              Organiser & Curator Portal
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-extrabold text-zinc-950 tracking-tight leading-[1.12] mb-5 max-w-[560px]">
            Where India’s venues curate <span className="text-[#E45826]">talent</span>, not credentials.
          </h1>

          {/* Subtitle */}
          <p className="text-[15px] sm:text-base text-zinc-600 leading-relaxed max-w-md mb-8">
            Publish open calls, listen to reels, run structured auditions, and commission India’s next generation of performers and creators.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3.5">
            <button
              id="org-hero-post-btn"
              onClick={onPostOpportunity}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#E45826] text-white text-sm font-semibold shadow-sm hover:bg-[#D44716] active:scale-98 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Post Open Call</span>
            </button>
            <button
              id="org-hero-review-btn"
              onClick={onReviewApplicants}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-zinc-800 text-sm font-semibold border border-[#DCD6CC] shadow-2xs hover:bg-[#F9F7F4] hover:border-zinc-400 active:scale-98 transition-all cursor-pointer"
            >
              <Users className="w-4 h-4 text-zinc-600" />
              <span>
                Review Applicants
                {underReview > 0 ? ` (${underReview} New)` : ''}
              </span>
            </button>
          </div>

          {/* Real counts strip */}
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-zinc-500">
            <span><strong className="text-zinc-900">{activeCalls}</strong> active call{activeCalls === 1 ? '' : 's'}</span>
            <span><strong className="text-zinc-900">{totalApplicants}</strong> applicant{totalApplicants === 1 ? '' : 's'} received</span>
          </div>
        </div>

        {/* Right: live preview of the organiser's latest call — hidden until one exists */}
        {latest && (
          <div className="lg:col-span-6 relative flex justify-center lg:justify-end">
            {/* Organic Orange Doodle Vector Strokes */}
            <motion.svg
              className="absolute -top-6 -left-6 w-full h-full pointer-events-none z-0 text-[#E45826]/40"
              viewBox="0 0 500 450"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              animate={{ rotate: [0, 2.5, -2.5, 0] }}
              transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
            >
              <path
                d="M 50 180 C 20 120, 10 300, 120 260 C 240 220, 200 40, 360 45 C 440 48, 480 90, 470 140 C 450 250, 300 420, 180 390 C 80 370, 70 280, 120 260"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </motion.svg>

            <div className="relative w-full max-w-[440px] z-10 py-4">
              <motion.div
                className="rounded-2xl bg-white border border-[#EDE8E0] shadow-md p-4 sm:p-5"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-[#E45826]">Open Call</span>
                  <span className="text-xs text-zinc-500">{deadlineLabel(latest.deadline)}</span>
                </div>
                <p className="font-bold text-zinc-900 text-[15px] leading-snug">{latest.title}</p>
                <div className="mt-3.5 flex items-center justify-between gap-2.5">
                  <div className="h-1.5 flex-1 rounded-full bg-[#F3E3D5] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#E45826]"
                      style={{ width: `${Math.min(100, Math.max(8, (latest.applicantCount || 0) * 8))}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-zinc-600">
                    {latest.applicantCount || 0} applicant{(latest.applicantCount || 0) === 1 ? '' : 's'}
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
