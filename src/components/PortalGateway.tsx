import React from 'react';
import { 
  Palette, 
  Building2, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  Calendar,
  Lock
} from 'lucide-react';
import { KalaLogo, KalaStar } from './KalaLogo';
import { PortalMode } from '../types';

interface PortalGatewayProps {
  onSelectPortal: (portal: PortalMode) => void;
  onOpenRegister: (portal: PortalMode) => void;
  onQuickDemoLogin: (portal: PortalMode) => void;
  onGoogleLogin?: (portal: PortalMode, isSignUp?: boolean) => void;
}

export const PortalGateway: React.FC<PortalGatewayProps> = ({
  onSelectPortal,
  onOpenRegister,
  onQuickDemoLogin,
  onGoogleLogin,
}) => {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-zinc-900 flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#FCEEE7]/80 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#FAF0E4]/80 blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 max-w-6xl mx-auto w-full flex items-center justify-between pb-8 border-b border-[#EDE8E0]">
        <KalaLogo starSize={30} textSize="text-3xl tracking-tight" />
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600 bg-white px-3.5 py-1.5 rounded-full border border-[#E2DBD0] shadow-2xs">
          <Lock className="w-3.5 h-3.5 text-[#E45826]" />
          <span>Role-Scoped Portals</span>
        </div>
      </header>

      {/* Main Gateway Card Area */}
      <main className="relative z-10 max-w-5xl mx-auto w-full my-auto py-8 sm:py-12">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FDEEE7] border border-[#FAD7C8] text-[#E45826] text-xs font-bold uppercase tracking-wider mb-3">
            <KalaStar size={14} className="text-[#E45826]" />
            Separate Portal Access
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-950 tracking-tight leading-tight">
            Select Your Workspace to Log In
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 mt-3 leading-relaxed">
            Kala maintains strictly separated workspaces for individual performing & visual artists, and curatorial cultural hosts.
          </p>
        </div>

        {/* The 2 Portals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {/* ================================================================= */}
          {/* 1. ARTIST PORTAL CARD */}
          {/* ================================================================= */}
          <div className="group bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#E9E4DC] hover:border-[#E45826] transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#FDEEE7] to-transparent rounded-bl-full pointer-events-none opacity-60" />

            <div>
              {/* Badge & Icon */}
              <div className="flex items-center justify-between gap-2 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-[#FDEEE7] text-[#E45826] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <Palette className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full bg-[#FFF5F0] border border-[#FCDFD1] text-[#E45826] text-xs font-bold uppercase tracking-wider">
                  Artist & Creator
                </span>
              </div>

              {/* Title & Description */}
              <h2 className="text-2xl font-bold text-zinc-950 tracking-tight group-hover:text-[#E45826] transition-colors">
                Artist Portal
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 mt-2 leading-relaxed">
                For vocalists, instrumentalists, dancers, theatre actors, and visual artists seeking auditions, fellowships, and commissioned gigs.
              </p>

              {/* Feature Bullet Points */}
              <div className="mt-6 space-y-3 pt-5 border-t border-zinc-100">
                <div className="flex items-start gap-2.5 text-xs text-zinc-700">
                  <CheckCircle2 className="w-4 h-4 text-[#E45826] shrink-0 mt-0.5" />
                  <span>Discover 450+ verified casting & audition calls across India</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-zinc-700">
                  <CheckCircle2 className="w-4 h-4 text-[#E45826] shrink-0 mt-0.5" />
                  <span>Submit audio audition reels & track application status</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-zinc-700">
                  <CheckCircle2 className="w-4 h-4 text-[#E45826] shrink-0 mt-0.5" />
                  <span>Verified artist profile & direct curator audition invitations</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 mt-6 space-y-2.5 border-t border-zinc-100">
              {/* Google Button */}
              <button
                id="artist-gateway-google-btn"
                onClick={() => onGoogleLogin ? onGoogleLogin('artist', false) : onSelectPortal('artist')}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white border-2 border-[#E9E4DC] hover:border-[#E45826] hover:bg-[#FAF8F5] active:scale-98 text-xs sm:text-sm font-bold text-zinc-900 shadow-2xs transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google (Artist)</span>
              </button>

              <button
                onClick={() => onSelectPortal('artist')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#E45826] hover:bg-[#D44716] active:scale-98 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
              >
                <span>Log In with Email</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500">
                <button
                  type="button"
                  onClick={() => onOpenRegister('artist')}
                  className="font-bold text-[#E45826] hover:underline cursor-pointer"
                >
                  + Sign up as new Artist
                </button>
                <button
                  type="button"
                  onClick={() => onQuickDemoLogin('artist')}
                  className="text-zinc-500 hover:text-zinc-800 underline cursor-pointer"
                >
                  Quick Demo (Mowleen)
                </button>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 2. ORGANISER PORTAL CARD */}
          {/* ================================================================= */}
          <div className="group bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#E9E4DC] hover:border-[#E45826] transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#FAF0E6] to-transparent rounded-bl-full pointer-events-none opacity-80" />

            <div>
              {/* Badge & Icon */}
              <div className="flex items-center justify-between gap-2 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF0E6] border border-[#F3D5C3] text-[#E45826] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <Building2 className="w-6 h-6 text-[#E45826]" />
                </div>
                <span className="px-3 py-1 rounded-full bg-[#FAF2EA] border border-[#EBDCCF] text-[#C73E0E] text-xs font-bold uppercase tracking-wider">
                  Host & Venue
                </span>
              </div>

              {/* Title & Description */}
              <h2 className="text-2xl font-bold text-zinc-950 tracking-tight group-hover:text-[#E45826] transition-colors">
                Organiser & Venue Portal
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 mt-2 leading-relaxed">
                For cultural centres, theatres, festival directors, and production houses commissioning artists and managing audition pipelines.
              </p>

              {/* Feature Bullet Points */}
              <div className="mt-6 space-y-3 pt-5 border-t border-zinc-100">
                <div className="flex items-start gap-2.5 text-xs text-zinc-700">
                  <CheckCircle2 className="w-4 h-4 text-[#E45826] shrink-0 mt-0.5" />
                  <span>Publish production calls with stage & honorarium specifications</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-zinc-700">
                  <CheckCircle2 className="w-4 h-4 text-[#E45826] shrink-0 mt-0.5" />
                  <span>Curatorial review room with audition reel evaluation & ratings</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-zinc-700">
                  <CheckCircle2 className="w-4 h-4 text-[#E45826] shrink-0 mt-0.5" />
                  <span>Direct talent scouting across 12,400+ vetted Indian creators</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 mt-6 space-y-2.5 border-t border-zinc-100">
              {/* Google Button */}
              <button
                id="organiser-gateway-google-btn"
                onClick={() => onGoogleLogin ? onGoogleLogin('organiser', false) : onSelectPortal('organiser')}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white border-2 border-[#E9E4DC] hover:border-[#E45826] hover:bg-[#FAF8F5] active:scale-98 text-xs sm:text-sm font-bold text-zinc-900 shadow-2xs transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google (Host / Venue)</span>
              </button>

              <button
                onClick={() => onSelectPortal('organiser')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-98 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
              >
                <span>Log In with Email</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500">
                <button
                  type="button"
                  onClick={() => onOpenRegister('organiser')}
                  className="font-bold text-[#E45826] hover:underline cursor-pointer"
                >
                  + Register Cultural Venue
                </button>
                <button
                  type="button"
                  onClick={() => onQuickDemoLogin('organiser')}
                  className="text-zinc-500 hover:text-zinc-800 underline cursor-pointer"
                >
                  Quick Demo (NCPA)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Google & Email Quick Registration Options in Footer */}
        <div className="mt-10 p-5 rounded-2xl bg-white border border-[#E9E4DC] max-w-2xl mx-auto shadow-2xs text-center">
          <p className="text-xs font-bold text-zinc-800 mb-3">
            Instant 1-Click Access via Google on Both Portals:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={() => onGoogleLogin ? onGoogleLogin('artist', true) : onOpenRegister('artist')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F2ECE3] border border-[#E8E2D8] text-xs font-bold text-zinc-800 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Sign up as Artist with Google</span>
            </button>
            <button
              onClick={() => onGoogleLogin ? onGoogleLogin('organiser', true) : onOpenRegister('organiser')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F2ECE3] border border-[#E8E2D8] text-xs font-bold text-zinc-800 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Sign up as Host / Venue with Google</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto w-full pt-8 border-t border-[#EDE8E0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
        <p>&copy; {new Date().getFullYear()} Kala Creative Network &bull; India's Performing Arts Ecosystem</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#E45826]" />
            End-to-end credential isolation
          </span>
        </div>
      </footer>
    </div>
  );
};
