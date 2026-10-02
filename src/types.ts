export type PortalMode = 'artist' | 'organiser';

export type NavTab = 'home' | 'discover' | 'applications' | 'profile';
export type OrganiserNavTab = 'overview' | 'listings' | 'applicants' | 'scout' | 'org_profile';

export type OpportunityStatus = 'active' | 'closed';
export type ApplicationStatus = 'under_review' | 'interview' | 'selected' | 'rejected';

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
  /** ISO timestamp — the real source for deadline filters, sorts and badges. */
  deadline?: string | null;
  requirements?: string[];
  organizer?: string;
  organiserId?: string;
  organiserAvatar?: string | null;
  applicantCount?: number;
  status?: OpportunityStatus;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  bgColor: string;
  iconColor: string;
}

export interface Application {
  id: string;
  opportunityId: string;
  /** Owner — links the card to the organiser's review list for status sync. */
  artistId: string;
  opportunityTitle: string;
  category: string;
  location: string;
  appliedDate: string;
  createdAt: string;
  status: ApplicationStatus;
  compensation: string;
  artistName: string;
  artistAvatar?: string | null;
  artistRole?: string | null;
  artistLocation?: string | null;
  experienceYears?: number | null;
  skills: string[];
  pitch: string;
  portfolioUrl?: string | null;
  reelUrl?: string | null;
  mediaUrl?: string | null;
  fileName?: string | null;
  rating?: number | null;
}

/** The organiser-side review card is the same record, joined to its call. */
export type ApplicantReview = Application;

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

export interface PlatformStats {
  artists: number;
  organisers: number;
  opportunities: number;
  applications: number;
  cities: number;
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
  authProvider?: 'google' | 'email';
}

export type MessageSenderRole = 'artist' | 'organiser';

export interface Thread {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  artistId: string;
  artistName: string | null;
  artistAvatar: string | null;
  organiserId: string | null;
  organiserName: string | null;
  organiserAvatar: string | null;
  artistLastReadAt: string;
  organiserLastReadAt: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  body: string | null;
  mediaUrl: string | null;
  mediaPublicId: string | null;
  mediaType: 'image' | 'video' | null;
  mediaBytes: number | null;
  createdAt: string;
  /** Client-only: queued locally, not yet acknowledged by the server. */
  pending?: boolean;
  /** Client-only: send failed, retry offered. Never dropped silently. */
  failed?: boolean;
}
