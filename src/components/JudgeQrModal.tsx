import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  Copy, 
  Check, 
  Download, 
  Share2, 
  ShieldCheck, 
  Users, 
  Award,
  ExternalLink 
} from 'lucide-react';
import { Opportunity, JudgeEvaluationSubmission } from '../types';
import { CallTypeBadge } from './CallTypeBadge';
import { generateEventJudgeQr, getOrCreateJudgeAccess, getSubmissionsForEvent } from '../lib/judge';

interface JudgeQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: Opportunity | null;
  onOpenEvaluations?: (opportunityId: string) => void;
  onOpenJudgePortal?: (code: string) => void;
}

export const JudgeQrModal: React.FC<JudgeQrModalProps> = ({
  isOpen,
  onClose,
  opportunity,
  onOpenEvaluations,
  onOpenJudgePortal,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [accessCode, setAccessCode] = useState<string>('');
  const [submissions, setSubmissions] = useState<JudgeEvaluationSubmission[]>([]);

  useEffect(() => {
    if (!opportunity || !isOpen) return;

    const access = getOrCreateJudgeAccess(opportunity);
    setAccessCode(access.code);

    generateEventJudgeQr(opportunity.id, access.code).then(({ qrDataUrl, shareUrl }) => {
      setQrUrl(qrDataUrl);
      setShareUrl(shareUrl);
    });

    setSubmissions(getSubmissionsForEvent(opportunity.id));
  }, [opportunity, isOpen]);

  if (!isOpen || !opportunity) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownloadQr = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `kala-judge-qr-${opportunity.id}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#EDE8E0] overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#EDE8E0] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FDEEE7] text-[#E45826] flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-950">
                Judge Portal Access &amp; QR Code
              </h2>
              <p className="text-xs text-zinc-500">
                Secure jury evaluation portal for this event
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-200/80 hover:bg-zinc-300 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Event Context Pill */}
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E9E4DC] flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#E45826] bg-[#FDEEE7] px-2 py-0.5 rounded-md">
                  {opportunity.category}
                </span>
                <CallTypeBadge callType={opportunity.callType} variant="inline" />
              </div>
              <h3 className="font-bold text-zinc-900 text-sm">{opportunity.title}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{opportunity.venue}, {opportunity.city}</p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[11px] font-mono text-zinc-400 uppercase">Access Code</div>
              <div className="text-base font-extrabold text-[#E45826] tracking-wider">{accessCode}</div>
            </div>
          </div>

          {/* QR Code Presentation */}
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border-2 border-dashed border-[#E0D9CE] shadow-2xs">
            {qrUrl ? (
              <div className="relative p-3 bg-white rounded-2xl shadow-md border border-zinc-200">
                <img
                  src={qrUrl}
                  alt="Judge QR Code"
                  className="w-56 h-56 object-contain"
                />
              </div>
            ) : (
              <div className="w-56 h-56 bg-zinc-100 rounded-2xl flex items-center justify-center text-xs text-zinc-400 animate-pulse">
                Generating QR Code...
              </div>
            )}

            <div className="text-center mt-4">
              <p className="text-xs font-semibold text-zinc-800">
                Scan with any smartphone camera or QR scanner
              </p>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-sm">
                Directly opens the Judge Evaluation Room restricted strictly to this competition. No separate download required.
              </p>
            </div>

            {/* Actions for QR */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleDownloadQr}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-300 hover:border-zinc-400 bg-white text-xs font-semibold text-zinc-800 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#E45826]" />
                <span>Save QR Image</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E45826] hover:bg-[#D44716] text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Link Copied!' : 'Copy Direct Link'}</span>
              </button>
            </div>
          </div>

          {/* Shareable Link Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide">
              Judge Direct Invite Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 font-mono select-all focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer"
                title="Copy link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Assigned & Completed Judges Status */}
          <div className="space-y-2 pt-2 border-t border-[#EDE8E0]">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-800">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#E45826]" />
                Jury Evaluations for this Event ({submissions.length})
              </span>
              {onOpenEvaluations && submissions.length > 0 && (
                <button
                  onClick={() => {
                    onOpenEvaluations(opportunity.id);
                    onClose();
                  }}
                  className="text-[#E45826] hover:underline cursor-pointer flex items-center gap-1 font-semibold normal-case text-xs"
                >
                  View Leaderboard &amp; Scores <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {submissions.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-dashed border-[#E0D9CE] text-center text-xs text-zinc-500">
                No judge evaluations submitted yet. Share the QR code or link with your jury panel.
              </div>
            ) : (
              <div className="space-y-2">
                {submissions.map((sub) => {
                  const evalCount = Object.keys(sub.evaluations || {}).length;
                  return (
                    <div
                      key={sub.id}
                      className="p-3 rounded-xl border border-zinc-200 bg-white flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-zinc-900">{sub.judgeName}</div>
                        <div className="text-[11px] text-zinc-500">{sub.judgeTitle || 'Jury Member'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-600 font-medium">
                          {evalCount} candidates evaluated
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            sub.isSubmitted
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sub.isSubmitted ? 'Submitted' : 'In Progress'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#EDE8E0] bg-[#FAF8F5] flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Judges are strictly restricted to this event
          </span>
          <div className="flex items-center gap-2">
            {onOpenJudgePortal && accessCode && (
              <button
                type="button"
                onClick={() => onOpenJudgePortal(accessCode)}
                className="px-3.5 py-2 rounded-xl bg-[#FDEEE7] text-[#E45826] hover:bg-[#FAD7C8] font-bold text-xs transition-colors cursor-pointer"
              >
                Launch Judge View
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
