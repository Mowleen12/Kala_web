import QRCode from 'qrcode';
import { 
  CandidateEvaluation, 
  JudgeEvaluationSubmission, 
  JudgeEventAccess, 
  Opportunity, 
  ScoringCriterion, 
  TopCandidateRemark 
} from '../types';

export const DEFAULT_SCORING_CRITERIA: ScoringCriterion[] = [
  {
    id: 'crit-tech',
    name: 'Technical Skill & Mastery',
    description: 'Precision, technique, vocal/instrumental agility, control, and craftsmanship.',
    maxScore: 10,
  },
  {
    id: 'crit-creative',
    name: 'Creativity & Originality',
    description: 'Unique artistic vision, fresh interpretation, inventiveness, and stylistic identity.',
    maxScore: 10,
  },
  {
    id: 'crit-presence',
    name: 'Stage Presence & Execution',
    description: 'Charisma, emotional resonance, confidence, pacing, and audience engagement.',
    maxScore: 10,
  },
  {
    id: 'crit-impact',
    name: 'Overall Artistic Impact',
    description: 'Relevance to event theme, readiness for stage/production, and overall memorability.',
    maxScore: 10,
  },
];

const ACCESS_CODES_KEY = 'kala_judge_event_access_codes';
const EVAL_SUBMISSIONS_KEY = 'kala_judge_eval_submissions';

/**
 * Generate a unique, memorable event judge access code (e.g. JDG-7249)
 */
export function generateJudgeCode(opportunityId: string): string {
  const hash = Math.abs(
    opportunityId.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0)
  );
  const suffix = (1000 + (hash % 9000)).toString();
  return `JDG-${suffix}`;
}

/**
 * Generate a shareable QR code Data URL for a specific event
 */
export async function generateEventJudgeQr(
  opportunityId: string,
  accessCode: string,
  origin: string = window.location.origin
): Promise<{ qrDataUrl: string; shareUrl: string }> {
  const shareUrl = `${origin}?portal=judge&event=${encodeURIComponent(opportunityId)}&code=${encodeURIComponent(accessCode)}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#18181B',
        light: '#FAF8F5',
      },
      errorCorrectionLevel: 'M',
    });
    return { qrDataUrl, shareUrl };
  } catch (err) {
    console.warn('[Judge] QR generation fallback:', err);
    // SVG fallback Data URL if canvas fails
    const encoded = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="#FAF8F5"/><text x="150" y="150" font-family="sans-serif" font-size="14" font-weight="bold" fill="#E45826" text-anchor="middle">Access Code: ${accessCode}</text></svg>`
    );
    return {
      qrDataUrl: `data:image/svg+xml;utf8,${encoded}`,
      shareUrl,
    };
  }
}

/**
 * Get or register an event access record
 */
export function getOrCreateJudgeAccess(opp: Opportunity): JudgeEventAccess {
  const all = getStoredJudgeAccessList();
  const existing = all.find((a) => a.opportunityId === opp.id);
  if (existing) return existing;

  const code = generateJudgeCode(opp.id);
  const newAccess: JudgeEventAccess = {
    code,
    opportunityId: opp.id,
    opportunityTitle: opp.title,
    category: opp.category,
    callType: opp.callType || 'competition',
    organizerName: opp.organizer || 'Cultural Host',
    organizerId: opp.organiserId || '',
    venue: opp.venue,
    city: opp.city,
    createdAt: new Date().toISOString(),
    active: true,
  };

  all.push(newAccess);
  saveStoredJudgeAccessList(all);
  return newAccess;
}

export function getStoredJudgeAccessList(): JudgeEventAccess[] {
  try {
    const raw = localStorage.getItem(ACCESS_CODES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredJudgeAccessList(list: JudgeEventAccess[]): void {
  try {
    localStorage.setItem(ACCESS_CODES_KEY, JSON.stringify(list));
  } catch {}
}

export function findJudgeAccess(code: string, eventId?: string): JudgeEventAccess | null {
  const trimmedCode = code.trim().toUpperCase();
  const all = getStoredJudgeAccessList();
  const match = all.find((a) => {
    const codeMatches = a.code.toUpperCase() === trimmedCode;
    return eventId ? codeMatches && a.opportunityId === eventId : codeMatches;
  });
  if (match) return match;

  // Shared QR links are opened on devices that do not have the organizer's
  // local access-code record. The event-bound code is reproducible from its ID.
  if (!eventId || trimmedCode !== generateJudgeCode(eventId)) return null;

  return {
    code: trimmedCode,
    opportunityId: eventId,
    opportunityTitle: '',
    category: '',
    callType: 'competition',
    organizerName: '',
    organizerId: '',
    venue: '',
    city: '',
    createdAt: '',
    active: true,
  };
}

/* -------------------------------------------------------------------------- */
/* Evaluation Storage & Submission                                            */
/* -------------------------------------------------------------------------- */

export function loadAllJudgeSubmissions(): JudgeEvaluationSubmission[] {
  try {
    const raw = localStorage.getItem(EVAL_SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveJudgeSubmission(submission: JudgeEvaluationSubmission): void {
  const all = loadAllJudgeSubmissions();
  const index = all.findIndex((s) => s.id === submission.id);
  if (index >= 0) {
    all[index] = submission;
  } else {
    all.push(submission);
  }
  try {
    localStorage.setItem(EVAL_SUBMISSIONS_KEY, JSON.stringify(all));
  } catch {}
}

export function getJudgeDraft(
  opportunityId: string,
  judgeId: string
): JudgeEvaluationSubmission | null {
  const all = loadAllJudgeSubmissions();
  return (
    all.find((s) => s.opportunityId === opportunityId && s.judgeId === judgeId) ||
    null
  );
}

export function getSubmissionsForEvent(opportunityId: string): JudgeEvaluationSubmission[] {
  return loadAllJudgeSubmissions().filter((s) => s.opportunityId === opportunityId);
}

export function calculateCandidateAggregate(
  candidateId: string,
  submissions: JudgeEvaluationSubmission[]
): {
  averageScore: number;
  maxScore: number;
  percentage: number;
  ratingsCount: number;
  shortlistCount: number;
  selectCount: number;
  judgeEvaluations: {
    judgeName: string;
    judgeTitle?: string;
    score: number;
    rating: number;
    status: string;
    feedback: string;
    strengths?: string;
    recommendations?: string;
  }[];
} {
  let totalScoreSum = 0;
  let maxScoreSum = 0;
  let ratingsCount = 0;
  let shortlistCount = 0;
  let selectCount = 0;
  const judgeEvaluations: any[] = [];

  for (const sub of submissions) {
    const evalData = sub.evaluations[candidateId];
    if (!evalData) continue;

    totalScoreSum += evalData.totalScore;
    maxScoreSum += evalData.maxTotalScore || 40;
    ratingsCount++;

    if (evalData.selectionStatus === 'shortlisted') shortlistCount++;
    if (evalData.selectionStatus === 'selected') selectCount++;

    judgeEvaluations.push({
      judgeName: sub.judgeName,
      judgeTitle: sub.judgeTitle,
      score: evalData.totalScore,
      rating: evalData.rating,
      status: evalData.selectionStatus,
      feedback: evalData.feedback,
      strengths: evalData.strengths,
      recommendations: evalData.recommendations,
    });
  }

  const averageScore = ratingsCount > 0 ? totalScoreSum / ratingsCount : 0;
  const maxScore = ratingsCount > 0 ? maxScoreSum / ratingsCount : 40;
  const percentage = maxScore > 0 ? (averageScore / maxScore) * 100 : 0;

  return {
    averageScore: Math.round(averageScore * 10) / 10,
    maxScore,
    percentage: Math.round(percentage),
    ratingsCount,
    shortlistCount,
    selectCount,
    judgeEvaluations,
  };
}
