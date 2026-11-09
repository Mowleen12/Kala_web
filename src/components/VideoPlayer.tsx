import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  RotateCw, 
  Film,
  ExternalLink 
} from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title,
  poster,
  className = '',
  autoPlay = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if URL is an external video stream or embed (YouTube/Vimeo)
  const isYouTube = src.includes('youtube.com') || src.includes('youtu.be');
  const isVimeo = src.includes('vimeo.com');

  const getYouTubeEmbedUrl = (url: string) => {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split(/[?#]/)[0] || '';
    } else if (url.includes('watch?v=')) {
      videoId = new URL(url).searchParams.get('v') || '';
    }
    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0` : url;
  };

  const getVimeoEmbedUrl = (url: string) => {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}` : url;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const changeSpeed = () => {
    const speeds = [0.75, 1, 1.25, 1.5];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2500);
  };

  if (isYouTube) {
    return (
      <div className={`relative bg-zinc-950 rounded-2xl overflow-hidden aspect-video border border-zinc-800 shadow-lg ${className}`}>
        {title && (
          <div className="absolute top-2 left-3 z-10 bg-zinc-900/80 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-semibold text-white">
            {title}
          </div>
        )}
        <iframe
          src={getYouTubeEmbedUrl(src)}
          title={title || 'Video Player'}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (isVimeo) {
    return (
      <div className={`relative bg-zinc-950 rounded-2xl overflow-hidden aspect-video border border-zinc-800 shadow-lg ${className}`}>
        {title && (
          <div className="absolute top-2 left-3 z-10 bg-zinc-900/80 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-semibold text-white">
            {title}
          </div>
        )}
        <iframe
          src={getVimeoEmbedUrl(src)}
          title={title || 'Vimeo Player'}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={`group relative bg-zinc-950 rounded-2xl overflow-hidden aspect-video border border-zinc-800 shadow-xl flex items-center justify-center select-none ${className}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        playsInline
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer bg-zinc-950"
      />

      {/* Video Title Header */}
      {title && (
        <div className={`absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 pointer-events-none z-10 flex items-center justify-between ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-2 text-white font-medium text-xs sm:text-sm drop-shadow-md truncate">
            <Film className="w-3.5 h-3.5 text-[#E45826] shrink-0" />
            <span className="truncate">{title}</span>
          </div>
          <div className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-white/20 text-white backdrop-blur-sm">
            HD Preview
          </div>
        </div>
      )}

      {/* Center Big Play Button (when paused) */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute z-20 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#E45826] hover:bg-[#D44716] text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-xs"
        >
          <Play className="w-6 h-6 sm:w-7 sm:h-7 ml-1 fill-white" />
        </button>
      )}

      {/* Overlay Player Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent pt-8 pb-3 px-3 sm:px-4 z-20 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress / Seek bar */}
        <div className="relative mb-2 flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-zinc-700/70 rounded-lg appearance-none cursor-pointer accent-[#E45826] hover:h-2 transition-all"
          />
        </div>

        {/* Action Controls & Timings */}
        <div className="flex items-center justify-between text-white text-xs gap-2">
          {/* Left Controls: Play/Pause, Rewind, Forward, Duration */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-white"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <button
              onClick={() => handleSkip(-5)}
              className="p-1 hover:bg-white/10 rounded-md transition-colors cursor-pointer text-zinc-300 hover:text-white"
              title="Rewind 5s"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleSkip(5)}
              className="p-1 hover:bg-white/10 rounded-md transition-colors cursor-pointer text-zinc-300 hover:text-white"
              title="Forward 5s"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] font-mono text-zinc-300 ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls: Volume, Speed, Fullscreen */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Volume slider */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="p-1 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 sm:w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#E45826]"
              />
            </div>

            {/* Playback rate pill */}
            <button
              onClick={changeSpeed}
              className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/10 hover:bg-white/20 text-zinc-200 transition-colors cursor-pointer"
              title="Toggle Playback Speed"
            >
              {playbackSpeed}x
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-zinc-200 hover:text-white"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
