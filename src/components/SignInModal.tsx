import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  Building2,
  User
} from 'lucide-react';
import { KalaStar } from './KalaLogo';
import { PortalMode, AuthUser } from '../types';
import { supabaseSignIn, supabaseSignInWithGoogle, isSupabaseConfigured } from '../lib/supabase';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  onSwitchToSignUp: (role?: PortalMode) => void;
  initialRole?: PortalMode;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSwitchToSignUp,
  initialRole = 'artist',
}) => {
  const [role, setRole] = useState<PortalMode>(initialRole);

  useEffect(() => {
    if (isOpen) setRole(initialRole);
  }, [isOpen, initialRole]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      const { user, error: googleErr, redirected } = await supabaseSignInWithGoogle(role);

      if (redirected) {
        return; // Redirecting to Google OAuth
      }

      if (googleErr || !user) {
        setError(googleErr || 'Google sign-in could not be completed.');
        setIsGoogleLoading(false);
        return;
      }

      onSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during Google sign-in.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const { user, error: signInError } = await supabaseSignIn(email.trim(), password, role);

      if (signInError || !user) {
        setError(signInError || 'Failed to sign in. Please verify your email and password.');
        setIsLoading(false);
        return;
      }

      // Ensure role matches selected tab if not specified in user metadata
      const authenticatedUser: AuthUser = {
        ...user,
        role: user.role || role,
      };

      onSuccess(authenticatedUser);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#E9E4DC] my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-[#FAF5EE] to-[#FFF8F3] border-b border-[#EBE4DA] text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FAF0E6] border border-[#F3D5C3] text-[#E45826] flex items-center justify-center mb-3 shadow-2xs">
            <KalaStar className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-zinc-950 tracking-tight">
            Log In to Kalā
          </h2>
          <p className="text-xs text-zinc-600 mt-1">
            Log back in to continue
          </p>

          {/* Role Selector Pill */}
          <div className="mt-5 grid grid-cols-2 p-1 rounded-2xl bg-[#EDE7DD] max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => { setRole('artist'); setError(null); }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                role === 'artist'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <User className="w-3.5 h-3.5 text-[#E45826]" />
              <span>Artist Portal</span>
            </button>
            <button
              type="button"
              onClick={() => { setRole('organiser'); setError(null); }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                role === 'organiser'
                  ? 'bg-[#E45826] text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Host / Venue</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Continue with Google Button */}
          <button
            id="signin-google-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white border-2 border-[#E4DFD5] hover:border-[#E45826] hover:bg-[#FAF8F5] active:scale-98 text-xs sm:text-sm font-bold text-zinc-800 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
          >
            {isGoogleLoading ? (
              <>
                <KalaStar size={16} className="w-4 h-4 animate-spin text-[#E45826]" />
                <span>Connecting to Google...</span>
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
                <span>Continue with Google ({role === 'artist' ? 'Artist' : 'Host / Venue'})</span>
              </>
            )}
          </button>

          {/* OR Divider */}
          <div className="relative my-3 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200" />
            </div>
            <span className="relative bg-white px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              OR WITH EMAIL
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === 'artist' ? "you@example.com" : "auditions@venue.org"}
                className="w-full bg-[#FAF8F5] border border-[#E5DFD5] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-[#E45826] transition-colors"
              />
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#FAF8F5] border border-[#E5DFD5] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-[#E45826] transition-colors"
              />
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-[#E45826] hover:bg-[#D44716] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <KalaStar size={16} className="w-4 h-4 animate-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <span>Sign In to {role === 'artist' ? 'Artist' : 'Organiser'} Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Switch to Signup */}
          <div className="pt-2 text-center text-xs text-zinc-500">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => {
                onClose();
                onSwitchToSignUp(role);
              }}
              className="font-bold text-[#E45826] hover:underline cursor-pointer"
            >
              Create an account
            </button>
          </div>
        </form>
        </div>
      </motion.div>
    </div>
  );
};
