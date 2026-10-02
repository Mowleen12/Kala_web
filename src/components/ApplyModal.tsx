import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, MapPin, Calendar, Link2, Sparkles, AlertCircle } from 'lucide-react';
import { Opportunity } from '../types';
import { MediaUploader } from './MediaUploader';
import { getDraft, setDraft, clearDraft } from '../lib/drafts';
import { isLocalMediaUrl, resolveMediaUrl } from '../lib/localMedia';
import { loadProfileSkills, loadProfileText } from '../lib/profile';

interface ApplyDraft {
  portfolioUrl?: string;
  statement?: string;
  mediaUrl?: string;
  experienceYears?: string;
  skills?: string;
  city?: string;
}

export interface ApplyFormData {
  portfolioUrl?: string | null;
  statement?: string;
  reelUrl?: string | null;
  fileName?: string | null;
  experienceYears?: number;
  skills?: string[];
  city?: string;
}

const applyDraftKey = (oppId: string) => `kala_draft_apply_${oppId}`;

interface ApplyModalProps {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitApplication: (
    opp: Opportunity,
    appData: ApplyFormData
  ) => Promise<{ ok: boolean; error?: string }>;
  userName: string;
  userEmail: string;
  profileKey: string;
}

export const ApplyModal: React.FC<ApplyModalProps> = ({
  opportunity,
  isOpen,
  onClose,
  onSubmitApplication,
  userName,
  userEmail,
  profileKey,
}) => {
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [statement, setStatement] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'video' | 'image' | 'auto'>('auto');
  const [experienceYears, setExperienceYears] = useState('');
  const [skills, setSkills] = useState('');
  const [city, setCity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Restore a saved draft when this opportunity's form opens...
  useEffect(() => {
    if (!isOpen || !opportunity) return;
    // Read synchronously so the save effect below can't clobber the stored
    // draft before we have it; resolve any stored media ref afterwards.
    const draft = getDraft<ApplyDraft>(applyDraftKey(opportunity.id));
    const profile = loadProfileText(profileKey);
    const profileSkills = loadProfileSkills(profileKey);
    setPortfolioUrl(draft?.portfolioUrl ?? '');
    setStatement(draft?.statement ?? '');
    setExperienceYears(draft?.experienceYears ?? '');
    setSkills(draft?.skills ?? (profileSkills.length ? profileSkills.join(', ') : ''));
    setCity(draft?.city ?? profile.location ?? '');
    setSubmitError(null);
    const draftMedia = draft?.mediaUrl ?? '';
    if (!isLocalMediaUrl(draftMedia)) {
      setMediaUrl(draftMedia);
      return;
    }
    let alive = true;
    resolveMediaUrl(draftMedia).then((resolved) => {
      if (alive) setMediaUrl((resolved as string) || '');
    });
    return () => {
      alive = false;
    };
  }, [isOpen, opportunity?.id, profileKey]);

  // ...and keep it saved while the artist types, so work survives
  // logout/login and reloads. Cleared on submit below. setDraft swaps live
  // blob: previews for their stable IndexedDB refs automatically.
  useEffect(() => {
    if (!isOpen || !opportunity) return;
    setDraft(applyDraftKey(opportunity.id), {
      portfolioUrl,
      statement,
      mediaUrl,
      experienceYears,
      skills,
      city,
    });
  }, [isOpen, opportunity?.id, portfolioUrl, statement, mediaUrl, experienceYears, skills, city]);

  if (!isOpen || !opportunity) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    const mediaName = mediaUrl ? mediaUrl.split('/').pop()?.split('?')[0] || 'upload' : null;
    const res = await onSubmitApplication(opportunity, {
      portfolioUrl: portfolioUrl || null,
      statement,
      reelUrl: mediaUrl || null,
      fileName: mediaName,
      experienceYears: experienceYears.trim() ? Number(experienceYears) || undefined : undefined,
      skills: skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      city: city.trim() || undefined,
    });
    setIsSubmitting(false);
    if (res && res.ok === false) {
      setSubmitError(res.error || 'Your application could not be submitted. Please try again.');
      return;
    }
    clearDraft(applyDraftKey(opportunity.id));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#EDE7DE] my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Preview of Opportunity */}
        <div className="p-6 bg-[#FAF7F2] border-b border-[#EDE7DE]">
          <div className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E45826] text-white mb-2">
            {opportunity.category}
          </div>
          <h3 className="text-xl font-bold text-zinc-900 leading-tight">
            Apply to {opportunity.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 mt-2">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              {opportunity.venue}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              {opportunity.dateRange}
            </span>
            <span className="font-bold text-[#E45826]">
              {opportunity.compensation}
            </span>
          </div>
        </div>

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Applying as
            </label>
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-900">{userName}</p>
                <p className="text-[11px] text-zinc-500">{userEmail}</p>
              </div>
              <span className="text-[11px] font-semibold text-zinc-500 bg-white border border-zinc-200 px-2 py-0.5 rounded-md">
                Artist
              </span>
            </div>
          </div>

          {/* Real application fields — organisers filter and sort on these */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Years of Experience
              </label>
              <input
                type="number"
                min={0}
                max={70}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                placeholder="e.g. 4"
                className="w-full bg-[#FAF8F5] border border-[#E5E0D6] focus:border-[#E45826] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 outline-none transition-all shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai"
                className="w-full bg-[#FAF8F5] border border-[#E5E0D6] focus:border-[#E45826] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 outline-none transition-all shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              <span>Skills (comma-separated)</span>
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. Carnatic Vocals, Sitar, Live Improvisation"
              className="w-full bg-[#FAF8F5] border border-[#E5E0D6] focus:border-[#E45826] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 outline-none transition-all shadow-2xs"
            />
          </div>

          {/* Cloudinary Audition Video & Image Uploader */}
          <div>
            <MediaUploader
              label="Audition Video Reel or Work Sample"
              description="Upload your live performance video (MP4/MOV/WEBM) or artwork still (JPG/PNG)."
              folder="kala-auditions"
              resourceType="auto"
              value={mediaUrl}
              onChange={(url, res) => {
                setMediaUrl(url);
                if (res?.resourceType === 'video') setMediaType('video');
                else if (res?.resourceType === 'image') setMediaType('image');
              }}
              onRemove={() => setMediaUrl('')}
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mb-1">
              <Link2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>External Portfolio / Social Link (Optional)</span>
            </label>
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://instagram.com/your_handle or YouTube link"
              className="w-full bg-[#FAF8F5] border border-[#E5E0D6] focus:border-[#E45826] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 outline-none transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Artist Statement / Pitch for Curator (Optional)
            </label>
            <textarea
              rows={3}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Briefly introduce your creative focus and what excites you about this opportunity..."
              className="w-full bg-[#FAF8F5] border border-[#E5E0D6] focus:border-[#E45826] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 outline-none transition-all shadow-2xs resize-none"
            />
          </div>

          {submitError && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-6 rounded-full bg-[#E45826] hover:bg-[#D44716] active:scale-98 text-white text-sm font-semibold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

