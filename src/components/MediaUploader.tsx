import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  Video, 
  Image as ImageIcon, 
  X, 
  CheckCircle2, 
  Loader2, 
  Play, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { uploadToCloudinary, CloudinaryUploadResult } from '../lib/cloudinary';
import { maxBytesFor, isVideoFile, formatMB } from '../lib/limits';

interface MediaUploaderProps {
  label?: string;
  description?: string;
  value?: string;
  resourceType?: 'image' | 'video' | 'auto';
  folder?: string;
  onChange: (url: string, result?: CloudinaryUploadResult) => void;
  onRemove?: () => void;
  /** Spec §6 send path step 1: runs before any upload, returns an error to
   *  show (rejecting the file) or null to proceed. ThreadModal uses it for the
   *  monthly budget so a rejected insert can never orphan an uploaded asset. */
  beforeUpload?: (file: File) => string | null;
  className?: string;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  label = "Upload Media",
  description = "Supports images (PNG, JPG, WEBP) and video audition reels (MP4, MOV, WEBM)",
  value,
  resourceType = 'auto',
  folder = 'kala-arts',
  onChange,
  onRemove,
  beforeUpload,
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadDetails, setUploadDetails] = useState<CloudinaryUploadResult | null>(null);
  /** Local pre-upload review: file is validated but NOT sent to Cloudinary
   *  until the user confirms. Object URL is revoked whenever `pending`
   *  changes or the component unmounts. */
  const [pending, setPending] = useState<{ file: File; url: string; video: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (pending) URL.revokeObjectURL(pending.url);
  }, [pending]);

  const isVideo = value && (
    value.includes('/video/') || 
    value.endsWith('.mp4') || 
    value.endsWith('.webm') || 
    value.endsWith('.mov') ||
    uploadDetails?.resourceType === 'video'
  );

  const handleFile = async (file: File) => {
    setError(null);

    const limitBytes = maxBytesFor(file);
    if (file.size > limitBytes) {
      const kind = isVideoFile(file) ? 'video' : 'image';
      setError(
        `${formatMB(file.size)} exceeds the ${formatMB(limitBytes)} ${kind} limit`
      );
      return;
    }

    const gateError = beforeUpload?.(file);
    if (gateError) {
      setError(gateError);
      return;
    }

    // Hold for review instead of uploading immediately.
    setPending({ file, url: URL.createObjectURL(file), video: isVideoFile(file) });
  };

  const cancelPending = () => {
    setPending(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmPending = async () => {
    if (!pending) return;
    const { file } = pending;
    setPending(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setIsUploading(true);
    setProgress(0);

    try {
      const result = await uploadToCloudinary(file, {
        folder,
        resourceType,
        onProgress: (pct) => setProgress(pct),
      });

      setUploadDetails(result);
      onChange(result.secureUrl, result);
    } catch (err: any) {
      setError(err?.message || 'Failed to upload media. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadDetails(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onRemove) {
      onRemove();
    } else {
      onChange('');
    }
  };

  const getAcceptedTypes = () => {
    if (resourceType === 'image') return 'image/*';
    if (resourceType === 'video') return 'video/*,video/mp4,video/quicktime,video/webm';
    return 'image/*,video/*,video/mp4,video/quicktime,video/webm';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-zinc-700">
          {label}
        </label>
      )}

      {/* Pre-upload review: nothing has been sent to the CDN yet */}
      {pending ? (
        <div className="rounded-2xl overflow-hidden border-2 border-[#E45826]/40 bg-white shadow-xs">
          <div className="relative bg-zinc-950 flex items-center justify-center max-h-56 overflow-hidden">
            {pending.video ? (
              <video src={pending.url} controls muted playsInline className="w-full max-h-56 object-contain" />
            ) : (
              <img src={pending.url} alt="Upload preview" className="w-full max-h-56 object-contain" />
            )}
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full text-white text-[11px] font-semibold flex items-center gap-1.5">
              {pending.video ? <Video className="w-3 h-3 text-red-400" /> : <ImageIcon className="w-3 h-3 text-sky-400" />}
              <span>Preview — not uploaded yet</span>
            </div>
          </div>
          <div className="p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="min-w-0">
              <p className="truncate font-semibold text-zinc-800">{pending.file.name}</p>
              <p className="text-[11px] text-zinc-500">{formatMB(pending.file.size)} ready to upload</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={cancelPending}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E0D6] text-zinc-600 font-semibold hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPending}
                className="px-3.5 py-1.5 rounded-lg bg-[#E45826] hover:bg-[#D44716] text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Confirm & Upload</span>
              </button>
            </div>
          </div>
        </div>
      ) : value ? (
        <div className="relative rounded-2xl overflow-hidden border border-[#E9E4DC] bg-zinc-950 shadow-xs group">
          {isVideo ? (
            <div className="relative aspect-video max-h-56 bg-zinc-950 flex items-center justify-center">
              <video 
                src={value} 
                controls 
                className="w-full h-full object-contain max-h-56"
                poster="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80"
              />
              <div className="absolute top-2 left-2 pointer-events-none bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full text-white text-[11px] font-semibold flex items-center gap-1.5">
                <Video className="w-3 h-3 text-red-400" />
                <span>Video Reel</span>
              </div>
            </div>
          ) : (
            <div className="relative aspect-video max-h-52 bg-zinc-100 flex items-center justify-center overflow-hidden">
              <img 
                src={value} 
                alt="Uploaded media" 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full text-white text-[11px] font-semibold flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3 text-sky-400" />
                <span>Image Media</span>
              </div>
            </div>
          )}

          {/* Remove / Change Overlay Bar */}
          <div className="p-2.5 bg-white border-t border-[#E9E4DC] flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 truncate">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate font-medium text-zinc-700">
                {uploadDetails?.publicId || 'Media ready & attached'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold transition-colors cursor-pointer"
              >
                Change
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                title="Remove media"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 ${
            isDragging 
              ? 'border-[#E45826] bg-[#FFF8F5]' 
              : 'border-[#E5DFD5] hover:border-[#E45826] bg-[#FAF8F5] hover:bg-[#FFF8F5]'
          }`}
        >
          {isUploading ? (
            <div className="py-4 space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-[#FCEEE7] text-[#E45826] flex items-center justify-center animate-spin">
                <Loader2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900">
                  Uploading media... {progress}%
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Optimizing media & generating CDN links</p>
              </div>
              {/* Progress bar */}
              <div className="w-full max-w-xs mx-auto bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#E45826] h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-11 h-11 mx-auto rounded-2xl bg-white border border-[#E8E2D8] text-[#E45826] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                {resourceType === 'video' ? (
                  <Video className="w-5 h-5" />
                ) : resourceType === 'image' ? (
                  <ImageIcon className="w-5 h-5" />
                ) : (
                  <UploadCloud className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-800">
                  <span className="text-[#E45826] underline underline-offset-2">Click to browse</span> or drag and drop
                </p>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  {description}
                </p>
              </div>
              <div className="pt-1 flex items-center justify-center gap-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                <span>MP4 • MOV • WEBM</span>
                <span>•</span>
                <span>JPG • PNG • WEBP</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptedTypes()}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Error Message */}
      {error && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
