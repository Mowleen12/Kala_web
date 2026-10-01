import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { PortalGateway } from './components/PortalGateway';

// Artist Portal Components
import { HeroSection } from './components/HeroSection';
import { CommunityStatsCard } from './components/CommunityStatsCard';
import { FeaturedOpportunities } from './components/FeaturedOpportunities';
import { BrowseCategories } from './components/BrowseCategories';
import { DashboardWidget } from './components/DashboardWidget';
import { CreateAccountModal } from './components/CreateAccountModal';
import { SignInModal } from './components/SignInModal';
import { OnboardingLoadingScreen } from './components/OnboardingLoadingScreen';
import { ApplyModal } from './components/ApplyModal';
import { OpportunityDetailModal } from './components/OpportunityDetailModal';
import { DiscoverView } from './components/DiscoverView';
import { ApplicationsView } from './components/ApplicationsView';
import { ProfileView, ProfileMedia } from './components/ProfileView';

// Organiser Portal Components
import { OrganiserHeroSection } from './components/OrganiserHeroSection';
import { OrganiserStatsCard } from './components/OrganiserStatsCard';
import { OrganiserDashboardWidget } from './components/OrganiserDashboardWidget';
import { OrganiserFeaturedCalls } from './components/OrganiserFeaturedCalls';
import { OrganiserBrowseCategories } from './components/OrganiserBrowseCategories';
import { OrganiserListingsView } from './components/OrganiserListingsView';
import { OrganiserApplicantsView } from './components/OrganiserApplicantsView';
import { OrganiserTalentScoutView } from './components/OrganiserTalentScoutView';
import { OrganiserProfileView } from './components/OrganiserProfileView';
import { PostOpportunityModal } from './components/PostOpportunityModal';

// Supabase auth & Cloudinary media integrations
import { 
  onSupabaseAuthStateChange, 
  supabaseGetCurrentUser, 
  supabaseSignOut, 
  supabaseSignInWithGoogle,
  isSupabaseConfigured 
} from './lib/supabase';
import { isCloudinaryConfigured } from './lib/cloudinary';
import { getDraft, setDraft } from './lib/drafts';
import {
  isLocalMediaUrl,
  resolveMediaUrl,
  resolveMediaUrlDeep,
  toPersistableDeep,
  toPersistableUrl,
} from './lib/localMedia';
import { ensureArtistThread, findThread, ensureProfile, claimThread, fetchThreads, markRead, isDbReady, subscribeThreads } from './lib/threads';
import { ThreadModal } from './components/ThreadModal';

import { 
  FEATURED_OPPORTUNITIES, 
  INITIAL_APPLICATIONS, 
  INITIAL_USER_STATS,
  INITIAL_ORGANISER_PROFILE,
  INITIAL_ORGANISER_STATS,
  INITIAL_APPLICANT_REVIEWS
} from './data/mockData';
import { 
  NavTab, 
  OrganiserNavTab, 
  PortalMode, 
  Opportunity, 
  Application, 
  UserStats,
  OrganiserProfile,
  OrganiserStats,
  ApplicantReview,
  AuthUser,
  Thread
} from './types';

const profileMediaKey = (userId: string) => `kala_profile_media_${userId}`;
const SESSION_KEY = 'kala_session';

function loadProfileMedia(userId: string): ProfileMedia {
  try {
    const raw = localStorage.getItem(profileMediaKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProfileMedia(userId: string, media: ProfileMedia) {
  try {
    localStorage.setItem(
      profileMediaKey(userId),
      JSON.stringify({
        avatar: toPersistableUrl(media.avatar) || undefined,
        reel: toPersistableUrl(media.reel) || undefined,
        gallery: (media.gallery || [])
          .map((u) => toPersistableUrl(u))
          .filter((u): u is string => Boolean(u)),
      })
    );
  } catch {}
}

/**
 * React state that survives logout/login and reloads. Media fields holding
 * live blob: URLs are written back as stable IndexedDB refs and re-resolved
 * into object URLs when the app boots.
 */
function usePersistedState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {}
    return initial;
  });

  // Turn stored kala-idb: media refs into live object URLs once on boot.
  useEffect(() => {
    let alive = true;
    resolveMediaUrlDeep(value).then((resolved) => {
      if (!alive) return;
      setValue((prev) =>
        JSON.stringify(prev) === JSON.stringify(resolved) ? prev : (resolved as T)
      );
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(toPersistableDeep(value)));
    } catch {}
  }, [key, value]);

  return [value, setValue] as const;
}

/** Human copy for Supabase OAuth callback errors (they are silent otherwise). */
function oauthErrorMessage(code: string, description: string): string {
  if (code === 'access_denied') {
    return 'Google sign-in was cancelled or denied. Please try again and approve the requested access.';
  }
  if (code === 'interaction_required') {
    return 'Google needs you to confirm your account — please try signing in again.';
  }
  return `Google sign-in failed${description ? `: ${description}` : ` (${code})`}. Please try again.`;
}

const storedArtistName = (email?: string) =>
  email ? getDraft<{ name?: string }>(`kala_profile_text_${email}`)?.name : undefined;

function applyStoredArtistName(user: AuthUser): AuthUser {
  const stored = storedArtistName(user.email);
  return user.role === 'artist' && stored ? { ...user, name: stored } : user;
}

const storedOrgName = () => getDraft<Partial<OrganiserProfile>>('kala_org_profile_text')?.name;

export default function App() {
  // Authenticated User State (determines active portal separation).
  // Restored from the last session so sign-out, portal choice and login all
  // survive reloads; fresh visitors land on the demo artist as before.
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw === 'signed_out') return null;
      if (raw) return JSON.parse(raw) as AuthUser;
    } catch {}
    return {
      id: 'user-mowleen',
      name: 'Mowleen',
      email: 'mowleen2006@gmail.com',
      role: 'artist',
      discipline: 'Classical & Contemporary Vocalist',
    };
  });

  // Persist every login/logout (including demo and Google) so the next visit
  // lands exactly where this one left off.
  useEffect(() => {
    try {
      localStorage.setItem(
        SESSION_KEY,
        currentUser ? JSON.stringify(toPersistableDeep(currentUser)) : 'signed_out'
      );
    } catch {}
  }, [currentUser]);

  // Current active portal mode is strictly driven by currentUser's role
  const portalMode: PortalMode = currentUser?.role || 'artist';

  // Navigation State
  const [currentArtistTab, setCurrentArtistTab] = useState<NavTab>('home');
  const [currentOrgTab, setCurrentOrgTab] = useState<OrganiserNavTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [openFiltersInitially, setOpenFiltersInitially] = useState<boolean>(false);
  const [selectedOrgCategory, setSelectedOrgCategory] = useState<string>('All');
  const [openOrgFiltersInitially, setOpenOrgFiltersInitially] = useState<boolean>(false);
  
  // Modals & Popups State
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [signUpInitialRole, setSignUpInitialRole] = useState<PortalMode>('artist');
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [signInInitialRole, setSignInInitialRole] = useState<PortalMode>('artist');
  const [isLoadingScreenOpen, setIsLoadingScreenOpen] = useState(false);
  const [loadingScreenMessage, setLoadingScreenMessage] = useState({
    title: "Almost there...",
    subtitle: "We're setting up your creative space."
  });

  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  // Artist User State — persisted so applications, calls and stats made in one
  // session are still there after logout/login or a reload.
  const [userName, setUserName] = useState('Mowleen');
  const [userStats, setUserStats] = usePersistedState<UserStats>(
    'kala_user_stats',
    INITIAL_USER_STATS
  );
  const [applications, setApplications] = usePersistedState<Application[]>(
    'kala_applications',
    INITIAL_APPLICATIONS
  );
  const [opportunities, setOpportunities] = usePersistedState<Opportunity[]>(
    'kala_opportunities',
    FEATURED_OPPORTUNITIES
  );

  // Organiser State
  const [organiserProfile, setOrganiserProfile] = useState<OrganiserProfile>(() => ({
    ...INITIAL_ORGANISER_PROFILE,
    ...getDraft<Partial<OrganiserProfile>>('kala_org_profile_text'),
  }));
  const [organiserStats, setOrganiserStats] = usePersistedState<OrganiserStats>(
    'kala_organiser_stats',
    INITIAL_ORGANISER_STATS
  );
  const [applicantReviews, setApplicantReviews] = usePersistedState<ApplicantReview[]>(
    'kala_applicant_reviews',
    INITIAL_APPLICANT_REVIEWS
  );

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);

  // Per-user profile media (avatar / reel / gallery) persisted across sessions
  const [profileMedia, setProfileMedia] = useState<ProfileMedia>({});

  // Supabase Auth State Synchronization & OAuth Callback Handling
  useEffect(() => {
    // 1. If this window was opened as a popup for Supabase Google OAuth, notify opener and close
    if (window.opener && window.opener !== window) {
      supabaseGetCurrentUser().then((user) => {
        if (user) {
          try {
            window.opener.postMessage({ type: 'KALA_AUTH_SUCCESS', user }, '*');
          } catch {}
          setTimeout(() => {
            try {
              window.close();
            } catch {}
          }, 300);
        }
      });
    }

    // 2. Surface OAuth callback failures — without this a failed Google
    //    sign-in dies silently and the user just sees the app unchanged.
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const oauthError =
      hashParams.get('error') ||
      new URLSearchParams(window.location.search).get('error') ||
      new URLSearchParams(window.location.search).get('error_code');
    if (oauthError) {
      showToast(
        oauthErrorMessage(oauthError, hashParams.get('error_description') || '')
      );
    }

    // 3. Clean URL hash and search query once Supabase processes OAuth tokens
    if (
      window.location.hash.includes('access_token=') ||
      window.location.hash.includes('error=') ||
      window.location.search.includes('code=') ||
      oauthError
    ) {
      setTimeout(() => {
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {}
      }, 1000);
    }

    // 4. Check existing session on load
    supabaseGetCurrentUser().then((rawUser) => {
      const user = rawUser && applyStoredArtistName(rawUser);
      if (user) {
        setCurrentUser(user);
        if (user.role === 'artist' && user.name) {
          setUserName(user.name);
        }
      }
    });

    // 5. Subscribe to realtime auth state changes from Supabase
    const unsubscribe = onSupabaseAuthStateChange((rawUser, event) => {
      const user = rawUser && applyStoredArtistName(rawUser);
      if (user) {
        setCurrentUser(user);
        if (user.role === 'artist' && user.name) {
          setUserName(user.name);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Restore persisted profile media (avatar / reel / gallery) whenever the
  // signed-in user changes, resolving stored IndexedDB refs into live object
  // URLs and mirroring the avatar into the header / organiser logo.
  useEffect(() => {
    if (!currentUser) {
      setProfileMedia({});
      return;
    }
    let alive = true;
    (async () => {
      const stored = await resolveMediaUrlDeep(loadProfileMedia(currentUser.id));
      const rawAvatar = currentUser.avatarUrl || currentUser.avatar;
      const resolvedAvatar =
        ((await resolveMediaUrl(rawAvatar)) as string | undefined) || rawAvatar;
      if (!alive) return;
      setProfileMedia(stored);
      setCurrentUser((prev) => {
        if (!prev || prev.id !== currentUser.id) return prev;
        const mirrorAvatar = stored.avatar || resolvedAvatar;
        if (mirrorAvatar && mirrorAvatar !== (prev.avatarUrl || prev.avatar)) {
          return { ...prev, avatar: mirrorAvatar, avatarUrl: mirrorAvatar };
        }
        return prev;
      });
      if (currentUser.role === 'organiser') {
        const logo = stored.avatar || resolvedAvatar;
        if (logo) {
          setOrganiserProfile((prev) => (prev.logo === logo ? prev : { ...prev, logo }));
        }
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const handleProfileMediaChange = (patch: ProfileMedia) => {
    if (!currentUser) return;
    const next = { ...profileMedia, ...patch };
    setProfileMedia(next);
    saveProfileMedia(currentUser.id, next);
    if ('avatar' in patch) {
      setCurrentUser((prev) =>
        prev ? { ...prev, avatarUrl: patch.avatar || prev.avatarUrl } : prev
      );
    }
  };

  // Profile row (RLS needs it for role checks) + the caller's thread list, which
  // is what both unread pills read. Keyed on the user id so it covers every login
  // path: initial demo user, quick demo login, and the Supabase auth callback.
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    let unsubscribe: (() => void) | null = null;
    (async () => {
      await ensureProfile(currentUser).catch(() => {});
      const fresh = await fetchThreads();
      if (!active) return;
      setThreads(fresh);
      if (!(await isDbReady()) || !active) return;
      unsubscribe = subscribeThreads(() => {
        fetchThreads().then((t) => {
          if (active) setThreads(t);
        });
      });
    })();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [currentUser?.id]);

  // Toast System
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sign in & Sign up Handlers
  const handleOpenSignUp = (initialRole: PortalMode = 'artist') => {
    setSignUpInitialRole(initialRole);
    setIsSignUpOpen(true);
  };

  const handleOpenSignIn = (initialRole: PortalMode = 'artist') => {
    setSignInInitialRole(initialRole);
    setIsSignInOpen(true);
  };

  const handleSignInSuccess = (user: AuthUser) => {
    setIsSignInOpen(false);
    const resolved = applyStoredArtistName(user);
    setCurrentUser(resolved);

    if (resolved.role === 'artist') {
      setUserName(resolved.name);
      setCurrentArtistTab('home');
      showToast(`Welcome back, ${resolved.name}! Logged into Artist Portal.`);
    } else {
      setOrganiserProfile(prev => ({
        ...prev,
        name: storedOrgName() || resolved.orgName || prev.name,
        logo: resolved.avatarUrl || resolved.avatar || prev.logo,
      }));
      setCurrentOrgTab('overview');
      showToast(`Welcome back! Logged into Organiser Portal for ${resolved.orgName || 'your venue'}.`);
    }
  };

  const handleSignUpSuccess = (userData: { 
    id?: string;
    name: string; 
    email: string; 
    role: PortalMode; 
    orgName?: string;
    discipline?: string;
    avatar?: string;
    avatarUrl?: string;
  }) => {
    setIsSignUpOpen(false);

    const effectiveAvatar = userData.avatarUrl || userData.avatar;
    const newUser: AuthUser = applyStoredArtistName({
      id: userData.id || `user-${Date.now()}`,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      orgName: userData.orgName,
      discipline: userData.discipline,
      avatarUrl: effectiveAvatar,
    });

    setCurrentUser(newUser);

    if (userData.role === 'artist') {
      setUserName(newUser.name);
      setLoadingScreenMessage({
        title: "Almost there...",
        subtitle: `Welcome to the Artist Portal, ${newUser.name}! We're preparing your audition portfolio.`
      });
      setCurrentArtistTab('home');
    } else {
      setOrganiserProfile(prev => ({
        ...prev,
        name: storedOrgName() || userData.orgName || prev.name,
        logo: effectiveAvatar || prev.logo,
      }));
      setLoadingScreenMessage({
        title: "Configuring curatorial desk...",
        subtitle: `Welcome, ${userData.name}! Preparing production pipeline for ${userData.orgName || 'your venue'}.`
      });
      setCurrentOrgTab('overview');
    }

    setIsLoadingScreenOpen(true);
  };

  const handleQuickDemoLogin = (role: PortalMode) => {
    if (role === 'artist') {
      const artistUser: AuthUser = applyStoredArtistName({
        id: 'user-mowleen',
        name: 'Mowleen',
        email: 'mowleen2006@gmail.com',
        role: 'artist',
        discipline: 'Classical & Contemporary Vocalist',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=140&q=80',
      });
      setCurrentUser(artistUser);
      setUserName(artistUser.name);
      setCurrentArtistTab('home');
      showToast(`Logged in to Artist Portal as ${artistUser.name}`);
    } else {
      const orgUser: AuthUser = {
        id: 'user-ncpa',
        name: 'Dr. Suvarnalata Rao',
        email: 'auditions@ncpamumbai.com',
        role: 'organiser',
        orgName: 'NCPA Mumbai',
        avatarUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=140&q=80',
      };
      setCurrentUser(orgUser);
      setCurrentOrgTab('overview');
      showToast("Logged in to Organiser & Venue Portal as NCPA Mumbai");
    }
  };

  const handleSignOut = async () => {
    const prevRole = currentUser?.role;
    try {
      await supabaseSignOut();
    } catch {
      // Ignore
    }
    setCurrentUser(null);
    showToast(`Signed out of ${prevRole === 'artist' ? 'Artist' : 'Organiser'} Portal. Select a portal to log in.`);
  };

  const handleSwitchPortalAccount = (targetPortal: PortalMode) => {
    handleQuickDemoLogin(targetPortal);
  };

  const handleLoadingComplete = () => {
    setIsLoadingScreenOpen(false);
    if (currentUser?.role === 'artist') {
      showToast(`Welcome to the Artist Portal, ${currentUser.name}! Your portfolio is live.`);
    } else {
      showToast(`Welcome to the Organiser Portal, ${currentUser?.orgName || 'Curator'}!`);
    }
  };

  const openArtistThread = async (opportunityId: string) => {
    const opp = opportunities.find((o) => o.id === opportunityId);
    const { thread, error } = await ensureArtistThread({
      opportunityId,
      opportunityTitle: opp?.title || 'Opportunity',
      user: currentUser!,
      organiserName: opp?.organizer,
    });
    if (thread) {
      setThreads((prev) => (prev.some((t) => t.id === thread.id) ? prev : [...prev, thread]));
      setActiveThread(thread);
    } else {
      showToast(error || "Couldn't open this conversation.");
    }
  };

  const openOrganiserThread = async (opportunityId: string, artistId: string) => {
    let thread = await findThread(opportunityId, artistId);
    if (!thread) {
      showToast('This applicant has not started a conversation yet.');
      return;
    }
    if (thread.organiserId !== currentUser?.id) {
      await claimThread(thread.id, currentUser!);
      thread = { ...thread, organiserId: currentUser!.id };
    }
    setThreads((prev) => prev.map((t) => (t.id === thread.id ? thread : t)));
    setActiveThread(thread);
  };

  // Close = mark read first, then refetch. Sequenced with await so the unread
  // pill can never read the list before the write lands.
  const closeThread = async () => {
    const t = activeThread;
    setActiveThread(null);
    if (t && currentUser) {
      await markRead(t.id, currentUser.role === 'organiser' ? 'organiser' : 'artist');
      setThreads(await fetchThreads());
    }
  };

  // Artist Opportunity Interaction Handlers
  const handleApplyClick = (opp: Opportunity) => {
    setSelectedOpportunity(opp);
    setIsApplyOpen(true);
  };

  const handleViewDetails = (opp: Opportunity) => {
    setSelectedOpportunity(opp);
    setIsDetailOpen(true);
  };

  const handleSubmitApplication = (opp: Opportunity, appData: any) => {
    const newApp: Application = {
      id: `app-${Date.now().toString().slice(-4)}`,
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      category: opp.category,
      location: opp.location.split('•')[0].trim(),
      appliedDate: 'Just now',
      status: 'submitted',
      compensation: opp.compensation,
      mediaUrl: appData?.reelUrl,
      fileName: appData?.fileName,
    };

    setApplications([newApp, ...applications]);
    setUserStats(prev => ({
      ...prev,
      applications: prev.applications + 1
    }));

    // If applied, also simulate adding to Organiser pipeline
    const newReview: ApplicantReview = {
      id: `rev-${Date.now().toString().slice(-4)}`,
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      artistId: currentUser?.id,
      artistName: userName,
      artistAvatar: currentUser?.avatarUrl || currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=140&q=80',
      artistRole: currentUser?.discipline || 'Contemporary Vocalist & Composer',
      artistLocation: 'Mumbai, Maharashtra',
      appliedDate: 'Just now',
      experienceYears: 4,
      skills: ['Carnatic Vocals', 'Sitar', 'Live Improvisation'],
      pitch: appData?.statement || 'Eager to perform on the prestigious stage.',
      status: 'under_review',
      rating: 4.8,
      reelUrl: appData?.reelUrl,
      portfolioUrl: appData?.portfolioUrl || undefined,
    };
    setApplicantReviews(prev => [newReview, ...prev]);
    setOrganiserStats(prev => ({
      ...prev,
      totalApplicants: prev.totalApplicants + 1,
      underReview: prev.underReview + 1,
    }));

    showToast(`Application successfully sent to ${opp.title}!`);
  };

  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName);
    setCurrentArtistTab('discover');
  };

  const handleSelectOrgCategory = (catName: string) => {
    setSelectedOrgCategory(catName);
    setCurrentOrgTab('listings');
    setOpenOrgFiltersInitially(true);
  };

  // Organiser Handlers
  const handlePublishOpportunity = (newOpp: Opportunity) => {
    setOpportunities([newOpp, ...opportunities]);
    setOrganiserStats(prev => ({
      ...prev,
      activeListings: prev.activeListings + 1,
    }));
    setIsPostModalOpen(false);
    showToast(`Call published! "${newOpp.title}" is now live for all creators.`);
    setCurrentOrgTab('listings');
  };

  const handleUpdateApplicantStatus = (reviewId: string, newStatus: ApplicantReview['status']) => {
    setApplicantReviews(prev =>
      prev.map(rev => (rev.id === reviewId ? { ...rev, status: newStatus } : rev))
    );

    const statusLabels: Record<ApplicantReview['status'], string> = {
      under_review: 'marked as Under Review',
      interview: 'scheduled for live audition soundcheck',
      selected: 'selected for performance commission',
      rejected: 'archived',
    };

    showToast(`Applicant status updated: ${statusLabels[newStatus] || newStatus}`);
  };

  const handleInviteArtist = (artistName: string, oppTitle: string) => {
    showToast(`Audition invitation dispatched to ${artistName} for "${oppTitle}"!`);
  };

  const handleGoogleAuth = async (portal: PortalMode, isSignUp: boolean = false) => {
    try {
      const { user, error, redirected } = await supabaseSignInWithGoogle(portal, { isSignUp });
      if (redirected) return;
      if (user) {
        handleSignInSuccess(user);
      } else if (error) {
        showToast(error);
      }
    } catch (e: any) {
      showToast(e?.message || 'Google authentication failed');
    }
  };

  // =========================================================================
  // IF USER IS NOT LOGGED IN: SHOW DEDICATED PORTAL SELECTION / SIGN-IN GATEWAY
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-zinc-900">
        <PortalGateway
          onSelectPortal={(portal) => handleOpenSignIn(portal)}
          onOpenRegister={(portal) => handleOpenSignUp(portal)}
          onQuickDemoLogin={(portal) => handleQuickDemoLogin(portal)}
          onGoogleLogin={(portal, isSignUp) => handleGoogleAuth(portal, isSignUp)}
        />
        <SignInModal
          isOpen={isSignInOpen}
          initialRole={signInInitialRole}
          onClose={() => setIsSignInOpen(false)}
          onSuccess={handleSignInSuccess}
          onDemoLogin={handleQuickDemoLogin}
          onSwitchToSignUp={(role?: PortalMode) => {
            setIsSignInOpen(false);
            handleOpenSignUp(role || 'artist');
          }}
        />
        <CreateAccountModal
          isOpen={isSignUpOpen}
          initialRole={signUpInitialRole}
          onClose={() => setIsSignUpOpen(false)}
          onSuccess={handleSignUpSuccess}
        />
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-5 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-medium flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-200">
            <div className="w-2 h-2 rounded-full bg-[#E45826]" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // LOGGED-IN PORTAL WORKSPACE: SEPARATED BY CURRENT USER'S ROLE
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-zinc-900 flex flex-col lg:flex-row antialiased">
      {/* Role-Scoped Persistent Responsive Sidebar */}
      <Sidebar
        portalMode={portalMode}
        currentTab={currentArtistTab}
        currentOrgTab={currentOrgTab}
        onSelectArtistTab={setCurrentArtistTab}
        onSelectOrgTab={setCurrentOrgTab}
        onOpenSignUp={() => handleOpenSignUp(portalMode)}
        onSwitchPortalAccount={handleSwitchPortalAccount}
        onPostOpportunity={() => setIsPostModalOpen(true)}
        orgName={currentUser.orgName || organiserProfile.name}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        {/* Top Header Bar with Scoped Portal Indicator and User Menu */}
        <Header
          portalMode={portalMode}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            if (q.trim()) {
              if (portalMode === 'artist' && currentArtistTab !== 'discover') {
                setCurrentArtistTab('discover');
              } else if (portalMode === 'organiser' && currentOrgTab !== 'listings') {
                setCurrentOrgTab('listings');
              }
            }
          }}
          onToggleFilters={() => {
            if (portalMode === 'artist') {
              setCurrentArtistTab('discover');
              setOpenFiltersInitially(prev => !prev);
            } else {
              setCurrentOrgTab('listings');
              setOpenOrgFiltersInitially(prev => !prev);
            }
          }}
          onSelectArtistTab={setCurrentArtistTab}
          onSelectOrgTab={setCurrentOrgTab}
          onOpenSignUp={() => handleOpenSignUp(portalMode)}
          onOpenSignIn={() => handleOpenSignIn(portalMode)}
          onSignOut={handleSignOut}
          onSwitchPortalAccount={handleSwitchPortalAccount}
          userName={currentUser.name}
          userEmail={currentUser.email}
          orgName={currentUser.orgName || organiserProfile.name}
          avatarUrl={currentUser.avatarUrl || currentUser.avatar}
          authProvider={currentUser.authProvider}
        />

        {/* Dynamic Main Body Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1580px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${portalMode}-${portalMode === 'artist' ? currentArtistTab : currentOrgTab}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
          {/* ========================================================================= */}
          {/* 1. ARTIST PORTAL VIEWS (Active when user logs in as Artist) */}
          {/* ========================================================================= */}
          {portalMode === 'artist' && (
            <>
              {currentArtistTab === 'home' && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  {/* Top Hero & Community Metrics Cluster */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                    {/* Main Hero (8 cols on XL) */}
                    <div className="xl:col-span-8 bg-transparent">
                      <HeroSection
                        onExplore={() => setCurrentArtistTab('discover')}
                        onJoin={() => handleOpenSignUp('artist')}
                      />
                    </div>

                    {/* Community Metrics Card (4 cols on XL) */}
                    <div className="xl:col-span-4">
                      <CommunityStatsCard
                        onJoin={() => setCurrentArtistTab('discover')}
                      />
                    </div>
                  </div>

                  {/* Lower 2-Column Split: Opportunities & Categories vs. Dashboard Widget */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    {/* Left/Center Column (8 cols on XL) */}
                    <div className="xl:col-span-8 space-y-6">
                      {/* Featured Opportunities Section */}
                      <FeaturedOpportunities
                        opportunities={opportunities}
                        onApply={handleApplyClick}
                        onViewDetails={handleViewDetails}
                        onViewAll={() => setCurrentArtistTab('discover')}
                      />

                      {/* Browse Categories Section */}
                      <BrowseCategories
                        selectedCategory={selectedCategory}
                        onSelectCategory={handleSelectCategory}
                        onViewAll={() => setCurrentArtistTab('discover')}
                      />
                    </div>

                    {/* Right Column: Your Dashboard & Bottom Promo Banner (4 cols on XL) */}
                    <div className="xl:col-span-4 sticky top-20">
                      <DashboardWidget
                        stats={userStats}
                        userName={currentUser.name}
                        onViewAll={() => setCurrentArtistTab('applications')}
                        onFindAuditions={() => setCurrentArtistTab('discover')}
                        onContinueApplications={() => setCurrentArtistTab('applications')}
                        onCompleteProfile={() => setCurrentArtistTab('profile')}
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentArtistTab === 'discover' && (
                <DiscoverView
                  opportunities={opportunities}
                  initialCategory={selectedCategory}
                  isOpenFiltersInitially={openFiltersInitially}
                  onApply={handleApplyClick}
                  onViewDetails={handleViewDetails}
                />
              )}

              {currentArtistTab === 'applications' && (
                <ApplicationsView
                  applications={applications}
                  opportunities={opportunities}
                  threads={threads}
                  onOpenThread={openArtistThread}
                  onExplore={() => setCurrentArtistTab('discover')}
                />
              )}

              {currentArtistTab === 'profile' && (
                <ProfileView
                  completion={userStats.profileCompletion}
                  userName={currentUser.name}
                  userEmail={currentUser.email}
                  avatarUrl={currentUser.avatarUrl || currentUser.avatar}
                  profileMedia={profileMedia}
                  onProfileMediaChange={handleProfileMediaChange}
                  onProfileTextSaved={(name) => {
                    setCurrentUser(prev => (prev ? { ...prev, name } : prev));
                    setUserName(name);
                    showToast('Profile updated!');
                  }}
                  onUpdateCompletion={(newVal: number) => {
                    setUserStats(prev => ({ ...prev, profileCompletion: newVal }));
                    showToast('Profile completion updated!');
                  }}
                />
              )}
            </>
          )}

          {/* ========================================================================= */}
          {/* 2. ORGANISER PORTAL VIEWS (Active when user logs in as Host/Organiser) */}
          {/* ========================================================================= */}
          {portalMode === 'organiser' && (
            <>
              {currentOrgTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  {/* Top Hero & Metrics Cluster for Hosts */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                    {/* Organiser Hero (8 cols on XL) */}
                    <div className="xl:col-span-8 bg-transparent">
                      <OrganiserHeroSection
                        onPostOpportunity={() => setIsPostModalOpen(true)}
                        onReviewApplicants={() => setCurrentOrgTab('applicants')}
                      />
                    </div>

                    {/* Organiser Stats Card (4 cols on XL) */}
                    <div className="xl:col-span-4">
                      <OrganiserStatsCard
                        onPostCall={() => setIsPostModalOpen(true)}
                      />
                    </div>
                  </div>

                  {/* Lower 2-Column Split: Active Calls & Curatorial Departments vs. Organiser Actions */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    {/* Left/Center Column: Active Calls & Curatorial Departments (8 cols on XL) */}
                    <div className="xl:col-span-8 space-y-6">
                      {/* Active Production Calls Section */}
                      <OrganiserFeaturedCalls
                        opportunities={opportunities}
                        onReviewOpportunityApplicants={(opp) => {
                          setCurrentOrgTab('applicants');
                        }}
                        onViewOpportunityDetails={(opp) => {
                          setSelectedOpportunity(opp);
                          setIsDetailOpen(true);
                        }}
                        onViewAll={() => setCurrentOrgTab('listings')}
                      />

                      {/* Browse by Curatorial Department Section */}
                      <OrganiserBrowseCategories
                        selectedCategory={selectedOrgCategory}
                        onSelectCategory={handleSelectOrgCategory}
                        onViewAll={() => setCurrentOrgTab('listings')}
                      />
                    </div>

                    {/* Right Column: Organiser Dashboard Action Center (4 cols on XL) */}
                    <div className="xl:col-span-4 sticky top-20">
                      <OrganiserDashboardWidget
                        stats={organiserStats}
                        profile={organiserProfile}
                        onPostOpportunity={() => setIsPostModalOpen(true)}
                        onReviewApplicants={() => setCurrentOrgTab('applicants')}
                        onScoutTalent={() => setCurrentOrgTab('scout')}
                        onViewListings={() => setCurrentOrgTab('listings')}
                        onViewProfile={() => setCurrentOrgTab('org_profile')}
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentOrgTab === 'listings' && (
                <OrganiserListingsView
                  opportunities={opportunities}
                  initialCategory={selectedOrgCategory}
                  isOpenFiltersInitially={openOrgFiltersInitially}
                  onPostOpportunity={() => setIsPostModalOpen(true)}
                  onReviewOpportunityApplicants={(opp) => {
                    setCurrentOrgTab('applicants');
                  }}
                  onViewOpportunityDetails={(opp) => {
                    setSelectedOpportunity(opp);
                    setIsDetailOpen(true);
                  }}
                />
              )}

              {currentOrgTab === 'applicants' && (
                <OrganiserApplicantsView
                  applicants={applicantReviews}
                  threads={threads}
                  opportunities={opportunities}
                  onOpenThread={openOrganiserThread}
                  onUpdateApplicantStatus={handleUpdateApplicantStatus}
                />
              )}

              {currentOrgTab === 'scout' && (
                <OrganiserTalentScoutView
                  opportunities={opportunities}
                  onInviteArtist={handleInviteArtist}
                />
              )}

              {currentOrgTab === 'org_profile' && (
                <OrganiserProfileView
                  profile={organiserProfile}
                  onUpdateProfile={(updated) => {
                    setOrganiserProfile(updated);
                    setDraft('kala_org_profile_text', updated);
                    showToast('Venue profile updated successfully!');
                  }}
                />
              )}
            </>
          )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Floating Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 lg:bottom-6 right-6 z-50 bg-zinc-900 text-white px-5 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-medium flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-200">
          <div className="w-2 h-2 rounded-full bg-[#E45826]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals & Full Screens */}
      {/* 1. Account Creation Modal (Matching Role & Portal Selection) */}
      <CreateAccountModal
        isOpen={isSignUpOpen}
        initialRole={signUpInitialRole}
        onClose={() => setIsSignUpOpen(false)}
        onSuccess={handleSignUpSuccess}
      />

      {/* 1b. Sign In Modal */}
      <SignInModal
        isOpen={isSignInOpen}
        initialRole={signInInitialRole}
        onClose={() => setIsSignInOpen(false)}
        onSuccess={handleSignInSuccess}
        onDemoLogin={handleQuickDemoLogin}
        onSwitchToSignUp={(role?: PortalMode) => {
          setIsSignInOpen(false);
          handleOpenSignUp(role || 'artist');
        }}
      />

      <ThreadModal
        isOpen={activeThread !== null}
        onClose={closeThread}
        thread={activeThread}
        currentUser={currentUser}
      />

      {/* 2. Onboarding / Loading Transition Screen */}
      {isLoadingScreenOpen && (
        <OnboardingLoadingScreen
          onComplete={handleLoadingComplete}
          title={loadingScreenMessage.title}
          subtitle={loadingScreenMessage.subtitle}
        />
      )}

      {/* 3. Apply Opportunity Modal */}
      <ApplyModal
        opportunity={selectedOpportunity}
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        onSubmitApplication={handleSubmitApplication}
        userName={userName}
      />

      {/* 4. Opportunity Detail Modal */}
      <OpportunityDetailModal
        opportunity={selectedOpportunity}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onApply={handleApplyClick}
      />

      {/* 5. Organiser Post New Opportunity Call Modal */}
      <PostOpportunityModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onPublish={handlePublishOpportunity}
        organizerName={organiserProfile.name}
      />
    </div>
  );
}
