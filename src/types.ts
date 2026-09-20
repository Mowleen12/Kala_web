export type PortalMode = 'artist' | 'organiser';

export type NavTab = 'home' | 'discover' | 'applications' | 'profile';
export type OrganiserNavTab = 'overview' | 'listings' | 'applicants' | 'scout' | 'org_profile';

export interface Opportunity {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  statusBadge: {
    label: string;
    variant: 'countdown' | 'open' | 'closed';
  };
  location: string;
  venue: string;
  city: string;
  dateRange: string;
  compensation: string;
  imageUrl: string;
  featured?: boolean;
  description?: string;
  deadline?: string;
  requirements?: string[];
  organizer?: string;
  applicantCount?: number;
  status?: 'active' | 'reviewing' | 'closed' | 'draft';
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  bgColor: string;
  iconColor: string;
  opportunityCount: number;
}

export interface Application {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  category: string;
  location: string;
  appliedDate: string;
  status: 'submitted' | 'under_review' | 'interview' | 'selected' | 'rejected';
  compensation: string;
}

export interface UserStats {
  applications: number;
  interviews: number;
  selected: number;
  rejected: number;
  profileCompletion: number;
}

export interface OrganiserStats {
  activeListings: number;
  totalApplicants: number;
  underReview: number;
  interviewScheduled: number;
  selectedArtists: number;
}

export interface ApplicantReview {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  artistName: string;
  artistAvatar: string;
  artistRole: string;
  artistLocation: string;
  appliedDate: string;
  experienceYears: number;
  skills: string[];
  pitch: string;
  reelUrl?: string;
  portfolioUrl?: string;
  status: 'under_review' | 'interview' | 'selected' | 'rejected';
  rating?: number;
}

export interface OrganiserProfile {
  id: string;
  name: string;
  handle: string;
  tagline: string;
  logo: string;
  coverImage: string;
  city: string;
  state: string;
  verified: boolean;
  establishedYear: number;
  totalEventsHosted: number;
  about: string;
  focusDisciplines: string[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: PortalMode;
  avatar?: string;
  avatarUrl?: string;
  orgName?: string;
  discipline?: string;
  authProvider?: 'google' | 'email' | 'demo';
}

