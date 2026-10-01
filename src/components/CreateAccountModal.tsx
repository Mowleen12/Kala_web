import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Rocket, 
  Users, 
  TrendingUp,
  ChevronDown,
  Building2,
  Palette,
  CheckCircle2,
  Sparkles,
  Loader2,
  Cloud,
  Database
} from 'lucide-react';
import { KalaLogo, KalaStar } from './KalaLogo';
import { PortalMode } from '../types';
import { supabaseSignUp, supabaseSignIn, supabaseSignInWithGoogle, isSupabaseConfigured } from '../lib/supabase';
import { toPersistableUrl } from '../lib/localMedia';
import { MediaUploader } from './MediaUploader';

interface CreateAccountModalProps {
  isOpen: boolean;
  initialRole?: PortalMode;
  onClose: () => void;
  onSuccess: (userData: { 
    id?: string;
    name: string; 
    email: string; 
    role: PortalMode; 
    orgName?: string;
    discipline?: string;
    avatar?: string;
  }) => void;
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  initialRole = 'artist',
  onClose,
  onSuccess,
}) => {
  const [role, setRole] = useState<PortalMode>(initialRole);
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [discipline, setDiscipline] = useState('Classical & Contemporary Vocalist');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialRole) {
      setRole(initialRole);
    }
  }, [initialRole]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLoginMode) {
      if (!fullName.trim()) {
        setError(role === 'artist' ? 'Please enter your full name' : 'Please enter curator / contact name');
        return;
      }
      if (role === 'organiser' && !orgName.trim()) {
        setError('Please enter your Cultural Organization / Venue name');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setError('Please enter a valid email address');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    } else {
      if (!email.trim()) {
        setError('Please enter your email address');
        return;
      }
      if (!password) {
        setError('Please enter your password');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isLoginMode) {
        const { user, error: signInErr } = await supabaseSignIn(email.trim(), password, role);
        if (signInErr || !user) {
          setError(signInErr || 'Failed to sign in. Please verify your email and password.');
          setIsSubmitting(false);
          return;
        }
        onSuccess({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || role,
          orgName: user.orgName || (role === 'organiser' ? 'NCPA Mumbai' : undefined),
          discipline: user.discipline,
          avatar: user.avatar,
        });
      } else {
        const { user, error: signUpErr } = await supabaseSignUp({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          role,
          orgName: role === 'organiser' ? orgName.trim() : undefined,
          discipline: role === 'artist' ? discipline : undefined,
          // Stable IndexedDB ref instead of a session-only blob: preview, so
          // the avatar set during sign-up is still there on the next login.
          avatarUrl: toPersistableUrl(avatarUrl) || undefined,
        });

        if (signUpErr || !user) {
          setError(signUpErr || 'Failed to create account with Supabase.');
          setIsSubmitting(false);
          return;
        }

        onSuccess({
          name: user.name,
          email: user.email,
          role: user.role,
          orgName: user.orgName,
          discipline: user.discipline,
          avatar: user.avatar,
        });
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoArtist = () => {
    onSuccess({
      name: 'Mowleen',
      email: 'mowleen2006@gmail.com',
      role: 'artist',
      discipline: 'Classical & Contemporary Vocalist',
    });
  };

  const handleQuickDemoOrganiser = () => {
    onSuccess({
      name: 'Dr. Suvarnalata Rao',
      email: 'auditions@ncpamumbai.com',
      role: 'organiser',
      orgName: 'NCPA Mumbai',
    });
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleSubmitting(true);
    try {
      const { user, error: googleErr, redirected } = await supabaseSignInWithGoogle(role, {
        customName: fullName.trim() || undefined,
        customEmail: email.trim() || undefined,
        customOrgName: role === 'organiser' ? (orgName.trim() || undefined) : undefined,
        customDiscipline: role === 'artist' ? (discipline || undefined) : undefined,
        isSignUp: !isLoginMode,
      });

      if (redirected) {
        return;
      }

      if (googleErr || !user) {
        setError(googleErr || 'Google authentication could not be completed.');
        setIsGoogleSubmitting(false);
        return;
      }

      onSuccess({
        name: user.name,
        email: user.email,
        role: user.role,
        orgName: user.orgName,
        discipline: user.discipline,
        avatar: user.avatarUrl || user.avatar,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'An error occurred during Google authentication.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#E9E4DC] my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
          {/* Left Feature & Collage Column */}
          <div className="lg:col-span-5 bg-[#FAF6F0] p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#EFEBE4] relative overflow-hidden">
            {/* Background decorative curve */}
            <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-[#FCEEE7]/70 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              {/* Brand Header */}
              <div className="mb-4">
                <KalaLogo starSize={26} textSize="text-2xl" />
              </div>

              {role === 'artist' ? (
                <>
                  <p className="text-xs sm:text-sm font-medium text-zinc-600 leading-snug mb-6">
                    Where India's emerging artists build careers, find casting calls, and get commissioned.
                  </p>

                  {/* Photo Collage Thumbnail Grid */}
                  <div className="grid grid-cols-2 gap-2 max-w-[280px] mb-8">
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-2xs">
                      <img
                        src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=350&q=80"
                        alt="Concert"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                        <span className="font-script text-white text-[11px] leading-tight font-bold">
                          Create<br />Collaborate<br />Grow
                        </span>
                      </div>
                    </div>
                    <div className="aspect-[4/3] rounded-xl overflow-hidden shadow-2xs">
                      <img
                        src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=350&q=80"
                        alt="Scenic peaks"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#FCEEE7] flex items-center justify-center p-1.5 shadow-2xs border border-[#FAD7C8]">
                      <span className="font-script text-[#E45826] text-[11px] text-center leading-tight font-bold">
                        you are â™«<br />what you listen to
                      </span>
                    </div>
                    <div className="aspect-[4/3] rounded-xl overflow-hidden shadow-2xs">
                      <img
                        src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=350&q=80"
                        alt="Microphone"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* 3 Core Benefits */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FCEEE7] text-[#E45826] flex items-center justify-center shrink-0 mt-0.5">
                        <Rocket className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-zinc-900">Showcase your talent</h5>
                        <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                          Get discovered by leading curators, theatres, and concert festivals across India.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FCEEE7] text-[#E45826] flex items-center justify-center shrink-0 mt-0.5">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-zinc-900">Build your network</h5>
                        <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                          Collaborate, audition, and connect with ensembles, bands, and directors.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs sm:text-sm font-medium text-zinc-600 leading-snug mb-6">
                    India's leading stage and auditorium network for programming, auditions, and talent scouting.
                  </p>

                  <div className="bg-white rounded-2xl p-4 border border-[#EDE8E0] shadow-2xs mb-6 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-900">
                      <Building2 className="w-4 h-4 text-[#E45826]" />
                      <span>Host & Venue Management Desk</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Publish open audition calls, review acoustic auditions with ratings, and scout from 12,400+ verified creators.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FCEEE7] text-[#E45826] flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4 text-[#E45826]" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-zinc-900">Confidential Curatorial Pipeline</h5>
                        <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                          Isolated stage programming, applicant shortlist notes, and contract commissioning.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FCEEE7] text-[#E45826] flex items-center justify-center shrink-0 mt-0.5">
                        <Users className="w-4 h-4 text-[#E45826]" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-zinc-900">Verified Indian Talent</h5>
                        <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                          Screen audio reels and portfolio tracks directly in-app.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Demo Switcher on Left Side */}
            <div className="relative z-10 pt-6 mt-6 border-t border-[#EFEBE4]">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Fast Evaluation Access:
              </span>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleQuickDemoArtist}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-[#FCEEE7] border border-[#E2DBD0] text-[11px] font-bold text-[#E45826] text-left flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>1-Click Demo: Mowleen (Artist)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleQuickDemoOrganiser}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-zinc-100 border border-[#E2DBD0] text-[11px] font-bold text-zinc-800 text-left flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>1-Click Demo: NCPA Mumbai (Host)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
            <div>
              {/* Top Toggle Link */}
              <div className="flex justify-end mb-4">
                <span className="text-xs text-zinc-500">
                  {isLoginMode ? "Don't have an account?" : "Already have an account?"}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginMode(!isLoginMode);
                      setError('');
                    }}
                    className="text-[#E45826] font-bold hover:underline cursor-pointer ml-1"
                  >
                    {isLoginMode ? 'Sign up' : 'Log in'}
                  </button>
                </span>
              </div>

              {/* Portal Role Selector Segmented Control */}
              <div className="mb-6">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                  Select Portal to {isLoginMode ? 'Log In' : 'Register'}:
                </label>
                <div className="grid grid-cols-2 p-1 bg-[#FAF8F5] border border-[#E8E2D8] rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setRole('artist')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      role === 'artist'
                        ? 'bg-[#E45826] text-white shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Artist & Creator</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('organiser')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      role === 'organiser'
                        ? 'bg-[#E45826] text-white shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Host & Venue</span>
                  </button>
                </div>
              </div>

              {/* Title & Sub */}
              <div className="mb-5">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
                  {isLoginMode 
                    ? `Log in to ${role === 'artist' ? 'Artist Portal' : 'Organiser Portal'}` 
                    : `Create ${role === 'artist' ? 'Artist Account' : 'Organiser / Venue Account'}`}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                  {isLoginMode
                    ? (role === 'artist' ? 'Access your auditions, applications, and artist portfolio.' : 'Access your production calls, casting review rooms, and stages.')
                    : (role === 'artist' ? 'Join India\'s leading network of musicians, dancers, and creators.' : 'Register your auditorium, theatre, festival, or cultural house.')}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-medium">
                  {error}
                </div>
              )}

              {/* 1. Primary Google Auth Button */}
              <div className="mb-4">
                <button
                  id="google-top-auth-btn"
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleSubmitting || isSubmitting}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white border-2 border-[#E4DFD5] hover:border-[#E45826] hover:bg-[#FAF8F5] active:scale-98 text-xs sm:text-sm font-bold text-zinc-800 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
                >
                  {isGoogleSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#E45826]" />
                      <span>Connecting with Google...</span>
                    </>
                  ) : (
                    <>
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
                      <span>
                        {isLoginMode ? 'Log In with Google' : 'Sign Up with Google'} ({role === 'artist' ? 'Artist' : 'Host / Venue'})
                      </span>
                    </>
                  )}
                </button>

                {/* OR Divider */}
                <div className="relative my-3.5 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-200" />
                  </div>
                  <span className="relative bg-white px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    OR WITH EMAIL & PASSWORD
                  </span>
                </div>
              </div>

              {/* Form Elements */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {!isLoginMode && role === 'organiser' && (
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mb-1">
                      <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Cultural Institution / Venue Name</span>
                    </label>
                    <input
                      id="signup-org-name"
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. NCPA Mumbai, Prithvi Theatre, Ranga Shankara"
                      className="w-full bg-[#FAF8F5] border border-[#E5E0D6] focus:border-[#E45826] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 shadow-2xs"
                    />
                  </div>
                )}

                {!isLoginMode && (
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mb-1">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{role === 'artist' ? 'Full Name' : 'Curator / Representative Name'}</span>
                    </label>
                    <input
                      id="signup-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={role === 'artist' ? 'e.g. Mowleen Mukherjee' : 'e.g. Dr. Suvarnalata Rao'}
                      className="w-full bg-[#FAF8F5] border border-[#E5E0D6] focus:border-[#E45826] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 shadow-2xs"
                    />
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mb-1">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{role === 'artist' ? 'Email Address' : 'Official Venue / Work Email'}</span>
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={role === 'artist' ? 'you@example.com' : 'auditions@venue.org'}
                    className="w-full bg-[#FAF8F5] border border-[#E5E0D6] focus:border-[#E45826] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 shadow-2xs"
                  />
                </div>

                {!isLoginMode && role === 'artist' && (
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mb-1">
                      <Palette className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Primary Discipline / Craft</span>
                    </label>
                    <input
                      id="signup-discipline"
                      type="text"
                      value={discipline}
                      onChange={(e) => setDiscipline(e.target.value)}
                      placeholder="e.g. Hindustani Vocalist, Bharatanatyam Dancer, Sitarist"
                      className="w-full bg-[#FAF8F5] border border-[#E5E0D6] focus:border-[#E45826] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 shadow-2xs"
                    />
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mb-1">
                    <Lock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Password</span>
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-[#FAF8F5] border border-[#E5E0D6] focus:border-[#E45826] focus:bg-white rounded-xl px-3.5 py-2.5 pr-10 text-xs sm:text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {!isLoginMode && (
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mb-1">
                      <Lock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Confirm Password</span>
                    </label>
                    <div className="relative">
                      <input
                        id="signup-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full bg-[#FAF8F5] border border-[#E5E0D6] focus:border-[#E45826] focus:bg-white rounded-xl px-3.5 py-2.5 pr-10 text-xs sm:text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {!isLoginMode && (
                  <div>
                    <MediaUploader
                      label={role === 'artist' ? "Profile Photo / Artist Avatar" : "Venue / Cultural House Logo"}
                      description={role === 'artist' ? "Upload a headshot or portrait (stored on Cloudinary)" : "Upload official organization logo (stored on Cloudinary)"}
                      resourceType="image"
                      folder={role === 'artist' ? "kala-artists/avatars" : "kala-venues/logos"}
                      value={avatarUrl}
                      onChange={(url) => setAvatarUrl(url)}
                      onRemove={() => setAvatarUrl('')}
                    />
                  </div>
                )}

                {/* Submit CTA */}
                <div className="pt-2">
                  <button
                    id="signup-submit-btn"
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-full text-white text-sm font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-60 ${
                      role === 'artist' 
                        ? 'bg-[#E45826] hover:bg-[#D44716]' 
                        : 'bg-zinc-900 hover:bg-zinc-800'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Connecting to Supabase...</span>
                      </>
                    ) : (
                      <>
                        <span>{isLoginMode ? `Log In as ${role === 'artist' ? 'Artist' : 'Organiser'}` : `Create ${role === 'artist' ? 'Artist' : 'Host'} Account`}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* OR Divider */}
              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200" />
                </div>
                <span className="relative bg-white px-3 text-[11px] font-medium text-zinc-400 uppercase tracking-widest">
                  OR
                </span>
              </div>

              {/* Continue with Google */}
              <button
                id="google-signin-btn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleSubmitting || isSubmitting}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white border border-[#E4DFD5] hover:bg-zinc-50 active:scale-98 text-xs sm:text-sm font-semibold text-zinc-700 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
              >
                {isGoogleSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#E45826]" />
                    <span>Connecting with Google...</span>
                  </>
                ) : (
                  <>
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
                    <span>{isLoginMode ? 'Log In with Google' : 'Sign Up with Google'} ({role === 'artist' ? 'Artist' : 'Host / Venue'})</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 text-center mt-5 leading-relaxed">
              By creating an account, you agree to our{' '}
              <a href="#terms" className="text-[#E45826] hover:underline font-medium">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#privacy" className="text-[#E45826] hover:underline font-medium">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
