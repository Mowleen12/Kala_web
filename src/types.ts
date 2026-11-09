export type PortalMode = 'artist' | 'organiser' | 'judge';

export type OrganiserType = 'venue' | 'society';

export type NavTab = 'home' | 'discover' | 'applications' | 'profile';
export type OrganiserNavTab = 'overview' | 'listings' | 'applicants' | 'evaluations' | 'scout' | 'org_profile';

export type OpportunityStatus = 'active' | 'closed';
export type ApplicationStatus = 'under_review' | 'shortlisted' | 'selected' | 'rejected' | 'interview';

/**
 * Event and competition types. Clearly specifies what the artist is registering for.
 */
export type CallType =
  | 'competition'
  | 'showcase'
  | 'residency'
  | 'festival'
  | 'exhibition'
  | 'stage_production'
  | 'workshop'
  | 'commission';

export interface Opportunity {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  /** Explicit classification of the event or competition */
  callType?: CallType;
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
  organiserName?: string;
  organiserType?: OrganiserType;
  organiserId?: string;
  organiserAvatar?: string | null;
  collegeName?: string;
  festName?: string;
  collegeOnly?: boolean;
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

export interface VideoAttachment {
  id?: string;
  url: string;
  title?: string;
  duration?: string;
}

export interface ScriptAttachment {
  id?: string;
  url: string;
  title?: string;
  name?: string;
  size?: string;
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
  artistCollege?: string | null;
  experienceYears?: number | null;
  skills: string[];
  pitch: string;
  portfolioUrl?: string | null;
  reelUrl?: string | null;
  mediaUrl?: string | null;
  fileName?: string | null;
  rating?: number | null;
  /** Multiple uploaded media files per category */
  photographs?: string[];
  videos?: VideoAttachment[];
  scripts?: ScriptAttachment[];
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
  orgType?: OrganiserType;
  /** Only meaningful for a college society/club; empty for venues. */
  collegeName: string;
  focusDisciplines: string[];
  email?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  youtube?: string;
}

/* -------------------------------------------------------------------------- */
/* Judge & Evaluation System Models                                           */
/* -------------------------------------------------------------------------- */

export interface ScoringCriterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

export interface CriterionScore {
  criterionId: string;
  criterionName: string;
  score: number;
  maxScore: number;
}

export interface CandidateEvaluation {
  candidateId: string;
  candidateName: string;
  scores: CriterionScore[];
  totalScore: number;
  maxTotalScore: number;
  percentage: number;
  rating: number; // 1 to 5 stars
  selectionStatus: 'shortlisted' | 'selected' | 'under_review' | 'not_selected';
  feedback: string;
  strengths?: string;
  recommendations?: string;
  evaluatedAt: string;
}

export interface TopCandidateRemark {
  candidateId: string;
  candidateName: string;
  rank: number;
  selectionRationale: string;
  keyObservations: string;
  strengths: string;
  recommendations: string;
}

export interface JudgeEvaluationSubmission {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  eventCategory?: string;
  eventType?: string;
  judgeId: string;
  judgeName: string;
  judgeEmail?: string;
  judgeTitle?: string;
  judgeAccessCode: string;
  evaluations: Record<string, CandidateEvaluation>;
  shortlistedCandidateIds: string[];
  topSelectedRemarks: TopCandidateRemark[];
  overallRemarks?: string;
  isSubmitted: boolean;
  submittedAt?: string | null;
  updatedAt: string;
}

export interface JudgeEventAccess {
  code: string;
  opportunityId: string;
  opportunityTitle: string;
  category: string;
  callType: string;
  organizerName: string;
  organizerId: string;
  venue: string;
  city: string;
  createdAt: string;
  active: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: PortalMode;
  avatar?: string;
  avatarUrl?: string;
  orgName?: string;
  orgType?: OrganiserType;
  collegeName?: string;
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
  organiserType?: OrganiserType | null;
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
