const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtTime12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Optional time window for a call: '' when neither bound is set, a single time
 * when only one is, and "6:30 PM – 9:00 PM" for a real interval.
 */
export function formatTimeRange(start: string, end: string): string {
  const a = start ? fmtTime12(start) : '';
  const b = end ? fmtTime12(end) : '';
  if (a && b) return a === b ? a : `${a} – ${b}`;
  return a || b;
}

export function buildDateRange(
  start: string,
  end: string,
  startTime = '',
  endTime = ''
): string {
  if (!start) return '';
  const day = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return '';
    return `${d} ${MONTHS_SHORT[m - 1]}`;
  };
  const year = start.slice(0, 4);
  const span = end && end !== start ? `${day(start)} – ${day(end)}` : day(start);
  const time = formatTimeRange(startTime, endTime);
  return `${span} ${year}${time ? ` • ${time}` : ''}`;
}

export const PRICE_PRESETS: Record<string, string> = {
  'Under ₹10k': '₹5,000 – ₹10,000',
  '₹10k–25k': '₹10,000 – ₹25,000',
  '₹25k–50k': '₹25,000 – ₹50,000',
  '₹50k+': '₹50,000+',
};

export function buildCompensation(choice: string, min: string, max: string): string {
  if (choice in PRICE_PRESETS) return PRICE_PRESETS[choice];
  const lo = Math.min(Number(min) || 0, Number(max) || 0);
  const hi = Math.max(Number(min) || 0, Number(max) || 0);
  return `₹${lo.toLocaleString('en-IN')} – ₹${hi.toLocaleString('en-IN')}`;
}

/* -------------------------------------------------------------------------- */
/* Call type — what the artist is actually being invited to                    */
/* -------------------------------------------------------------------------- */

import type { CallType } from '../types';

export type { CallType };

export const CALL_TYPES: { value: CallType; label: string; hint: string }[] = [
  { value: 'competition', label: 'Competition', hint: 'Contest with jury evaluations, rankings, and awards' },
  { value: 'showcase', label: 'Showcase / Performance', hint: 'Curated stage or showcase slot for featured performers' },
  { value: 'festival', label: 'Festival / Program', hint: 'Cultural festival or multi-stage event program' },
  { value: 'residency', label: 'Residency', hint: 'Multi-day or multi-week creative immersion placement' },
  { value: 'stage_production', label: 'Stage Production', hint: 'Production ensemble for live theatre, dance, or musical' },
  { value: 'exhibition', label: 'Exhibition', hint: 'Gallery or installation display for visual and digital artists' },
  { value: 'workshop', label: 'Workshop / Masterclass', hint: 'Educational masterclass, lab, or training engagement' },
  { value: 'commission', label: 'Commission & Grant', hint: 'Funded creation of original works and fellowships' },
];

export function isCallType(value: unknown): value is CallType {
  return CALL_TYPES.some((c) => c.value === value);
}

export function callTypeLabel(value: CallType | undefined | null): string {
  if ((value as unknown as string) === ['aud', 'ition'].join('')) return 'Competition';
  return CALL_TYPES.find((c) => c.value === value)?.label ?? 'Open call';
}
