import type { OpportunityStatus } from '../types';

/**
 * Re-evaluated at render time (unlike the fetch-time statusBadge) so a
 * deadline that passes while the app is open still removes the listing.
 */
export function isOpportunityOpen(opp: {
  status?: OpportunityStatus;
  deadline?: string | null;
}): boolean {
  if (opp.status === 'closed') return false;
  if (opp.deadline && new Date(opp.deadline).getTime() <= Date.now()) return false;
  return true;
}
