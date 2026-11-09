import React from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  Globe, 
  Mail, 
  Phone, 
  Instagram, 
  Youtube, 
  GraduationCap, 
  Calendar, 
  CheckCircle2, 
  Award,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Opportunity, OrganiserProfile } from '../types';
import { CallTypeBadge } from './CallTypeBadge';

interface OrganizerPublicProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity?: Opportunity | null;
  allOpportunities?: Opportunity[];
  organizerProfile?: OrganiserProfile | null;
  organizerName?: string;
  organizerAvatar?: string | null;
  organizerType?: 'venue' | 'society' | null;
  collegeName?: string;
  opportunities?: Opportunity[];
  onSelectOpportunity?: (opp: Opportunity) => void;
  onApply?: (opp: Opportunity) => void;
  onViewDetails?: (opp: Opportunity) => void;
}

export const OrganizerPublicProfileModal: React.FC<OrganizerPublicProfileModalProps> = ({
  isOpen,
  onClose,
  opportunity,
  allOpportunities = [],
  organizerProfile,
  organizerName = 'Cultural Host',
  organizerAvatar,
  organizerType = 'venue',
  collegeName,
  opportunities = [],
  onSelectOpportunity,
  onApply,
  onViewDetails,
}) => {
  if (!isOpen) return null;

  const displayName =
    organizerProfile?.name ||
    opportunity?.organizer ||
    opportunity?.organiserName ||
    organizerName ||
    'Cultural Organisation';

  const displayAvatar =
    organizerProfile?.logo ||
    opportunity?.organiserAvatar ||
    organizerAvatar ||
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80';

  const displayCover =
    organizerProfile?.coverImage ||
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80';

  const displayCity = organizerProfile?.city || opportunity?.city || 'India';
  const displayAbout =
    organizerProfile?.about ||
    `${displayName} is a verified cultural host and arts organization on Kalā, providing stage opportunities, fellowships, residencies, and production commissions for emerging performing and visual artists.`;

  const displayCollege = organizerProfile?.collegeName || opportunity?.collegeName || collegeName;
  const isSociety =
    organizerType === 'society' ||
    opportunity?.organiserType === 'society' ||
    Boolean(displayCollege);

  // Filter events belonging to this organizer
  const effectiveOpportunities =
    opportunities.length > 0
      ? opportunities
      : allOpportunities.filter((o) => {
          if (opportunity?.organiserId && o.organiserId === opportunity.organiserId) return true;
          if (opportunity?.organizer && o.organizer === opportunity.organizer) return true;
          if (displayName && o.organizer === displayName) return true;
          return false;
        });
  const hostEvents = effectiveOpportunities;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#EDE8E0] overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Image Header */}
        <div className="relative h-44 sm:h-56 w-full bg-zinc-900 shrink-0">
          <img
            src={displayCover}
            alt={`${displayName} cover`}
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Type Badge on Cover */}
          <div className="absolute top-4 left-4 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/90 text-zinc-900 shadow-sm backdrop-blur-md">
              {isSociety ? <GraduationCap className="w-3.5 h-3.5 text-[#E45826]" /> : <Building2 className="w-3.5 h-3.5 text-[#E45826]" />}
              <span>{isSociety ? 'College Society & Club' : 'Cultural Venue & Host'}</span>
            </span>
          </div>

          {/* Organization Avatar Overlap */}
          <div className="absolute -bottom-10 left-6 sm:left-8 flex items-end gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-1 shadow-xl border-2 border-white overflow-hidden shrink-0">
              <img
                src={displayAvatar}
                alt={displayName}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto pt-12 p-6 sm:p-8 space-y-6">
          {/* Title & Verification */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EDE8E0] pb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
                  {displayName}
                </h2>
                <span title="Verified Cultural Organization">
                  <CheckCircle2 className="w-5 h-5 text-[#E45826] fill-[#FDEEE7]" />
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600 mt-1">
                {displayCollege && (
                  <span className="flex items-center gap-1 text-[#E45826] font-semibold">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {displayCollege}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  {displayCity}
                </span>
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Host Network
                </span>
              </div>
            </div>

            {/* Quick Contact Links */}
            <div className="flex items-center gap-2 pt-2 sm:pt-0">
              {organizerProfile?.website && (
                <a
                  href={organizerProfile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:text-[#E45826] hover:border-[#E45826] transition-colors"
                  title="Official Website"
                >
                  <Globe className="w-4 h-4" />
                </a>
              )}
              {organizerProfile?.instagram && (
                <a
                  href={organizerProfile.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:text-[#E45826] hover:border-[#E45826] transition-colors"
                  title="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {organizerProfile?.youtube && (
                <a
                  href={organizerProfile.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:text-[#E45826] hover:border-[#E45826] transition-colors"
                  title="YouTube Channel"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              )}
              {organizerProfile?.email && (
                <a
                  href={`mailto:${organizerProfile.email}`}
                  className="p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:text-[#E45826] hover:border-[#E45826] transition-colors"
                  title="Contact Email"
                >
                  <Mail className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* About / Curatorial Statement */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E45826]" />
              About Organization &amp; Curatorial Focus
            </h3>
            <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
              {displayAbout}
            </p>
          </div>

          {/* Focus Disciplines */}
          {organizerProfile?.focusDisciplines && organizerProfile.focusDisciplines.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Focus Disciplines
              </h3>
              <div className="flex flex-wrap gap-2">
                {organizerProfile.focusDisciplines.map((disc, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F5F2EC] text-zinc-800 border border-[#E5E0D8]"
                  >
                    {disc}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Organized Events & Competitions */}
          <div className="space-y-3 pt-4 border-t border-[#EDE8E0]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#E45826]" />
                Events &amp; Competitions by this Host ({hostEvents.length})
              </h3>
            </div>

            {hostEvents.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#FAF8F5] border border-dashed border-[#E0D9CE] text-center text-xs text-zinc-500">
                This organizer currently has no other active calls published.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hostEvents.map((opp) => (
                  <div
                    key={opp.id}
                    onClick={() => {
                      if (onSelectOpportunity) {
                        onSelectOpportunity(opp);
                        onClose();
                      }
                    }}
                    className="group p-3.5 rounded-2xl border border-[#EDE8E0] hover:border-[#E45826] bg-[#FAF8F5] hover:bg-white transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#E45826] bg-[#FDEEE7] px-2 py-0.5 rounded-md truncate">
                          {opp.category}
                        </span>
                        <CallTypeBadge callType={opp.callType} variant="inline" />
                      </div>
                      <h4 className="font-bold text-sm text-zinc-950 group-hover:text-[#E45826] transition-colors line-clamp-1">
                        {opp.title}
                      </h4>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500 mt-1">
                        <MapPin className="w-3 h-3 text-zinc-400" />
                        <span className="truncate">{opp.location || opp.city}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 pt-3 mt-3 border-t border-zinc-200/60">
                      <span className="text-emerald-700">{opp.compensation || 'Honorarium provided'}</span>
                      <span className="flex items-center gap-1 text-[#E45826] group-hover:translate-x-0.5 transition-transform text-[11px]">
                        View Details <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#EDE8E0] bg-[#FAF8F5] flex items-center justify-between text-xs text-zinc-500">
          <span>Official Host Profile • Kalā Verified Arts Network</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
