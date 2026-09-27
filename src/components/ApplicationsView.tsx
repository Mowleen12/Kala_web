import React from 'react';
import { motion } from 'motion/react';
import { FileText, Calendar, MapPin, CheckCircle2, Clock, AlertCircle, MessageSquare, Play, ExternalLink } from 'lucide-react';
import { KalaStar } from './KalaLogo';
import { Application, Opportunity, Thread } from '../types';
import { isUnread } from '../lib/threads';
import { getOptimizedCloudinaryUrl } from '../lib/cloudinary';
import { isDirectMediaUrl, mediaKind, linkHost } from '../lib/media';

interface ApplicationsViewProps {
  applications: Application[];
  opportunities: Opportunity[];
  threads: Thread[];
  onOpenThread?: (opportunityId: string) => void;
  onExplore: () => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
  opportunities,
  threads,
  onOpenThread,
  onExplore,
}) => {
  const getStatusBadge = (status: Application['status']) => {
    switch (status) {
      case 'interview':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Interview Stage
          </span>
        );
      case 'selected':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Selected
          </span>
        );
      case 'submitted':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Application Received
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Not Selected
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600">
            Under Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <KalaStar size={20} className="text-[#E45826]" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
              My Applications & Auditions
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Track your proposals, auditions, and curator interview invitations.
          </p>
        </div>

        <button
          onClick={onExplore}
          className="px-5 py-2 rounded-full bg-[#E45826] hover:bg-[#D44716] active:scale-98 text-white text-xs font-semibold shadow-xs self-start sm:self-auto cursor-pointer"
        >
          Find More Opportunities
        </button>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {applications.map((app) => {
          const oppBanner = opportunities.find((o) => o.id === app.opportunityId)?.imageUrl;
          return (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EDE8E0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF2EB] text-[#E45826]">
                  {app.category}
                </span>
                <span className="text-xs text-zinc-400">
                  Applied on {app.appliedDate}
                </span>
              </div>

              <div className="flex items-start gap-3.5">
                {oppBanner && (
                  <img
                    src={oppBanner}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                  />
                )}
                <div className="space-y-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900">
                    {app.opportunityTitle}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      {app.location}
                    </span>
                    <span className="font-bold text-[#E45826]">
                      {app.compensation}
                    </span>
                  </div>
                </div>
              </div>

              {app.mediaUrl && (
                <div className="pt-1">
                  {isDirectMediaUrl(app.mediaUrl) ? (
                    mediaKind(app.mediaUrl) === 'image' ? (
                      <img
                        src={getOptimizedCloudinaryUrl(app.mediaUrl, { width: 400, quality: 'auto' })}
                        alt="Your submitted work"
                        className="w-full max-w-xs h-28 rounded-xl object-cover"
                      />
                    ) : mediaKind(app.mediaUrl) === 'audio' ? (
                      <audio controls preload="metadata" src={app.mediaUrl} className="w-full max-w-xs" />
                    ) : (
                      <video
                        controls
                        preload="metadata"
                        src={getOptimizedCloudinaryUrl(app.mediaUrl, { width: 640, quality: 'auto' })}
                        className="w-full max-w-xs h-28 rounded-xl bg-black object-contain"
                      />
                    )
                  ) : (
                    <a
                      href={app.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF2EB] border border-[#FAD7C8] text-[#E45826] text-[11px] font-bold hover:bg-[#FCE4D9] transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Submitted reel</span>
                      <span className="text-zinc-400 font-medium">{linkHost(app.mediaUrl)}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
              {(() => {
                const thread = threads.find((t) => t.opportunityId === app.opportunityId);
                const unread = thread ? isUnread(thread, 'artist') : false;
                return (
                  <button
                    onClick={() => onOpenThread?.(app.opportunityId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FDEEE7] border border-[#FAD7C8] text-[#E45826] text-[11px] font-bold hover:bg-[#FCE4D9] transition-colors cursor-pointer shrink-0"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Messages</span>
                    {unread && <span className="w-2 h-2 rounded-full bg-[#E45826] animate-pulse" />}
                  </button>
                );
              })()}
              <div>{getStatusBadge(app.status)}</div>
              <span className="text-[11px] text-zinc-400">
                ID: {app.id.toUpperCase()}
              </span>
            </div>
          </motion.div>
          );
        })}
      </div>
    </div>
  );
};
