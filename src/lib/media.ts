import { localMediaKind } from './localMedia';

export const isDirectMediaUrl = (url: string): boolean =>
  url.startsWith('blob:') ||
  url.startsWith('kala-idb:') ||
  url.includes('cloudinary.com') ||
  /\.(mp4|webm|mov|jpg|jpeg|png|gif|webp|mp3|wav|ogg)(\?|#|$)/i.test(url);

/** blob:/kala-idb: refs only resolve in the browser that created them —
 *  dead for every other user and every later session. */
export const isDeviceLocalUrl = (url: string): boolean =>
  url.startsWith('blob:') || url.startsWith('kala-idb:');

export const mediaKind = (url: string): 'image' | 'audio' | 'video' => {
  // Local uploads (blob:/kala-idb:) classify via their IndexedDB key extension.
  const local = localMediaKind(url);
  if (local) return local;
  if (/\.(jpg|jpeg|png|gif|webp)(\?|#|$)/i.test(url)) return 'image';
  if (/\.(mp3|wav|ogg)(\?|#|$)/i.test(url)) return 'audio';
  return 'video';
};

export const linkHost = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Open link';
  }
};

/**
 * Only `http:`/`https:` URLs may reach an `href`.
 *
 * Portfolio/reel links are typed by one user and rendered for another, so a
 * `javascript:` (or `data:`/`vbscript:`) URL would run script in this origin on
 * click — where the Supabase session lives. Anything not plainly http(s) is
 * rejected here, at the last point before it becomes a link.
 */
export const safeHttpUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    // Absolute URLs only — a bare path or scheme-relative value is not a
    // portfolio link, and `new URL` rejects it.
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
};
