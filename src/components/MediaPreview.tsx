import React, { useEffect, useState } from 'react';
import { Maximize2, X, Image as ImageIcon, Video } from 'lucide-react';

const isVideoSrc = (src: string) =>
  /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src) || src.includes('/video/');

interface MediaPreviewProps {
  src: string;
  alt?: string;
  /** Wrapper controls layout; defaults to a full-bleed relative box so the
   *  expand button and media fill whatever aspect-ratio parent you drop it in. */
  wrapperClassName?: string;
  mediaClassName?: string;
}

/** Click-to-preview lightbox. Renders the media plus an expand button inside a
 *  positioned wrapper; the button stops propagation so it coexists with card
 *  onClick handlers (e.g. opportunity cards opening a detail modal). */
export const MediaPreview: React.FC<MediaPreviewProps> = ({
  src,
  alt = '',
  wrapperClassName = 'relative block w-full h-full',
  mediaClassName = 'w-full h-full object-cover',
}) => {
  const [open, setOpen] = useState(false);
  const video = isVideoSrc(src);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <div className={wrapperClassName}>
        {video ? (
          <video src={src} preload="metadata" controls muted playsInline className={mediaClassName} />
        ) : (
          <img src={src} alt={alt} loading="lazy" decoding="async" className={mediaClassName} />
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          aria-label="Preview full size"
          title="Preview"
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-xs text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex flex-col animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/70">
              {video ? <Video className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
              <span>Preview</span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close preview"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 px-4 pb-4 flex items-center justify-center">
            {video ? (
              <video
                src={src}
                controls
                autoPlay
                playsInline
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-full rounded-xl"
              />
            ) : (
              <img
                src={src}
                alt={alt}
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-full rounded-xl object-contain"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};
