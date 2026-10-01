import { toPersistableDeep } from './localMedia';

export function getDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function setDraft(key: string, value: unknown): void {
  try {
    // Swap live blob: object URLs for their stable IndexedDB refs so drafts
    // (uploaded media included) survive reloads and re-logins.
    localStorage.setItem(key, JSON.stringify(toPersistableDeep(value)));
  } catch {}
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}
