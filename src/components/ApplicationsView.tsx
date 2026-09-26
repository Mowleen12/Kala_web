import React from 'react';
import { FileText, Calendar, MapPin, CheckCircle2, Clock, AlertCircle, MessageSquare } from 'lucide-react';
import { KalaStar } from './KalaLogo';
import { Application, Thread } from '../types';
import { isUnread } from '../lib/threads';

interface ApplicationsViewProps {
  applications: Application[];
  threads: Thread[];
  onOpenThread?: (opportunityId: string) => void;
  onExplore: () => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
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
          className="px-5 py-2.5 rounded-full bg-[#E45826] hover:bg-[#D44716] active:scale-98 text-white text-xs font-semibold shadow-xs self-start sm:self-auto cursor-pointer"
        >
          Find More Opportunities
        </button>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {applications.map((app) => (
          <div
            key={app.id}
            className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EDE8E0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF2EB] text-[#E45826]">
                  {app.category}
                </span>
                <span className="text-xs text-zinc-400">
                  Applied on {app.appliedDate}
                </span>
              </div>

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
          </div>
        ))}
      </div>
    </div>
  );
};
