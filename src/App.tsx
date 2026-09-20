import React, { useState, useEffect } from 'react';
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
import { FreeTierStatusModal } from './components/FreeTierStatusModal';
import { OnboardingLoadingScreen } from './components/OnboardingLoadingScreen';
import { ApplyModal } from './components/ApplyModal';
import { OpportunityDetailModal } from './components/OpportunityDetailModal';
import { DiscoverView } from './components/DiscoverView';
import { ApplicationsView } from './components/ApplicationsView';
import { ProfileView } from './components/ProfileView';

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

// Supabase & Cloudinary Free Tier Integrations
import { 
  onSupabaseAuthStateChange, 
  supabaseGetCurrentUser, 
  supabaseSignOut, 
  supabaseSignInWithGoogle,
  isSupabaseConfigured 
} from './lib/supabase';
import { isCloudinaryConfigured } from './lib/cloudinary';

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
  AuthUser
} from './types';

export default function App() {
  // Authenticated User State (determines active portal separation)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>({
    id: 'user-mowleen',
    name: 'Mowleen',
    email: 'mowleen2006@gmail.com',
    role: 'artist',
    discipline: 'Classical & Contemporary Vocalist',
  });

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
  const [isFreeTierModalOpen, setIsFreeTierModalOpen] = useState(false);
  const [isLoadingScreenOpen, setIsLoadingScreenOpen] = useState(false);
  const [loadingScreenMessage, setLoadingScreenMessage] = useState({
    title: "Almost there...",
    subtitle: "We're setting up your creative space."
  });

  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  // Artist User State
  const [userName, setUserName] = useState('Mowleen');
  const [userStats, setUserStats] = useState<UserStats>(INITIAL_USER_STATS);
  const [applications, setApplications] = useState<Application[]>(INITIAL_APPLICATIONS);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(FEATURED_OPPORTUNITIES);
  
  // Organiser State
  const [organiserProfile, setOrganiserProfile] = useState<OrganiserProfile>(INITIAL_ORGANISER_PROFILE);
  const [organiserStats, setOrganiserStats] = useState<OrganiserStats>(INITIAL_ORGANISER_STATS);
  const [applicantReviews, setApplicantReviews] = useState<ApplicantReview[]>(INITIAL_APPLICANT_REVIEWS);

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

    // 2. Clean URL hash and search query once Supabase processes OAuth tokens
    if (window.location.hash.includes('access_token=') || window.location.search.includes('code=')) {
      setTimeout(() => {
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {}
      }, 1000);
    }

    // 3. Check existing session on load
    supabaseGetCurrentUser().then((user) => {
      if (user) {
        setCurrentUser(user);
        if (user.role === 'artist' && user.name) {
          setUserName(user.name);
        }
      }
    });

    // 4. Subscribe to realtime auth state changes from Supabase
    const unsubscribe = onSupabaseAuthStateChange((user, event) => {
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
    setCurrentUser(user);

    if (user.role === 'artist') {
      setUserName(user.name);
      setCurrentArtistTab('home');
      showToast(`Welcome back, ${user.name}! Logged into Artist Portal.`);
    } else {
      if (user.orgName) {
        setOrganiserProfile(prev => ({
          ...prev,
          name: user.orgName!,
        }));
      }
      setCurrentOrgTab('overview');
      showToast(`Welcome back! Logged into Organiser Portal for ${user.orgName || 'your venue'}.`);
    }
  };

  const handleSignUpSuccess = (userData: { 
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
    const newUser: AuthUser = {
      id: `user-${Date.now()}`,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      orgName: userData.orgName,
      discipline: userData.discipline,
      avatarUrl: effectiveAvatar,
    };

    setCurrentUser(newUser);

    if (userData.role === 'artist') {
      setUserName(userData.name);
      setLoadingScreenMessage({
        title: "Almost there...",
        subtitle: `Welcome to the Artist Portal, ${userData.name}! We're preparing your audition portfolio.`
      });
      setCurrentArtistTab('home');
    } else {
      if (userData.orgName) {
        setOrganiserProfile(prev => ({
          ...prev,
          name: userData.orgName!,
        }));
      }
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
      const artistUser: AuthUser = {
        id: 'user-mowleen',
        name: 'Mowleen',
        email: 'mowleen2006@gmail.com',
        role: 'artist',
        discipline: 'Classical & Contemporary Vocalist',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=140&q=80',
      };
      setCurrentUser(artistUser);
      setUserName('Mowleen');
      setCurrentArtistTab('home');
      showToast("Logged in to Artist Portal as Mowleen");
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
      artistName: userName,
      artistAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=140&q=80',
      artistRole: currentUser?.discipline || 'Contemporary Vocalist & Composer',
      artistLocation: 'Mumbai, Maharashtra',
      appliedDate: 'Just now',
      experienceYears: 4,
      skills: ['Carnatic Vocals', 'Sitar', 'Live Improvisation'],
      pitch: appData?.statement || 'Eager to perform on the prestigious stage.',
      status: 'under_review',
      rating: 4.8,
      reelUrl: 'https://actions.google.com/sounds/v1/water/rain_heavy.ogg',
      portfolioUrl: 'https://kala.art/mowleen',
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
        <FreeTierStatusModal
          isOpen={isFreeTierModalOpen}
          onClose={() => setIsFreeTierModalOpen(false)}
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
          onOpenFreeTierStatus={() => setIsFreeTierModalOpen(true)}
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
                  onExplore={() => setCurrentArtistTab('discover')}
                />
              )}

              {currentArtistTab === 'profile' && (
                <ProfileView
                  completion={userStats.profileCompletion}
                  userName={currentUser.name}
                  userEmail={currentUser.email}
                  avatarUrl={currentUser.avatarUrl || currentUser.avatar}
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
                  opportunities={opportunities}
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
                    showToast('Venue profile updated successfully!');
                  }}
                />
              )}
            </>
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

      {/* 1c. Free Tier Connection Status Modal */}
      <FreeTierStatusModal
        isOpen={isFreeTierModalOpen}
        onClose={() => setIsFreeTierModalOpen(false)}
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
