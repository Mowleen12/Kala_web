import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { PartyPopper, ArrowRight, X, Calendar } from 'lucide-react';
import { SelectionNotice } from '../lib/notifications';
import { KalaStar } from './KalaLogo';

interface SelectionNoticeModalProps {
  notice: SelectionNotice | null;
  artistName?: string;
  organiserName?: string;
  onDismiss: () => void;
  onViewApplications: () => void;
}

/**
 * One-time congratulations card for an artist whose status moved to "selected"
 * (or an audition invitation). Shown until acknowledged, then remembered by
 * markStatusSeen so it never reappears for the same outcome.
 */
export const SelectionNoticeModal: React.FC<SelectionNoticeModalProps> = ({
  notice,
  artistName = '',
  organiserName = '',
  onDismiss,
  onViewApplications,
}) => {
  useEffect(() => {
    if (!notice) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [notice, onDismiss]);

  if (!notice) return null;

  const selected = notice.kind === 'selected';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="selection-notice-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#F3D5C3]"
      >
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/85 hover:bg-zinc-100 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Celebration header */}
        <div className="relative bg-gradient-to-br from-[#FFF1E8] via-[#FDE7D8] to-[#FBD8C2] px-6 pt-9 pb-7 text-center overflow-hidden">
          <div className="absolute -top-10 -right-8 w-32 h-32 rounded-full bg-white/40 blur-2xl pointer-events-none" />
          <motion.div
            initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 16 }}
            className="relative w-16 h-16 mx-auto rounded-2xl bg-white text-[#E45826] flex items-center justify-center shadow-sm mb-4"
          >
            {selected ? <PartyPopper className="w-8 h-8" /> : <Calendar className="w-8 h-8" />}
          </motion.div>
          <h2
            id="selection-notice-title"
            className="relative text-2xl font-extrabold text-zinc-950 tracking-tight"
          >
            {selected ? 'Congratulations' : 'Audition invitation'}
            {artistName ? `, ${artistName.split(' ')[0]}` : ''}!
          </h2>
          <p className="relative text-sm text-zinc-700 mt-2 leading-relaxed">
            {selected
              ? 'You have been selected for a commissioned performance.'
              : 'An organiser would like to see you audition for this call.'}
          </p>
        </div>

        {/* Details */}
        <div className="px-6 py-6 space-y-4">
          <div className="rounded-2xl border border-[#F0EAE1] bg-[#FAF8F5] p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#E45826] mb-1">
              <KalaStar size={12} className="text-[#E45826]" />
              <span>{selected ? 'Commissioned for' : 'Audition for'}</span>
            </div>
            <p className="text-sm font-bold text-zinc-900 leading-snug">
              {notice.opportunityTitle}
            </p>
            {organiserName && (
              <p className="text-xs text-zinc-500 mt-1">{organiserName}</p>
            )}
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed">
            {selected
              ? 'Check your messages — the organiser will share the schedule, fee confirmation, and next steps there.'
              : 'Open the application to confirm your availability, then reply to the organiser in messages.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              onClick={onViewApplications}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#E45826] hover:bg-[#D44716] active:scale-98 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span>View my applications</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDismiss}
              className="px-5 py-2.5 rounded-full bg-white border border-[#E2DBD0] hover:bg-[#FAF8F5] text-zinc-700 text-xs font-semibold transition-all cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
