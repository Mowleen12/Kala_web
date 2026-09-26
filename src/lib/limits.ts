/**
 * Free-tier upload limits.
 *
 * Cloudinary Free caps images at 10 MB and videos at 100 MB, but only applies
 * transformations to videos up to 40 MB — and getOptimizedCloudinaryUrl always
 * emits f_auto,q_auto. Anything larger fails at delivery rather than upload.
 */

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 40 * 1024 * 1024;
export const USER_MONTHLY_BYTES = 100 * 1024 * 1024;
export const MEDIA_PER_THREAD = 20;
export const MESSAGES_PER_THREAD = 200;

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'ogg', 'm4v'];

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  if (file.type.startsWith('image/')) return false;
  const ext = file.name.toLowerCase().split('.').pop() || '';
  return VIDEO_EXTENSIONS.includes(ext);
}

export function maxBytesFor(file: File): number {
  return isVideoFile(file) ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
}

export function remaining(usedBytes: number): number {
  return Math.max(0, USER_MONTHLY_BYTES - usedBytes);
}

export function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
