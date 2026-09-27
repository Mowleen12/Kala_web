/**
 * Cloudinary Media Storage Utility
 * Direct unsigned uploads for images (headshots, art stills, logos, cover photos)
 * and videos (audition reels, stage performances, venue tours).
 */

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
}

/**
 * Upload a media file (video or image) directly to Cloudinary storage
 */
export async function uploadToCloudinary(
  file: File,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const { folder = 'kala-arts', resourceType = 'auto', onProgress } = options;

  // Determine media type
  const isVideo = file.type.startsWith('video/') || ['mp4', 'mov', 'webm', 'ogg'].some(ext => file.name.toLowerCase().endsWith(`.${ext}`));
  const isImage = file.type.startsWith('image/');
  const detectedType = isVideo ? 'video' : isImage ? 'image' : resourceType;

  // Fallback if Cloudinary credentials are not yet set
  if (!isCloudinaryConfigured) {
    return simulateLocalUpload(file, detectedType as 'image' | 'video', onProgress);
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
 * Preview fallback simulation when testing without active Cloudinary credentials
 */
async function simulateLocalUpload(
  file: File,
  detectedType: 'image' | 'video',
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  const objectUrl = URL.createObjectURL(file);

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
