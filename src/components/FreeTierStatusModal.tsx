import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Cloud, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Zap, 
  Sparkles,
  Lock,
  Film,
  HardDrive
} from 'lucide-react';
import { isSupabaseConfigured, activeSupabaseUrl } from '../lib/supabase';
import { isCloudinaryConfigured } from '../lib/cloudinary';

interface FreeTierStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FreeTierStatusModal: React.FC<FreeTierStatusModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const envSnippet = `# Supabase Free Tier (50,000 Monthly Active Users Free)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Cloudinary Free Tier (25 Monthly Credits / ~25GB Free Storage)
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset-name`;

  const handleCopy = () => {
    navigator.clipboard.writeText(envSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#E9E4DC] my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-[#FAF5EE] to-[#FFF8F3] border-b border-[#EBE4DA]">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-3 py-1 rounded-full bg-[#FCEEE7] border border-[#F6D7C8] text-[#E45826] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#E45826]" />
              Free Tier Architecture
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight">
            Backend & Media Storage Status
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 mt-1.5 leading-relaxed">
            Kalā connects to Supabase Free Tier for authentication & databases, and Cloudinary Free Tier for direct video & image streaming.
          </p>
        </div>

        {/* Status Cards Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Service 1: Supabase */}
          <div className="p-5 rounded-2xl border border-[#E8E2D8] bg-[#FAF8F5]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                    Supabase Authentication & Database
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Free Tier: 50,000 monthly active users, role-based metadata, Row Level Security
                  </p>
                </div>
              </div>

              {isSupabaseConfigured ? (
                <span className="self-start sm:self-center px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Live Connected
                </span>
              ) : (
                <span className="self-start sm:self-center px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Preview Demo Mode
                </span>
              )}
            </div>

            <div className="text-xs text-zinc-600 space-y-1.5 pt-2 border-t border-zinc-200/60">
              <div className="flex items-center justify-between py-1">
                <span className="font-semibold text-zinc-700">Service:</span>
                <span>User Signup, Passwords, Role Auth & Google OAuth</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-semibold text-zinc-700">Google OAuth:</span>
                <span className="text-emerald-700 font-medium">Supported via Supabase Auth Providers</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-semibold text-zinc-700">Cost:</span>
                <span className="font-bold text-emerald-600">₹0 / month (100% Free Forever)</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-semibold text-zinc-700">Project URL:</span>
                <span className="font-mono text-[11px] text-zinc-800 truncate max-w-[260px]">{activeSupabaseUrl}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-semibold text-zinc-700">Status:</span>
                <span className="text-emerald-700 font-semibold">
                  {isSupabaseConfigured 
                    ? 'Connected & Active' 
                    : 'Interactive local state active.'}
                </span>
              </div>
            </div>

            {/* Google OAuth note */}
            <div className="mt-3 p-3 rounded-xl bg-white border border-[#E4DFD5] text-[11px] text-zinc-600 space-y-1">
              <span className="font-bold text-zinc-800 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                Google Authentication via Supabase
              </span>
              <p className="text-zinc-500">
                To connect real Google accounts in this Supabase project: go to <strong className="text-zinc-700">Authentication → Providers → Google</strong>, toggle to ON, and add your Google OAuth Client ID & Secret with redirect URI:
              </p>
              <div className="p-1.5 bg-zinc-50 border border-zinc-200 rounded font-mono text-[10px] text-zinc-800 break-all select-all">
                {activeSupabaseUrl}/auth/v1/callback
              </div>
            </div>
          </div>

          {/* Service 2: Cloudinary */}
          <div className="p-5 rounded-2xl border border-[#E8E2D8] bg-[#FAF8F5]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                    Cloudinary Media Storage & Video CDN
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Free Tier: 25 monthly credits (~25GB storage/bandwidth), fast global video streaming
                  </p>
                </div>
              </div>

              {isCloudinaryConfigured ? (
                <span className="self-start sm:self-center px-3 py-1 rounded-full bg-sky-100 border border-sky-300 text-sky-800 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Live Connected
                </span>
              ) : (
                <span className="self-start sm:self-center px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Preview Demo Mode
                </span>
              )}
            </div>

            <div className="text-xs text-zinc-600 space-y-1.5 pt-2 border-t border-zinc-200/60">
              <div className="flex items-center justify-between py-1">
                <span className="font-semibold text-zinc-700">Upload Types:</span>
                <span>Audition Video Reels (MP4/MOV/WEBM), Artwork, Logos, Headshots</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-semibold text-zinc-700">Cost:</span>
                <span className="font-bold text-emerald-600">₹0 / month (100% Free Forever)</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-semibold text-zinc-700">Mode:</span>
                <span>Unsigned Direct Uploads (Safe on client, zero secret exposure)</span>
              </div>
            </div>
          </div>

          {/* Quick Setup Instructions & Env Variables */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#E45826]" />
                Free Tier Environment Configuration (.env)
              </h4>
              <button
                onClick={handleCopy}
                className="text-xs font-semibold text-[#E45826] hover:text-[#C73E0E] flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Template'}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-zinc-900 text-zinc-200 font-mono text-[11px] leading-relaxed overflow-x-auto border border-zinc-800">
              {envSnippet}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-[#FAF7F2] border-t border-[#EBE4DA] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Fully compliant with free tier limits without requiring payment details</span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#E45826] hover:bg-[#D44716] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Got it, continue
          </button>
        </div>
      </div>
    </div>
  );
};
