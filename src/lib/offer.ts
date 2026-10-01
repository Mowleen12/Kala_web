const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtTime12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function buildDateRange(start: string, end: string, time: string): string {
  if (!start) return '';
  const day = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return '';
    return `${d} ${MONTHS_SHORT[m - 1]}`;
  };
  const year = start.slice(0, 4);
  const span = end && end !== start ? `${day(start)} – ${day(end)}` : day(start);
  const t = time ? ` • ${fmtTime12(time)}` : '';
  return `${span} ${year}${t}`;
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
