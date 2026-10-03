import React, { useState, useEffect, useMemo } from 'react';
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
import { KalaStar } from './components/KalaLogo';

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
import { ensureArtistThread, findThread, ensureProfile, claimThread, fetchThreads, markRead, isDbReady, subscribeThreads, sendMessage, isUnread } from './lib/threads';
import {
  fetchOpportunities,
  fetchApplications,
  applyToOpportunity,
  createOpportunity,
  updateApplicationStatus,
  fetchPlatformStats,
  fetchCategoryCounts,
  schemaMissing,
} from './lib/listings';
import { computeProfileCompletion, initialProfileCompletion, loadProfileSkills, loadProfileText } from './lib/profile';
import { ThreadModal } from './components/ThreadModal';

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
  PlatformStats,
  Thread
} from './types';

const profileMediaKey = (userId: string) => `kala_profile_media_${userId}`;
const orgProfileKey = (userId: string) => `kala_org_profile_${userId}`;
const profileTextKey = (userId: string) => `kala_profile_text_${userId}`;
const profileSkillsKey = (userId: string) => `kala_skills_${userId}`;

const EMPTY_ORGANISER_PROFILE: OrganiserProfile = {
  id: '',
  name: '',
  handle: '',
  tagline: '',
  logo: '',
  coverImage: '',
  city: '',
  state: '',
  about: '',
  focusDisciplines: [],
};

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

/** A profile name the user edited locally wins over signup metadata on reload. */
function applyStoredProfileName(user: AuthUser): AuthUser {
  const stored = user.role === 'artist' ? loadProfileText(user.id).name : undefined;
  return stored ? { ...user, name: stored } : user;
}

export default function App() {
  // Supabase is the only source of a session — localStorage cannot log you in.
  // authReady keeps the gateway from flashing while the session is resolved.
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

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

  // Domain data — always loaded from Supabase (RLS-scoped to this user),
  // never from localStorage seeds. Empty until the first fetch resolves.
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [dataError, setDataError] = useState<string | null>(null);
  const [listingsLoaded, setListingsLoaded] = useState(false);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);

  // Per-user profile media (avatar / reel / gallery) persisted across sessions
  const [profileMedia, setProfileMedia] = useState<ProfileMedia>({});

  // Profile completion is recomputed from real fields; the override only
  // exists so ProfileView edits reflect instantly without a refetch.
  const [profileCompletionOverride, setProfileCompletionOverride] = useState<number | null>(null);

  // Organiser venue profile is a localStorage draft keyed by user id,
  // re-derived whenever the draft version bumps.
  const [orgProfileVersion, setOrgProfileVersion] = useState(0);
  // Draft media URLs are stored as kala-idb: refs — resolved back into live
  // object URLs (null until the first resolution lands).
  const [orgMedia, setOrgMedia] = useState<{ logo?: string; coverImage?: string } | null>(null);
  const organiserProfile = useMemo<OrganiserProfile>(() => {
    if (!currentUser) return EMPTY_ORGANISER_PROFILE;
    const draft = getDraft<Partial<OrganiserProfile>>(orgProfileKey(currentUser.id)) || {};
    const logo =
      (orgMedia?.logo ?? draft.logo) || profileMedia.avatar || currentUser.avatarUrl || currentUser.avatar || '';
    return {
      ...EMPTY_ORGANISER_PROFILE,
      id: currentUser.id,
      name: currentUser.orgName || '',
      ...draft,
      logo,
      coverImage: orgMedia ? orgMedia.coverImage || '' : draft.coverImage || '',
    };
  }, [currentUser, profileMedia, orgProfileVersion, orgMedia]);

  useEffect(() => {
    if (!currentUser) {
      setOrgMedia(null);
      return;
    }
    let alive = true;
    (async () => {
      const draft = getDraft<Partial<OrganiserProfile>>(orgProfileKey(currentUser.id)) || {};
      const resolved = await resolveMediaUrlDeep({
        logo: draft.logo || '',
        coverImage: draft.coverImage || '',
      });
      if (alive) setOrgMedia(resolved);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, orgProfileVersion]);

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

    // 4. Check existing session on load — the Supabase session is the only
    //    source of truth; no localStorage fallback, no fabricated user.
    supabaseGetCurrentUser().then((rawUser) => {
      setCurrentUser(rawUser ? applyStoredProfileName(rawUser) : null);
      setAuthReady(true);
    });

    // 5. Subscribe to realtime auth state changes from Supabase
    const unsubscribe = onSupabaseAuthStateChange((rawUser, event) => {
      const user = rawUser && applyStoredProfileName(rawUser);
      if (user) {
        setCurrentUser(user);
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
      // Organiser logo derives from the avatar inside organiserProfile memo.
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

  // Domain data — keyed on the signed-in user, cleared on logout. Failures
  // surface as a dismissible warning rather than fabricating content.
  useEffect(() => {
    if (!currentUser) {
      setOpportunities([]);
      setApplications([]);
      setPlatformStats(null);
      setCategoryCounts({});
      setDataError(null);
      setListingsLoaded(false);
      setProfileCompletionOverride(null);
      return;
    }
    let alive = true;
    (async () => {
      const [opps, apps, stats, cats] = await Promise.all([
        fetchOpportunities(),
        fetchApplications(),
        fetchPlatformStats(),
        fetchCategoryCounts(),
      ]);
      if (!alive) return;
      setOpportunities(opps.data);
      setApplications(apps.data);
      setPlatformStats(stats);
      setCategoryCounts(cats);
      setDataError(
        opps.error ||
          apps.error ||
          (schemaMissing()
            ? 'Database tables missing — run section 5 of supabase/schema.sql in the Supabase SQL editor.'
            : null)
      );
      setListingsLoaded(true);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Completion is derived from real profile fields; ProfileView reports live
  // edits into profileCompletionOverride so changes show without a refetch.
  const profileCompletion =
    profileCompletionOverride ??
    (currentUser ? initialProfileCompletion(currentUser.id, profileMedia, currentUser.name) : 0);

  // RLS returns: an artist's own applications, plus applications to an
  // organiser's own calls. Split them by ownership before deriving stats.
  const myApplications = useMemo(
    () => (currentUser ? applications.filter((a) => a.artistId === currentUser.id) : []),
    [applications, currentUser]
  );
  const appliedOppIds = useMemo(
    () => new Set(myApplications.map((a) => a.opportunityId)),
    [myApplications]
  );
  const myOpportunities = useMemo(
    () => (currentUser ? opportunities.filter((o) => o.organiserId === currentUser.id) : []),
    [opportunities, currentUser]
  );
  const myOppIds = useMemo(() => new Set(myOpportunities.map((o) => o.id)), [myOpportunities]);
  const myApplicants = useMemo(
    () => applications.filter((a) => myOppIds.has(a.opportunityId)),
    [applications, myOppIds]
  );

  const userStats: UserStats = useMemo(
    () => ({
      applications: myApplications.length,
      interviews: myApplications.filter((a) => a.status === 'interview').length,
      selected: myApplications.filter((a) => a.status === 'selected').length,
      rejected: myApplications.filter((a) => a.status === 'rejected').length,
      profileCompletion,
    }),
    [myApplications, profileCompletion]
  );

  const organiserStats: OrganiserStats = useMemo(
    () => ({
      activeListings: myOpportunities.filter((o) => o.status === 'active').length,
      totalApplicants: myApplicants.length,
      underReview: myApplicants.filter((a) => a.status === 'under_review').length,
      interviewScheduled: myApplicants.filter((a) => a.status === 'interview').length,
      selectedArtists: myApplicants.filter((a) => a.status === 'selected').length,
    }),
    [myOpportunities, myApplicants]
  );

  const orgCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of myOpportunities) counts[o.category] = (counts[o.category] || 0) + 1;
    return counts;
  }, [myOpportunities]);

  const orgCategoryApplicantCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of myApplicants) counts[a.category] = (counts[a.category] || 0) + 1;
    return counts;
  }, [myApplicants]);

  // Profile row (RLS needs it for role checks) + the caller's thread list, which
  // is what both unread pills read. Keyed on the user id so it covers every login
  // path: login via the gateway, and the Supabase auth callback.
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
    const resolved = applyStoredProfileName(user);
    setCurrentUser(resolved);

    if (resolved.role === 'artist') {
      setCurrentArtistTab('home');
      showToast(`Welcome back, ${resolved.name}! Logged into Artist Portal.`);
    } else {
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
    const newUser: AuthUser = applyStoredProfileName({
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
      setLoadingScreenMessage({
        title: "Almost there...",
        subtitle: `Welcome to the Artist Portal, ${newUser.name}! We're preparing your audition portfolio.`
      });
      setCurrentArtistTab('home');
    } else {
      setLoadingScreenMessage({
        title: "Configuring curatorial desk...",
        subtitle: `Welcome, ${userData.name}! Preparing production pipeline for ${userData.orgName || 'your venue'}.`
      });
      setCurrentOrgTab('overview');
    }

    setIsLoadingScreenOpen(true);
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

  const handleSwitchPortalAccount = (_targetPortal: PortalMode) => {
    // Demo logins are gone: switching portals means signing out and logging
    // in again on the other side.
    handleSignOut();
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

  const handleSubmitApplication = async (
    opp: Opportunity,
    appData: {
      statement?: string;
      reelUrl?: string | null;
      fileName?: string | null;
      portfolioUrl?: string | null;
      experienceYears?: number;
      skills?: string[];
      city?: string;
    }
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!currentUser) return { ok: false, error: 'Please sign in to apply.' };
    if (appliedOppIds.has(opp.id)) {
      return { ok: false, error: 'You have already applied to this opportunity.' };
    }
    const { data, error } = await applyToOpportunity({
      opportunityId: opp.id,
      artistName: currentUser.name,
      artistAvatar: currentUser.avatarUrl || currentUser.avatar,
      artistRole: currentUser.discipline || null,
      artistLocation: appData.city || null,
      experienceYears: appData.experienceYears ?? null,
      skills: appData.skills,
      statement: appData.statement,
      portfolioUrl: appData.portfolioUrl,
      reelUrl: appData.reelUrl,
      fileName: appData.fileName,
    });
    if (error || !data) {
      return { ok: false, error: error || 'Could not submit your application.' };
    }
    setApplications((prev) => [data, ...prev]);
    showToast(`Application sent to ${opp.title} — track it under Applications.`);
    return { ok: true };
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
  const handlePublishOpportunity = async (
    newOpp: Opportunity
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!currentUser) return { ok: false, error: 'Please sign in again.' };
    const { data, error } = await createOpportunity(
      {
        title: newOpp.title,
        category: newOpp.category,
        description: newOpp.description,
        requirements: newOpp.requirements,
        location: newOpp.location,
        venue: newOpp.venue,
        city: newOpp.city,
        dateRange: newOpp.dateRange,
        deadline: newOpp.deadline,
        compensation: newOpp.compensation,
        imageUrl: newOpp.imageUrl,
      },
      {
        id: currentUser.id,
        name: currentUser.orgName || organiserProfile.name || currentUser.name,
        avatar: currentUser.avatarUrl || currentUser.avatar,
      }
    );
    if (error || !data) {
      return { ok: false, error: error || 'Could not publish the call.' };
    }
    setOpportunities((prev) => [data, ...prev]);
    setIsPostModalOpen(false);
    showToast(`Call published! "${data.title}" is now live for all creators.`);
    setCurrentOrgTab('listings');
    return { ok: true };
  };

  const handleUpdateApplicantStatus = async (
    reviewId: string,
    newStatus: ApplicantReview['status']
  ) => {
    const review = applications.find((r) => r.id === reviewId);
    const changed = review && review.status !== newStatus;

    const { error } = await updateApplicationStatus(reviewId, { status: newStatus });
    if (error) {
      showToast(error);
      return;
    }

    setApplications((prev) =>
      prev.map((app) => (app.id === reviewId ? { ...app, status: newStatus } : app))
    );

    const statusLabels: Record<ApplicantReview['status'], string> = {
      under_review: 'marked as Under Review',
      interview: 'scheduled for live audition soundcheck',
      selected: 'selected for performance commission',
      rejected: 'archived',
    };

    // Selection lands in the artist's thread as an organiser message — it then
    // lights the bell + unread pill through the normal thread unread path.
    if (changed && newStatus === 'selected' && review?.artistId && currentUser) {
      const { thread } = await ensureArtistThread({
        opportunityId: review.opportunityId,
        opportunityTitle: review.opportunityTitle,
        user: {
          id: review.artistId,
          name: review.artistName || 'Artist',
          email: '',
          role: 'artist',
          avatarUrl: review.artistAvatar || undefined,
        },
        organiserName: currentUser.orgName || currentUser.name,
        organiserAvatar: currentUser.avatarUrl || currentUser.avatar,
      });
      if (thread) {
        const body = `Congratulations, ${review.artistName || 'artist'}! You've been selected for "${review.opportunityTitle}". Our team will reach out with the schedule and next steps soon.`;
        const { error: sendError } = await sendMessage({
          threadId: thread.id,
          sender: currentUser,
          senderRole: 'organiser',
          body,
          clientId: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        });
        if (!sendError) {
          // Sender's own message must not light their bell.
          await markRead(thread.id, 'organiser');
          setThreads(await fetchThreads());
        }
      }
    }

    showToast(`Applicant status updated: ${statusLabels[newStatus] || newStatus}`);
  };

  const handleRateApplicant = async (reviewId: string, rating: number) => {
    const { error } = await updateApplicationStatus(reviewId, { rating });
    if (error) {
      showToast(error);
      return;
    }
    setApplications((prev) =>
      prev.map((app) => (app.id === reviewId ? { ...app, rating } : app))
    );
  };

  const handleSaveOrganiserProfile = (updated: OrganiserProfile) => {
    if (!currentUser) return;
    setDraft(orgProfileKey(currentUser.id), updated);
    setOrgProfileVersion((v) => v + 1);
    showToast('Venue profile updated successfully!');
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

  // Wait for the real Supabase session before choosing gateway vs workspace —
  // no localStorage restore, so a stored object can never fake a login.
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-zinc-900 flex flex-col items-center justify-center gap-4">
        <KalaStar size={44} className="w-11 h-11 text-[#E45826] animate-spin" />
        <div className="text-3xl font-serif tracking-[0.3em]">KALĀ</div>
        <div className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">
          Restoring your session
        </div>
      </div>
    );
  }

  // =========================================================================
  // IF USER IS NOT LOGGED IN: SHOW DEDICATED PORTAL SELECTION / SIGN-IN GATEWAY
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-zinc-900">
        <PortalGateway
          onSelectPortal={(portal) => handleOpenSignIn(portal)}
          onOpenRegister={(portal) => handleOpenSignUp(portal)}
          onGoogleLogin={(portal, isSignUp) => handleGoogleAuth(portal, isSignUp)}
        />
        <SignInModal
          isOpen={isSignInOpen}
          initialRole={signInInitialRole}
          onClose={() => setIsSignInOpen(false)}
          onSuccess={handleSignInSuccess}
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
          threads={threads}
          onMarkThreadsRead={async () => {
            const role = currentUser?.role === 'organiser' ? 'organiser' : 'artist';
            await Promise.all(
              threads.filter(t => isUnread(t, role)).map(t => markRead(t.id, role))
            );
            setThreads(await fetchThreads());
          }}
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

        {/* Data warning — schema not migrated or a query failed */}
        {dataError && (
          <div className="mx-auto max-w-[1580px] w-full px-4 sm:px-6 lg:px-8 pt-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm rounded-xl px-4 py-3 flex items-start justify-between gap-4">
              <span>{dataError}</span>
              <button
                onClick={() => setDataError(null)}
                className="text-amber-600 hover:text-amber-900 font-medium shrink-0"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Main Body Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1580px] w-full mx-auto">
          {!listingsLoaded ? (
            <div className="flex flex-col items-center justify-center gap-3 py-32 text-sm text-zinc-500 tracking-wide">
              <KalaStar size={30} className="w-7 h-7 text-[#E45826] animate-spin" />
              <span>Loading your workspace…</span>
            </div>
          ) : (
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
                        stats={platformStats}
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
                        appliedIds={appliedOppIds}
                        onApply={handleApplyClick}
                        onViewDetails={handleViewDetails}
                        onViewAll={() => setCurrentArtistTab('discover')}
                      />

                      {/* Browse Categories Section */}
                      <BrowseCategories
                        selectedCategory={selectedCategory}
                        counts={categoryCounts}
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
                  appliedIds={appliedOppIds}
                  initialCategory={selectedCategory}
                  isOpenFiltersInitially={openFiltersInitially}
                  onApply={handleApplyClick}
                  onViewDetails={handleViewDetails}
                />
              )}

              {currentArtistTab === 'applications' && (
                <ApplicationsView
                  applications={myApplications}
                  opportunities={opportunities}
                  threads={threads}
                  onOpenThread={openArtistThread}
                  onExplore={() => setCurrentArtistTab('discover')}
                />
              )}

              {currentArtistTab === 'profile' && (
                <ProfileView
                  completion={profileCompletion}
                  profileKey={currentUser.id}
                  userName={currentUser.name}
                  userEmail={currentUser.email}
                  avatarUrl={currentUser.avatarUrl || currentUser.avatar}
                  profileMedia={profileMedia}
                  onProfileMediaChange={handleProfileMediaChange}
                  onProfileTextSaved={(name) => {
                    setCurrentUser(prev => (prev ? { ...prev, name } : prev));
                    showToast('Profile updated!');
                  }}
                  onUpdateCompletion={(newVal: number) => {
                    setProfileCompletionOverride(newVal);
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
                        activeCalls={organiserStats.activeListings}
                        totalApplicants={organiserStats.totalApplicants}
                        underReview={organiserStats.underReview}
                        latest={myOpportunities[0] || null}
                      />
                    </div>

                    {/* Organiser Stats Card (4 cols on XL) */}
                    <div className="xl:col-span-4">
                      <OrganiserStatsCard
                        stats={organiserStats}
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
                        opportunities={myOpportunities}
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
                        counts={orgCategoryCounts}
                        applicantCounts={orgCategoryApplicantCounts}
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
                  opportunities={myOpportunities}
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
                  applicants={myApplicants}
                  threads={threads}
                  opportunities={myOpportunities}
                  onOpenThread={openOrganiserThread}
                  onUpdateApplicantStatus={handleUpdateApplicantStatus}
                  onRateApplicant={handleRateApplicant}
                />
              )}

              {currentOrgTab === 'scout' && (
                <OrganiserTalentScoutView
                  applicants={myApplicants}
                  onReviewApplicants={() => setCurrentOrgTab('applicants')}
                />
              )}

              {currentOrgTab === 'org_profile' && (
                <OrganiserProfileView
                  profile={organiserProfile}
                  userEmail={currentUser.email}
                  onUpdateProfile={handleSaveOrganiserProfile}
                />
              )}
            </>
          )}
            </motion.div>
          </AnimatePresence>
          )}
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
        userName={currentUser.name}
        userEmail={currentUser.email}
        profileKey={currentUser.id}
      />

      {/* 4. Opportunity Detail Modal */}
      <OpportunityDetailModal
        opportunity={selectedOpportunity}
        isOpen={isDetailOpen}
        isApplied={selectedOpportunity ? appliedOppIds.has(selectedOpportunity.id) : false}
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
