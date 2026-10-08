/**
 * Cloudinary Media Storage Utility
 * Direct unsigned uploads for images (headshots, art stills, logos, cover photos)
 * and videos (audition reels, stage performances, venue tours).
 */

import { storeLocalMedia } from './localMedia';
import { supabase } from './supabase';
import { formatMB, maxBytesFor } from './limits';

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const isCloudinaryConfigured: boolean = Boolean(
  cloudName &&
  cloudName.trim() !== '' &&
  !cloudName.includes('placeholder') &&
  uploadPreset &&
  uploadPreset.trim() !== ''
);

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: 'image' | 'video' | 'raw';
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number; // Duration in seconds for video/audio reels
  isSimulated?: boolean;
}

export interface UploadOptions {
  folder?: string;
  resourceType?: 'image' | 'video' | 'auto';
  onProgress?: (percent: number) => void;
  /** Keep the file in this browser's IndexedDB instead of shared storage.
   *  Only for flows that run BEFORE a Supabase session exists (signup avatar). */
  local?: boolean;
}

/**
 * Upload a media file (video or image) directly to storage.
 * Shared uploads go to the Supabase `media` bucket (or Cloudinary when
 * configured) so every signed-in user can see the resulting URL.
 */
export async function uploadToCloudinary(
  file: File,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const { folder = 'kala-arts', resourceType = 'auto', onProgress, local } = options;

  // Determine media type
  const isVideo = file.type.startsWith('video/') || ['mp4', 'mov', 'webm', 'ogg'].some(ext => file.name.toLowerCase().endsWith(`.${ext}`));
  const isImage = file.type.startsWith('image/');
  const detectedType = isVideo ? 'video' : isImage ? 'image' : resourceType;

  // Pre-auth flows can only persist locally — no session to authorize a bucket write.
  if (local) {
    return simulateLocalUpload(file, detectedType === 'image' ? 'image' : 'video', onProgress);
  }

  if (!isCloudinaryConfigured) {
    return uploadToMediaBucket(file, detectedType === 'image' ? 'image' : 'video', folder, onProgress);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${detectedType}/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset!);
    if (folder) {
      formData.append('folder', folder);
    }

    // Track upload progress for live percentage feedback
    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            url: response.url,
            secureUrl: response.secure_url,
            publicId: response.public_id,
            resourceType: response.resource_type,
            format: response.format,
            bytes: response.bytes,
            width: response.width,
            height: response.height,
            duration: response.duration,
            isSimulated: false,
          });
        } catch (parseError) {
          reject(new Error('Failed to parse Cloudinary response: ' + parseError));
        }
      } else {
        let errorMsg = `Cloudinary upload failed with status ${xhr.status}`;
        try {
          const errRes = JSON.parse(xhr.responseText);
          if (errRes.error?.message) {
            errorMsg = errRes.error.message;
          }
        } catch {
          // ignore parsing error
        }
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error occurred while connecting to Cloudinary. Check your internet connection or upload preset.'));
    };

    xhr.open('POST', uploadUrl, true);
    xhr.send(formData);
  });
}

/**
 * Shared upload: browser -> Supabase Storage `media` bucket -> public URL.
 * The path keeps the file extension so mediaKind()/isVideo() classify the
 * stored URL correctly on every device.
 */
async function uploadToMediaBucket(
  file: File,
  detectedType: 'image' | 'video',
  folder: string,
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  if (!supabase) {
    throw new Error('Media storage is not configured on this deployment.');
  }

  const ext =
    (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '') ||
    (file.type.startsWith('video/') ? 'mp4' : file.type.startsWith('audio/') ? 'mp3' : 'jpg');
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  onProgress?.(10);
  const { error } = await supabase.storage
    .from('media')
    .upload(path, file, { contentType: file.type || undefined, upsert: false });

  if (error) {
    const m = (error.message || '').toLowerCase();
    if (m.includes('bucket') && (m.includes('not') || m.includes('exist'))) {
      throw new Error('Media storage is missing — run section 6 of supabase/schema.sql in the Supabase SQL editor.');
    }
    if (m.includes('row-level security') || m.includes('permission') || m.includes('not authorized') || m.includes('401')) {
      throw new Error('You are signed out — sign in again and retry the upload.');
    }
    if (m.includes('exceed') || m.includes('too large') || m.includes('size')) {
      throw new Error(`File exceeds the ${formatMB(maxBytesFor(file))} upload limit.`);
    }
    throw new Error(`Upload failed — ${error.message}`);
  }

  onProgress?.(100);
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return {
    url: data.publicUrl,
    secureUrl: data.publicUrl,
    publicId: path,
    resourceType: detectedType,
    format: ext,
    bytes: file.size,
    isSimulated: false,
  };
}

/**
 * Preview fallback simulation when testing without active Cloudinary credentials
 */
async function simulateLocalUpload(
  file: File,
  detectedType: 'image' | 'video',
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  // Store the blob in IndexedDB first so the upload survives reloads and
  // re-logins even without Cloudinary credentials.
  const objectUrl = await storeLocalMedia(file);

  // Smooth simulated progress
  if (onProgress) {
    onProgress(15);
    await new Promise((r) => setTimeout(r, 120));
    onProgress(45);
    await new Promise((r) => setTimeout(r, 180));
    onProgress(75);
    await new Promise((r) => setTimeout(r, 150));
    onProgress(100);
  }

  const extension = file.name.split('.').pop() || (detectedType === 'video' ? 'mp4' : 'jpg');

  return {
    url: objectUrl,
    secureUrl: objectUrl,
    publicId: `kala_local_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
    resourceType: detectedType,
    format: extension,
    bytes: file.size,
    isSimulated: true,
  };
}

/**
 * Helper to generate an optimized Cloudinary delivery URL with transformations
 */
export function getOptimizedCloudinaryUrl(
  urlOrPublicId: string,
  transformations: { width?: number; height?: number; crop?: string; quality?: string } = {}
): string {
  if (!urlOrPublicId || !urlOrPublicId.includes('cloudinary.com')) {
    return urlOrPublicId; // Return raw URL if local preview or external
  }

  const { width, height, crop = 'fill', quality = 'auto' } = transformations;
  const transformParts = [`f_auto`, `q_${quality}`];
  if (width) transformParts.push(`w_${width}`);
  if (height) transformParts.push(`h_${height}`);
  if (width || height) transformParts.push(`c_${crop}`);

  const transformString = transformParts.join(',');
  return urlOrPublicId.replace('/upload/', `/upload/${transformString}/`);
}
