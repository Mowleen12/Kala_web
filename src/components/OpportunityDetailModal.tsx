import React from 'react';
import { X, MapPin, Calendar, Building, CheckCircle2, ArrowRight } from 'lucide-react';
import { Opportunity } from '../types';

interface OpportunityDetailModalProps {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onApply: (opp: Opportunity) => void;
}

export const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  opportunity,
  isOpen,
  onClose,
  onApply,
}) => {
  if (!isOpen || !opportunity) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#EDE7DE] my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-zinc-100 text-zinc-700 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero Banner Image */}
        <div className="relative h-56 sm:h-64 overflow-hidden">
          <img
            src={opportunity.imageUrl}
            alt={opportunity.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          
          <div className="absolute bottom-4 left-6 right-6 text-white">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#E45826] mb-2">
              {opportunity.category}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {opportunity.title}
            </h2>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Key Facts Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EDE8E0]">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase">Location</div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 mt-1">
                <MapPin className="w-3.5 h-3.5 text-[#E45826]" />
                <span className="truncate">{opportunity.venue}</span>
              </div>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EDE8E0]">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase">Dates</div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 mt-1">
                <Calendar className="w-3.5 h-3.5 text-[#E45826]" />
                <span>{opportunity.dateRange}</span>
              </div>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EDE8E0]">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase">Stipend / Grant</div>
              <div className="text-xs font-extrabold text-[#E45826] mt-1">
                {opportunity.compensation}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-bold text-zinc-900 mb-2">About this opportunity</h4>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              {opportunity.description || "Join fellow creative peers and showcase your work to nationwide curators and industry veterans."}
            </p>
          </div>

          {/* Requirements */}
          {opportunity.requirements && opportunity.requirements.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-zinc-900 mb-2">Eligibility & Submission Criteria</h4>
              <ul className="space-y-2">
                {opportunity.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-zinc-600">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Organizer */}
          {opportunity.organizer && (
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center font-bold text-zinc-700">
                <Building className="w-5 h-5 text-zinc-500" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium">Presented by</p>
                <p className="text-sm font-bold text-zinc-900">{opportunity.organizer}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 bg-[#FAF8F5] border-t border-[#EDE7DE] flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-500 block">Total Compensation</span>
            <span className="text-base font-extrabold text-[#E45826]">{opportunity.compensation}</span>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-200/60 rounded-full transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={() => {
                onClose();
                onApply(opportunity);
              }}
              className="px-6 py-2.5 rounded-full bg-[#E45826] hover:bg-[#D44716] active:scale-95 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Apply Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
