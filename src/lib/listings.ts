import { supabase as supabaseClient, isSupabaseConfigured } from './supabase';
import { Application, ApplicationStatus, Opportunity, OpportunityStatus, PlatformStats } from '../types';

const supabase = supabaseClient!;

/* eslint-disable @typescript-eslint/no-explicit-any */

/* -------------------------------------------------------------------------- */
/* Display helpers — shared by every screen that renders a metric              */
/* -------------------------------------------------------------------------- */

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function deriveStatusBadge(opp: {
  status?: OpportunityStatus;
  deadline?: string | null;
}): { label: string; variant: 'countdown' | 'open' | 'closed' } {
  if (opp.status === 'closed') return { label: 'Closed', variant: 'closed' };
  if (opp.deadline) {
    const remaining = new Date(opp.deadline).getTime() - Date.now();
    if (remaining <= 0) return { label: 'Closed', variant: 'closed' };
    const days = Math.ceil(remaining / 86_400_000);
    if (days <= 7) {
      return { label: `Closes in ${days} day${days === 1 ? '' : 's'}`, variant: 'countdown' };
    }
  }
  return { label: 'Open', variant: 'open' };
}

export function daysUntil(deadline?: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
}

/** Highest money figure in a free-text compensation string ("₹2,000 – ₹10,000" → 10000). */
export function compensationValue(text?: string): number {
  if (!text) return 0;
  const numbers = text.match(/\d[\d,\s]*/g);
  if (!numbers) return 0;
  return numbers.reduce((max, n) => Math.max(max, Number(n.replace(/[,\s]/g, '')) || 0), 0);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatAppliedDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return 'today';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/* -------------------------------------------------------------------------- */
/* Row mapping                                                                 */
/* -------------------------------------------------------------------------- */

const rowToOpportunity = (r: any): Opportunity => ({
  id: r.id,
  title: r.title,
  category: r.category,
  categorySlug: slugify(r.category),
  statusBadge: deriveStatusBadge({ status: r.status, deadline: r.deadline }),
  location: r.location || r.venue || r.city || '',
  venue: r.venue || '',
  city: r.city || '',
  dateRange: r.date_range || '',
  compensation: r.compensation || '',
  imageUrl: r.image_url || '',
  featured: Boolean(r.featured),
  description: r.description || undefined,
  deadline: r.deadline || null,
  requirements: r.requirements || [],
  organizer: r.organiser_name || undefined,
  organiserId: r.organiser_id,
  organiserAvatar: r.organiser_avatar || null,
  applicantCount: r.applicant_count || 0,
  status: (r.status as OpportunityStatus) || 'active',
  createdAt: r.created_at,
});

const rowToApplication = (r: any): Application => {
  const opp = r.opportunities || {};
  return {
    id: r.id,
    opportunityId: r.opportunity_id,
    artistId: r.applicant_id,
    opportunityTitle: opp.title || 'Opportunity',
    category: opp.category || '',
    location: opp.location || opp.venue || opp.city || '',
    appliedDate: formatAppliedDate(r.created_at),
    createdAt: r.created_at,
    status: r.status as ApplicationStatus,
    compensation: opp.compensation || '',
    artistName: r.applicant_name || 'Artist',
    artistAvatar: r.applicant_avatar || null,
    artistRole: r.applicant_role || null,
    artistLocation: r.applicant_city || null,
    experienceYears: r.experience_years ?? null,
    skills: r.skills ? String(r.skills).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    pitch: r.statement || '',
    portfolioUrl: r.portfolio_url || null,
    reelUrl: r.reel_url || null,
    mediaUrl: r.reel_url || null,
    fileName: r.file_name || null,
    rating: r.rating ?? null,
  };
};

/** Embeds the owning call so every consumer gets a display-ready record. */
const APPLICATION_SELECT =
  '*, opportunities(title, category, location, venue, city, compensation, status, deadline)';

/* -------------------------------------------------------------------------- */
/* Errors — never surface raw Postgres messages to users                       */
/* -------------------------------------------------------------------------- */

function friendlyListingError(raw: string | undefined | null): string {
  const msg = raw || '';
  if (msg.includes('unique constraint') || msg.includes('duplicate key')) {
    return 'You have already applied to this opportunity.';
  }
  if (msg.includes('row-level security') || msg.includes('permission denied')) {
    if (msg.includes('applications')) return 'This call is no longer accepting applications.';
    if (msg.includes('opportunities')) return "You don't have permission to do that.";
    return "You don't have permission to do that.";
  }
  if (msg.includes('violates check constraint')) return 'Some required information was missing. Please review the form.';
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Network error — check your connection and try again.';
  }
  if (msg.includes('PGRST301') || msg.includes('paused')) {
    return 'The service is paused after inactivity — wake it in the Supabase dashboard.';
  }
  if (msg.includes('Could not find the table') || msg.includes('schema cache')) {
    return 'The database is missing required tables — run supabase/schema.sql.';
  }
  return 'Something went wrong. Please try again.';
}

/* -------------------------------------------------------------------------- */
/* Capability probe                                                            */
/* -------------------------------------------------------------------------- */

let domainTablesOk: boolean | null = null;

/** Live marketplace mode requires a session AND the schema from section 5. */
export async function isListingsReady(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return false;
  if (domainTablesOk === null) {
    const { error } = await supabase.from('opportunities').select('id', { head: true });
    if (!error) domainTablesOk = true;
    else if (/does not exist|schema cache/i.test(error.message)) domainTablesOk = false;
    else return false; // transient: don't cache
  }
  return domainTablesOk;
}

/** True when section 5 of supabase/schema.sql has not been applied yet. */
export function schemaMissing(): boolean {
  return domainTablesOk === false;
}

/* -------------------------------------------------------------------------- */
/* Opportunities                                                               */
/* -------------------------------------------------------------------------- */

export async function fetchOpportunities(): Promise<{ data: Opportunity[]; error: string | null }> {
  if (!(await isListingsReady())) return { data: [], error: null };
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return { data: [], error: friendlyListingError(error.message) };
  return { data: (data || []).map(rowToOpportunity), error: null };
}

export interface OpportunityInput {
  title: string;
  category: string;
  description?: string;
  requirements?: string[];
  location?: string;
  venue?: string;
  city?: string;
  dateRange?: string;
  deadline?: string | null;
  compensation?: string;
  imageUrl?: string;
}

export async function createOpportunity(
  input: OpportunityInput,
  owner: { id: string; name: string; avatar?: string | null }
): Promise<{ data: Opportunity | null; error: string | null }> {
  if (!(await isListingsReady())) {
    return { data: null, error: 'Opportunities cannot be published right now — database unavailable.' };
  }
  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      organiser_id: owner.id,
      organiser_name: owner.name,
      organiser_avatar: owner.avatar || null,
      title: input.title,
      category: input.category,
      description: input.description || null,
      requirements: input.requirements?.length ? input.requirements : null,
      location: input.location || null,
      venue: input.venue || null,
      city: input.city || null,
      date_range: input.dateRange || null,
      deadline: input.deadline || null,
      compensation: input.compensation || null,
      image_url: input.imageUrl || null,
      status: 'active',
      featured: false,
    })
    .select()
    .single();
  if (error) return { data: null, error: friendlyListingError(error.message) };
  return { data: rowToOpportunity(data), error: null };
}

export async function setOpportunityStatus(
  id: string,
  status: OpportunityStatus
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('opportunities')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error ? friendlyListingError(error.message) : null };
}

export async function deleteOpportunity(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('opportunities').delete().eq('id', id);
  return { error: error ? friendlyListingError(error.message) : null };
}

/* -------------------------------------------------------------------------- */
/* Applications                                                                */
/* -------------------------------------------------------------------------- */

/** RLS scopes this: an artist sees their own filings, an organiser sees the
 *  applications to their own calls. One query, no per-row follow-ups. */
export async function fetchApplications(): Promise<{ data: Application[]; error: string | null }> {
  if (!(await isListingsReady())) return { data: [], error: null };
  const { data, error } = await supabase
    .from('applications')
    .select(APPLICATION_SELECT)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return { data: [], error: friendlyListingError(error.message) };
  return { data: (data || []).map(rowToApplication), error: null };
}

export interface ApplyInput {
  opportunityId: string;
  artistName: string;
  artistAvatar?: string | null;
  artistRole?: string | null;
  artistLocation?: string | null;
  experienceYears?: number | null;
  skills?: string[];
  statement?: string;
  portfolioUrl?: string | null;
  reelUrl?: string | null;
  fileName?: string | null;
}

export async function applyToOpportunity(
  input: ApplyInput
): Promise<{ data: Application | null; error: string | null }> {
  if (!(await isListingsReady())) {
    return { data: null, error: 'Applications cannot be submitted right now — database unavailable.' };
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Your session has expired — please sign in again.' };
  const { data, error } = await supabase
    .from('applications')
    .insert({
      opportunity_id: input.opportunityId,
      applicant_id: user.id,
      applicant_name: input.artistName,
      applicant_avatar: input.artistAvatar || null,
      applicant_role: input.artistRole || null,
      applicant_city: input.artistLocation || null,
      skills: input.skills?.length ? input.skills.join(', ') : null,
      experience_years: input.experienceYears ?? null,
      statement: input.statement || null,
      portfolio_url: input.portfolioUrl || null,
      reel_url: input.reelUrl || null,
      file_name: input.fileName || null,
      status: 'under_review',
    })
    .select(APPLICATION_SELECT)
    .single();
  if (error) return { data: null, error: friendlyListingError(error.message) };
  return { data: rowToApplication(data), error: null };
}

export async function updateApplicationStatus(
  id: string,
  patch: { status?: ApplicationStatus; rating?: number | null }
): Promise<{ error: string | null }> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status) payload.status = patch.status;
  if (patch.rating !== undefined) payload.rating = patch.rating;
  const { error } = await supabase.from('applications').update(payload).eq('id', id);
  return { error: error ? friendlyListingError(error.message) : null };
}

/* -------------------------------------------------------------------------- */
/* Aggregates — the only source for displayed metrics                          */
/* -------------------------------------------------------------------------- */

export async function fetchPlatformStats(): Promise<PlatformStats | null> {
  if (!(await isListingsReady())) return null;
  const { data, error } = await supabase.rpc('platform_stats');
  if (error || !data) return null;
  return {
    artists: Number(data.artists) || 0,
    organisers: Number(data.organisers) || 0,
    opportunities: Number(data.opportunities) || 0,
    applications: Number(data.applications) || 0,
    cities: Number(data.cities) || 0,
  };
}

export async function fetchCategoryCounts(): Promise<Record<string, number>> {
  if (!(await isListingsReady())) return {};
  const { data, error } = await supabase.rpc('category_counts');
  if (error || !data) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    out[key] = Number(value) || 0;
  }
  return out;
}
