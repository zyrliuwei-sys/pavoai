import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface PreviewVideo {
  src: string;
  poster: string;
  duration: string;
}

interface VideoPreviewProps {
  video: PreviewVideo;
  alt: string;
  playLabel: string;
  pauseLabel: string;
  className?: string;
}

/** Load nearby clips, play visible clips, and keep a real frame as the poster. */
export function VideoPreview({
  video,
  alt,
  playLabel,
  pauseLabel,
  className,
}: VideoPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);
  const [autoplayAllowed, setAutoplayAllowed] = useState(false);
  const [userPlayback, setUserPlayback] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    const updatePreference = () =>
      setAutoplayAllowed(!motion.matches && !connection?.saveData);
    const updateVisibility = () => setVisible(!document.hidden);
    updatePreference();
    updateVisibility();
    motion.addEventListener('change', updatePreference);
    document.addEventListener('visibilitychange', updateVisibility);

    const loadObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoaded(true);
          loadObserver.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    const playObserver = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.1 }
    );
    loadObserver.observe(container);
    playObserver.observe(container);

    return () => {
      loadObserver.disconnect();
      playObserver.disconnect();
      motion.removeEventListener('change', updatePreference);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !loaded || failed) return;
    if (inView && visible && (userPlayback ?? autoplayAllowed)) {
      // Autoplay can be denied by browser policy; the play button remains usable.
      void element.play().catch(() => {});
    } else {
      element.pause();
    }
  }, [autoplayAllowed, failed, inView, loaded, userPlayback, visible]);

  const togglePlayback = () => {
    const element = videoRef.current;
    if (!element) return;
    if (element.paused) {
      setUserPlayback(true);
      void element.play().catch(() => {});
    } else {
      setUserPlayback(false);
      element.pause();
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn('absolute inset-0 overflow-hidden bg-black', className)}
    >
      {failed ? (
        <img
          src={video.poster}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          <video
            ref={videoRef}
            src={loaded ? video.src : undefined}
            poster={video.poster}
            aria-label={alt}
            muted
            loop
            playsInline
            preload="none"
            onPlaying={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={`${playing ? pauseLabel : playLabel}: ${alt}`}
            title={playing ? pauseLabel : playLabel}
            className="absolute top-2 right-2 z-20 flex size-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {playing ? (
              <Pause size={13} fill="currentColor" aria-hidden />
            ) : (
              <Play size={13} fill="currentColor" aria-hidden />
            )}
          </button>
        </>
      )}
    </div>
  );
}
