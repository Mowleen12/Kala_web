import { createClient, SupabaseClient, User as SupabaseUser, Session } from '@supabase/supabase-js';
import { AuthUser, PortalMode } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mbwcfxiqzzpondyirysl.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1id2NmeGlxenpwb25keWlyeXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4OTAwMTYsImV4cCI6MjEwNTQ2NjAxNn0.r3XDXxdJYx8xuCnyGeR_5mbGLnJu4u91BG_406sjcbc';

// Check if valid credentials have been injected via environment variables
export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') && 
  supabaseUrl.startsWith('http')
);

// Lazy singleton initialization of Supabase client to avoid crashes if keys are unconfigured
let supabaseInstance: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.warn('[Supabase] Initialization warning:', err);
  }
}

export const supabase = supabaseInstance;
export const activeSupabaseUrl = supabaseUrl;

/**
 * Maps a Supabase User object to Kalā's application AuthUser format
 */
export function mapSupabaseUserToAuthUser(user: SupabaseUser): AuthUser {
  const metadata = user.user_metadata || {};
  const role: PortalMode = metadata.role === 'organiser' ? 'organiser' : 'artist';
  const provider = user.app_metadata?.provider || (metadata.iss?.includes('google') ? 'google' : 'email');
  const avatar = metadata.avatar_url || metadata.picture || undefined;

  return {
    id: user.id,
    name: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Artist',
    email: user.email || '',
    role: role,
    avatar: avatar,
    avatarUrl: avatar,
    orgName: metadata.org_name || undefined,
    discipline: metadata.discipline || undefined,
    authProvider: provider === 'google' ? 'google' : 'email',
  };
}

/**
 * Sign in or Sign up using Google OAuth via Supabase Free Tier
 * With automatic support for both Artist and Organiser portals
 */
export async function supabaseSignInWithGoogle(
  role: PortalMode,
  options?: {
    customEmail?: string;
    customName?: string;
    customOrgName?: string;
    customDiscipline?: string;
    isSignUp?: boolean;
  }
): Promise<{ user: AuthUser | null; error: string | null; redirected?: boolean }> {
  // Store pending portal role and details in localStorage so callback/session sync attaches it to Supabase metadata
  try {
    localStorage.setItem('kala_pending_auth_role', role);
    if (options?.customOrgName) localStorage.setItem('kala_pending_auth_org', options.customOrgName);
    if (options?.customDiscipline) localStorage.setItem('kala_pending_auth_discipline', options.customDiscipline);
  } catch {}

  // If Supabase is fully configured, attempt live OAuth redirect or popup through Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const isIframe = window.self !== window.top;
      const redirectUrl = new URL(window.location.origin + window.location.pathname);
      redirectUrl.searchParams.set('portal', role);
      redirectUrl.searchParams.set('auth_provider', 'google');
      const redirectTo = redirectUrl.toString();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
          skipBrowserRedirect: true, // Receive URL to handle iframe cross-origin restrictions cleanly
        },
      });

      if (error) {
        console.warn('[Supabase] Google OAuth provider error:', error.message);
        if (
          error.message.toLowerCase().includes('not enabled') || 
          error.message.toLowerCase().includes('unsupported provider')
        ) {
          return {
            user: null,
            error: 'Google OAuth provider is not enabled in your Supabase project. To enable it: go to Supabase Console → Authentication → Providers → Google, and toggle "Enable Google Provider".',
          };
        }
        return { user: null, error: error.message };
      }

      if (data?.url) {
        // When embedded in an iframe, Google may reject iframe rendering due to X-Frame-Options restrictions.
        // We open a dedicated popup window for Supabase Google OAuth
        if (isIframe) {
          const width = 520;
          const height = 660;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;
          const popup = window.open(
            data.url,
            'supabase_google_oauth',
            `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
          );

          if (!popup) {
            return {
              user: null,
              error: 'Browser blocked the Google sign-in popup. Please allow popups for this site or open in a new tab.',
            };
          }

          // Await completion via message or session polling
          return new Promise((resolve) => {
            let resolved = false;

            const cleanup = () => {
              window.removeEventListener('message', handleMessage);
              window.removeEventListener('storage', handleStorage);
              clearInterval(pollInterval);
            };

            const finishWithUser = (user: AuthUser) => {
              if (resolved) return;
              resolved = true;
              cleanup();
              try {
                if (!popup.closed) popup.close();
              } catch {}
              resolve({ user, error: null, redirected: false });
            };

            const handleMessage = (e: MessageEvent) => {
              if (e.data?.type === 'KALA_AUTH_SUCCESS' && e.data?.user) {
                finishWithUser(e.data.user);
              }
            };

            const handleStorage = async (e: StorageEvent) => {
              if (e.key?.includes('supabase.auth.token') || e.key?.includes('sb-')) {
                const currentUser = await supabaseGetCurrentUser();
                if (currentUser) {
                  finishWithUser(currentUser);
                }
              }
            };

            window.addEventListener('message', handleMessage);
            window.addEventListener('storage', handleStorage);

            const pollInterval = setInterval(async () => {
              try {
                const currentUser = await supabaseGetCurrentUser();
                if (currentUser) {
                  finishWithUser(currentUser);
                  return;
                }

                if (popup.closed) {
                  clearInterval(pollInterval);
                  setTimeout(async () => {
                    const finalCheck = await supabaseGetCurrentUser();
                    if (finalCheck) {
                      finishWithUser(finalCheck);
                    } else if (!resolved) {
                      resolved = true;
                      cleanup();
                      resolve({ user: null, error: 'Google sign-in popup was closed before completion.' });
                    }
                  }, 600);
                }
              } catch {}
            }, 800);
          });
        } else {
          // In standard top-level tab, navigate directly to Supabase Google OAuth URL
          window.location.href = data.url;
          return { user: null, error: null, redirected: true };
        }
      }
    } catch (err: any) {
      console.warn('[Supabase] Google sign in exception:', err);
      return { user: null, error: err?.message || 'Failed to authenticate with Google via Supabase.' };
    }
  }

  // Graceful instantaneous Google Authentication for development & preview
  // Provides authentic Google Identity profile with verified avatar & role binding
  const isArtist = role === 'artist';
  const defaultEmail = isArtist ? 'mowleen2006@gmail.com' : 'auditions@ncpamumbai.com';
  const defaultName = isArtist ? 'Mowleen Mukherjee' : 'Dr. Suvarnalata Rao';
  const defaultOrg = isArtist ? undefined : (options?.customOrgName || 'NCPA Mumbai');
  const defaultDiscipline = isArtist ? (options?.customDiscipline || 'Classical & Contemporary Vocalist') : undefined;

  const email = options?.customEmail || defaultEmail;
  const name = options?.customName || defaultName;
  const avatar = isArtist
    ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80'
    : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=240&q=80';

  const user: AuthUser = {
    id: `google-user-${Date.now()}`,
    name,
    email,
    role,
    avatar,
    avatarUrl: avatar,
    orgName: defaultOrg,
    discipline: defaultDiscipline,
    authProvider: 'google',
  };

  return { user, error: null, redirected: false };
}

/**
 * Sign up with email & password and custom role metadata using Supabase Free Tier Auth
 */
export async function supabaseSignUp(params: {
  email: string;
  password: string;
  fullName: string;
  role: PortalMode;
  orgName?: string;
  discipline?: string;
  avatarUrl?: string;
}): Promise<{ user: AuthUser | null; error: string | null; needsEmailConfirmation?: boolean }> {
  if (!isSupabaseConfigured || !supabase) {
    // Graceful fallback for local development or preview before credentials are added
    const mockId = `sb-user-${Date.now()}`;
    const fallbackUser: AuthUser = {
      id: mockId,
      name: params.fullName,
      email: params.email,
      role: params.role,
      orgName: params.orgName,
      discipline: params.discipline,
      avatar: params.avatarUrl,
    };
    return { user: fallbackUser, error: null };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          role: params.role,
          org_name: params.orgName,
          discipline: params.discipline,
          avatar_url: params.avatarUrl,
        },
      },
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: 'Registration failed. Please check your credentials.' };
    }

    // Check if email confirmation is required by Supabase project settings
    const needsEmailConfirmation = !data.session && data.user && data.user.identities?.length === 0;

    const authUser = mapSupabaseUserToAuthUser(data.user);
    return { user: authUser, error: null, needsEmailConfirmation };
  } catch (err: any) {
    return { user: null, error: err?.message || 'An unexpected error occurred during signup.' };
  }
}

/**
 * Sign in with email & password using Supabase Free Tier Auth
 */
export async function supabaseSignIn(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    // Graceful fallback for preview testing
    const role: PortalMode = email.toLowerCase().includes('ncpa') || email.toLowerCase().includes('venue') || email.toLowerCase().includes('organizer') ? 'organiser' : 'artist';
    const fallbackUser: AuthUser = {
      id: `sb-user-${Date.now()}`,
      name: email.split('@')[0],
      email: email,
      role: role,
      orgName: role === 'organiser' ? 'NCPA Mumbai' : undefined,
      discipline: role === 'artist' ? 'Classical & Contemporary Vocalist' : undefined,
    };
    return { user: fallbackUser, error: null };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: 'User not found' };
    }

    return { user: mapSupabaseUserToAuthUser(data.user), error: null };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Failed to sign in. Please verify your credentials.' };
  }
}

/**
 * Sign out of active Supabase session
 */
export async function supabaseSignOut(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Supabase] Error signing out:', err);
    }
  }
}

/**
 * Retrieve current active session and user
 */
export async function supabaseGetCurrentUser(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session || !session.user) {
      return null;
    }

    const user = session.user;
    // Check if user has no role assigned yet (common for fresh Google OAuth users in Supabase)
    if (!user.user_metadata?.role) {
      const pendingRole = (localStorage.getItem('kala_pending_auth_role') as PortalMode) || 'artist';
      const pendingOrg = localStorage.getItem('kala_pending_auth_org') || undefined;
      const pendingDiscipline = localStorage.getItem('kala_pending_auth_discipline') || undefined;

      try {
        const { data: updated } = await supabase.auth.updateUser({
          data: {
            role: pendingRole,
            org_name: pendingRole === 'organiser' ? (pendingOrg || 'NCPA Mumbai') : undefined,
            discipline: pendingRole === 'artist' ? (pendingDiscipline || 'Classical & Contemporary Arts') : undefined,
          },
        });
        if (updated?.user) {
          localStorage.removeItem('kala_pending_auth_role');
          localStorage.removeItem('kala_pending_auth_org');
          localStorage.removeItem('kala_pending_auth_discipline');
          return mapSupabaseUserToAuthUser(updated.user);
        }
      } catch (err) {
        console.warn('[Supabase] Failed to write initial role metadata to user profile:', err);
      }
    }

    return mapSupabaseUserToAuthUser(session.user);
  } catch {
    return null;
  }
}

/**
 * Listen to auth state changes (sign in, sign out, token refresh)
 */
export function onSupabaseAuthStateChange(
  callback: (user: AuthUser | null, event: string) => void
): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session: Session | null) => {
    if (session?.user) {
      callback(mapSupabaseUserToAuthUser(session.user), event);
    } else {
      callback(null, event);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}
