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
  /** Owner — links the card to the organiser's ApplicantReview for status sync. */
  artistId?: string;
  opportunityTitle: string;
  category: string;
  location: string;
  appliedDate: string;
  status: 'submitted' | 'under_review' | 'interview' | 'selected' | 'rejected';
  compensation: string;
  mediaUrl?: string;
  fileName?: string;
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
  artistId?: string;
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

