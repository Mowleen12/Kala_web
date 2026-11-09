import { Application } from '../types';

/**
 * Selection notices.
 *
 * The organiser's status change already lives on the application row (visible
 * to the artist through `applications_select`), but a badge change is easy to
 * miss. These notices turn a status the artist has not acknowledged yet into a
 * bell entry plus a one-time congratulations card.
 *
 * "Seen" is remembered per user in localStorage, keyed by application + status,
 * so acknowledging a selection does not resurrect the card on every reload, and
 * a later move from interview → selected still raises a fresh notice.
 */

export type SelectionNoticeKind = 'selected' | 'interview';

export interface SelectionNotice {
  /** Stable across renders: one notice per (application, status) pair. */
  id: string;
  kind: SelectionNoticeKind;
  applicationId: string;
  opportunityId: string;
  opportunityTitle: string;
  title: string;
  message: string;
  /** ISO timestamp used for ordering in the bell. */
  createdAt: string;
}

const seenKey = (userId: string) => `kala_app_seen_${userId}`;

function loadSeen(userId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(seenKey(userId));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Record that this application's current status has been acknowledged. */
export function markStatusSeen(userId: string, applicationId: string, status: string): void {
  try {
    const seen = loadSeen(userId);
    seen[applicationId] = status;
    localStorage.setItem(seenKey(userId), JSON.stringify(seen));
  } catch {}
}

export function markNoticesSeen(userId: string, notices: SelectionNotice[]): void {
  for (const notice of notices) {
    markStatusSeen(userId, notice.applicationId, notice.kind);
  }
}

/**
 * Notices for outcomes the artist has not acknowledged. Terminal and
 * next-stage outcomes only — "under_review" and "rejected" stay quiet.
 */
export function deriveSelectionNotices(
  applications: Application[],
  userId: string,
  organiserOf: (application: Application) => string | undefined = () => undefined
): SelectionNotice[] {
  if (!userId) return [];
  const seen = loadSeen(userId);

  return applications
    .filter((app) => app.status === 'selected' || app.status === 'interview')
    .filter((app) => seen[app.id] !== app.status)
    .map((app) => {
      const organiser = organiserOf(app);
      const selected = app.status === 'selected';
      return {
        id: `${app.id}:${app.status}`,
        kind: selected ? ('selected' as const) : ('interview' as const),
        applicationId: app.id,
        opportunityId: app.opportunityId,
        opportunityTitle: app.opportunityTitle,
        createdAt: app.createdAt,
        title: selected ? 'You were selected 🎉' : 'Shortlisted for Next Round',
        message: selected
          ? `${organiser ? `${organiser} · ` : ''}${app.opportunityTitle}`
          : `${organiser ? `${organiser} · ` : ''}${app.opportunityTitle} — shortlisted for next stage`,
      };
    });
}
