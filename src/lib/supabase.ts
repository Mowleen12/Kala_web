import { createClient, SupabaseClient, User as SupabaseUser, Session } from '@supabase/supabase-js';
import { AuthUser, PortalMode } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Credentials must come from the environment — never from committed source.
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
 * Maps Supabase auth errors onto copy the user can act on. Raw provider
 * messages (and anything unmapped) never reach the UI.
 */
export function authErrorMessage(raw?: string | null): string {
  const m = (raw || '').toLowerCase();
  if (!m) return 'Something went wrong. Please try again.';
  if (m.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (m.includes('email not confirmed')) {
    return 'Confirm your email first — open the verification link we sent you, then sign in.';
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'An account with this email already exists. Sign in instead.';
  }
  if (m.includes('password should be at least')) return 'Password must be at least 6 characters.';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) {
    return 'Too many attempts — wait a minute and try again.';
  }
  if (m.includes('signup is disabled')) return 'Registration is currently closed.';
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) {
    return 'Google sign-in is not enabled. Use your email and password instead.';
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Network error — check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

/**
 * Sign in or Sign up using Google OAuth via Supabase
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
        return { user: null, error: authErrorMessage(error.message) };
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

  // No OAuth URL came back (or auth is unconfigured) — never fabricate a session.
  return {
    user: null,
    error: isSupabaseConfigured
      ? 'Google sign-in did not start. Please try again or use your email and password.'
      : 'Sign-in is not configured on this deployment.',
  };
}

/**
 * Sign up with email & password and custom role metadata using Supabase Auth
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
    return { user: null, error: 'Account creation is not configured on this deployment.' };
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
      return { user: null, error: authErrorMessage(error.message) };
    }

    if (!data.user) {
      return { user: null, error: 'Registration failed. Please check your details and try again.' };
    }

    // No session means the project requires email confirmation before sign-in.
    const needsEmailConfirmation = !data.session;

    const authUser = mapSupabaseUserToAuthUser(data.user);
    return { user: authUser, error: null, needsEmailConfirmation };
  } catch (err: any) {
    return { user: null, error: authErrorMessage(err?.message) };
  }
}

/**
 * Sign in with email & password using Supabase Auth
 */
export async function supabaseSignIn(
  email: string,
  password: string,
  fallbackRole?: PortalMode
): Promise<{ user: AuthUser | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, error: 'Sign-in is not configured on this deployment.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error: authErrorMessage(error.message) };
    }

    if (!data.user) {
      return { user: null, error: 'No account found for this email.' };
    }

    const authUser = mapSupabaseUserToAuthUser(data.user);
    // Users without a role in metadata always map to 'artist' — honor the portal
    // pill the user actually picked and persist it so future logins agree.
    if (!data.user.user_metadata?.role && fallbackRole) {
      authUser.role = fallbackRole;
      supabase.auth.updateUser({ data: { role: fallbackRole } }).catch(() => {});
    }

    return { user: authUser, error: null };
  } catch (err: any) {
    return { user: null, error: authErrorMessage(err?.message) };
  }
}

/**
 * Sign out of active Supabase session
 */
export async function supabaseSignOut(): Promise<void> {
  // A pending role belongs to an OAuth attempt that never finished — drop it
  // so a later sign-in can't inherit the wrong portal.
  try {
    localStorage.removeItem('kala_pending_auth_role');
    localStorage.removeItem('kala_pending_auth_org');
    localStorage.removeItem('kala_pending_auth_discipline');
  } catch {}
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Supabase] Error signing out:', err);
    }
  }
}

/**
 * The portal the user just picked on the gateway/sign-in UI, if any.
 * Survives the OAuth redirect via localStorage; consumed once the session
 * lands so Google login works on BOTH portals (the clicked portal always
 * wins over whatever role is already in user_metadata).
 */
function takePendingAuthRole(): {
  role: PortalMode | null;
  orgName?: string;
  discipline?: string;
} {
  let role: PortalMode | null = null;
  let orgName: string | undefined;
  let discipline: string | undefined;
  try {
    role = (localStorage.getItem('kala_pending_auth_role') as PortalMode) || null;
    orgName = localStorage.getItem('kala_pending_auth_org') || undefined;
    discipline = localStorage.getItem('kala_pending_auth_discipline') || undefined;
  } catch {}
  return { role, orgName, discipline };
}

function clearPendingAuthRole(): void {
  try {
    localStorage.removeItem('kala_pending_auth_role');
    localStorage.removeItem('kala_pending_auth_org');
    localStorage.removeItem('kala_pending_auth_discipline');
  } catch {}
}

/** Local (pre-flush) view of the user: pending portal choice overrides metadata. */
function withPendingPortal(user: AuthUser): AuthUser {
  const pending = takePendingAuthRole();
  if (!pending.role || pending.role === user.role) return user;
  return {
    ...user,
    role: pending.role,
    orgName: pending.role === 'organiser' ? pending.orgName || user.orgName : user.orgName,
    discipline:
      pending.role === 'artist' ? pending.discipline || user.discipline : user.discipline,
  };
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
    const pending = takePendingAuthRole();
    const metaRole = user.user_metadata?.role as PortalMode | undefined;
    // Flush the clicked portal into metadata whenever it differs from what is
    // stored (first Google login, and every portal switch afterwards).
    const roleToFlush = pending.role ?? (!metaRole ? 'artist' : null);
    const needsFlush =
      roleToFlush !== null &&
      (roleToFlush !== metaRole || Boolean(pending.orgName) || Boolean(pending.discipline));

    if (needsFlush && roleToFlush) {
      try {
        const { data: updated } = await supabase.auth.updateUser({
          data: {
            role: roleToFlush,
            // No fabricated defaults — absent stays absent.
            org_name:
              roleToFlush === 'organiser'
                ? pending.orgName || user.user_metadata?.org_name || undefined
                : undefined,
            discipline:
              roleToFlush === 'artist'
                ? pending.discipline || user.user_metadata?.discipline || undefined
                : undefined,
          },
        });
        if (updated?.user) {
          clearPendingAuthRole();
          return mapSupabaseUserToAuthUser(updated.user);
        }
      } catch (err) {
        console.warn('[Supabase] Failed to write role metadata to user profile:', err);
      }
    } else {
      clearPendingAuthRole();
    }

    // Even if the metadata flush failed, honour the portal the user clicked.
    return withPendingPortal(mapSupabaseUserToAuthUser(session.user));
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
      // Apply the clicked portal immediately — the metadata flush above is
      // async, and this event is what boots the portal on the OAuth return.
      callback(withPendingPortal(mapSupabaseUserToAuthUser(session.user)), event);
    } else {
      callback(null, event);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}
