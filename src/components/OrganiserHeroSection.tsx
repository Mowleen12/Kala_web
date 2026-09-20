import React from 'react';
import { Plus, Users, ArrowRight } from 'lucide-react';
import { KalaStar } from './KalaLogo';

interface OrganiserHeroSectionProps {
  onPostOpportunity: () => void;
  onReviewApplicants: () => void;
}

export const OrganiserHeroSection: React.FC<OrganiserHeroSectionProps> = ({
  onPostOpportunity,
  onReviewApplicants,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-transparent pb-6 pt-2">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Typography & CTA Column */}
        <div className="lg:col-span-6 z-10">
          {/* Organiser Badge Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FDEEE7] border border-[#FAD7C8] mb-4">
            <KalaStar size={16} className="text-[#E45826]" />
            <span className="text-xs font-bold text-[#E45826] tracking-wider uppercase">
              Organiser & Curator Portal
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[46px] font-extrabold text-zinc-950 tracking-tight leading-[1.12] mb-5">
            Where India’s<br />
            cultural venues<br />
            curate exceptional <span className="text-[#E45826]">talent</span>,<br />
            not just credentials.
          </h1>

          {/* Subtitle */}
          <p className="text-[15px] sm:text-base text-zinc-600 leading-relaxed max-w-md mb-8">
            Publish open calls, listen to verified reels, run structured auditions, and commission India’s next generation of performers and creators.
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
              <span>Review Applicants (19 New)</span>
            </button>
          </div>
        </div>

        {/* Right Dynamic Artistic Collage with Doodle Accents */}
        <div className="lg:col-span-6 relative flex justify-center lg:justify-end">
          {/* Organic Orange Doodle Vector Strokes */}
          <svg
            className="absolute -top-6 -left-6 w-full h-full pointer-events-none z-0 text-[#E45826]/75"
            viewBox="0 0 500 450"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 50 180 C 20 120, 10 300, 120 260 C 240 220, 200 40, 360 45 C 440 48, 480 90, 470 140 C 450 250, 300 420, 180 390 C 80 370, 70 280, 120 260"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>

          {/* 4-Image Grid Cluster */}
          <div className="grid grid-cols-2 gap-3.5 max-w-[460px] w-full relative z-10">
            {/* Top-Left: Grand Auditorium with Handwritten Overlay */}
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-md group">
              <img
                src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=650&q=80"
                alt="Auditorium lighting"
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-3.5">
                <span className="font-script text-white text-xl sm:text-2xl font-bold leading-tight drop-shadow-md transform -rotate-3 select-none">
                  Discover<br />
                  Curate<br />
                  Produce
                </span>
              </div>
            </div>

            {/* Top-Right: Sound Engineer & Producer Mixing Console */}
            <div className="rounded-2xl overflow-hidden aspect-[4/3] shadow-md group">
              <img
                src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=650&q=80"
                alt="Studio sound mixing"
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Bottom-Left: Art Gallery Curatorial Space */}
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-md group bg-[#FCEEE7] flex items-center justify-center p-3 text-center border border-[#F6D7C8]">
              <div className="absolute inset-0 bg-radial from-[#E45826]/20 via-[#FCEEE7]/90 to-[#FCEEE7]" />
              <div className="relative z-10">
                <p className="font-script text-[#E45826] text-xl sm:text-2xl font-bold tracking-wide">
                  open stage ✦
                </p>
                <p className="font-script text-[#C73E0E] text-xl sm:text-2xl font-bold tracking-wide mt-0.5">
                  exceptional craft
                </p>
              </div>
            </div>

            {/* Bottom-Right: Rehearsal & Theatre Ensemble */}
            <div className="rounded-2xl overflow-hidden aspect-[4/3] shadow-md group">
              <img
                src="https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=650&q=80"
                alt="Theatre and dance rehearsal"
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
