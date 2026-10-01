import { localMediaKind } from './localMedia';

export const isDirectMediaUrl = (url: string): boolean =>
  url.startsWith('blob:') ||
  url.startsWith('kala-idb:') ||
  url.includes('cloudinary.com') ||
  /\.(mp4|webm|mov|jpg|jpeg|png|gif|webp|mp3|wav|ogg)(\?|#|$)/i.test(url);

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
