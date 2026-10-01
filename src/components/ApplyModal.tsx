import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, MapPin, Calendar, CheckCircle2, Link2, Sparkles } from 'lucide-react';
import { Opportunity } from '../types';
import { MediaUploader } from './MediaUploader';
import { getDraft, setDraft, clearDraft } from '../lib/drafts';
import { isLocalMediaUrl, resolveMediaUrl } from '../lib/localMedia';

interface ApplyDraft {
  portfolioUrl?: string;
  statement?: string;
  mediaUrl?: string;
}

const applyDraftKey = (oppId: string) => `kala_draft_apply_${oppId}`;

interface ApplyModalProps {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitApplication: (opp: Opportunity, appData: any) => void;
  userName?: string;
  userEmail?: string;
}

export const ApplyModal: React.FC<ApplyModalProps> = ({
  opportunity,
  isOpen,
  onClose,
  onSubmitApplication,
  userName = "Mowleen",
  userEmail = "mowleen2006@gmail.com",
}) => {
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [statement, setStatement] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'video' | 'image' | 'auto'>('auto');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restore a saved draft when this opportunity's form opens...
  useEffect(() => {
    if (!isOpen || !opportunity) return;
    // Read synchronously so the save effect below can't clobber the stored
    // draft before we have it; resolve any stored media ref afterwards.
    const draft = getDraft<ApplyDraft>(applyDraftKey(opportunity.id));
    setPortfolioUrl(draft?.portfolioUrl ?? '');
    setStatement(draft?.statement ?? '');
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
  }, [isOpen, opportunity?.id]);

  // ...and keep it saved while the artist types, so work survives
  // logout/login and reloads. Cleared on submit below. setDraft swaps live
  // blob: previews for their stable IndexedDB refs automatically.
  useEffect(() => {
    if (!isOpen || !opportunity) return;
    setDraft(applyDraftKey(opportunity.id), {
      portfolioUrl,
      statement,
      mediaUrl,
    });
  }, [isOpen, opportunity?.id, portfolioUrl, statement, mediaUrl]);

  if (!isOpen || !opportunity) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onSubmitApplication(opportunity, {
        portfolioUrl: portfolioUrl || (mediaUrl ? mediaUrl : 'https://instagram.com/mowleen.creates'),
        statement,
        reelUrl: mediaUrl || undefined,
        fileName: mediaUrl ? 'audition_reel_cloudinary' : 'portfolio_reel.mp4',
      });
      clearDraft(applyDraftKey(opportunity.id));
      onClose();
    }, 400);
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
                <p className="text-[11px] text-zinc-500">{userEmail} • Verified Artist</p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </span>
            </div>
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

