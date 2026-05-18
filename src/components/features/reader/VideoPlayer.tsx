"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import ReactPlayer from "react-player";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/ui/Icon";
import { formatDuration } from "@/lib/utils";

interface VideoPlayerProps {
  url: string | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
  onError: () => void;
  onProgress?: (fraction: number) => void;
}

export function VideoPlayer({
  url,
  isPlaying,
  onPlay,
  onPause,
  onEnded,
  onError,
  onProgress,
}: VideoPlayerProps) {
  const playerRef = useRef<ReactPlayer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTap = useRef<number>(0);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      if (clickTimer.current) clearTimeout(clickTimer.current);
    };
  }, []);

  // Track fullscreen changes
  useEffect(() => {
    const handleFsChange = () =>
      setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    playerRef.current?.seekTo(fraction, "fraction");
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      containerRef.current?.requestFullscreen?.();
    }
  }

  // Single-click toggles play/pause; double-click toggles fullscreen.
  // Use a 250ms grace window to distinguish single from double click.
  function handleSurfaceClick(e: React.MouseEvent) {
    // Don't fire on controls
    if ((e.target as HTMLElement).closest("[data-control]")) return;

    const now = Date.now();
    if (now - lastTap.current < 300) {
      // double click
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
      }
      lastTap.current = 0;
      toggleFullscreen();
      return;
    }
    lastTap.current = now;

    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      if (isPlaying) onPause();
      else onPlay();
      clickTimer.current = null;
    }, 250);
  }

  // Keyboard shortcuts (space / f / m / arrows)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        isPlaying ? onPause() : onPlay();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "m" || e.key === "M") {
        setMuted((m) => !m);
      } else if (e.key === "ArrowRight") {
        const current = playerRef.current?.getCurrentTime() ?? 0;
        playerRef.current?.seekTo(current + 5, "seconds");
      } else if (e.key === "ArrowLeft") {
        const current = playerRef.current?.getCurrentTime() ?? 0;
        playerRef.current?.seekTo(Math.max(0, current - 5), "seconds");
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isPlaying, onPause, onPlay]);

  if (!url) {
    return (
      <div className="aspect-video w-full glass rounded-2xl flex items-center justify-center">
        <div className="text-center text-on-surface-variant">
          <Icon name="movie" size={48} className="mb-3 mx-auto opacity-50" />
          <p className="text-sm">{t("reader.selectBlock")}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="aspect-video w-full rounded-2xl overflow-hidden relative bg-black group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={handleSurfaceClick}
    >
      <ReactPlayer
        ref={playerRef}
        url={url}
        playing={isPlaying}
        volume={volume}
        muted={muted}
        width="100%"
        height="100%"
        onProgress={({ played, playedSeconds }) => {
          setProgress(played);
          setCurrentTime(playedSeconds);
          onProgress?.(played);
        }}
        onDuration={setDuration}
        onEnded={onEnded}
        onError={onError}
        onBuffer={() => setBuffering(true)}
        onBufferEnd={() => setBuffering(false)}
        progressInterval={100}
        config={{
          file: {
            attributes: {
              // Prevent native controls (we have our own)
              controlsList: "nodownload",
              disablePictureInPicture: false,
            },
          },
        }}
      />

      {/* Buffering */}
      <AnimatePresence>
        {buffering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none"
          >
            <Icon
              name="progress_activity"
              size={48}
              className="text-white animate-spin"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center play icon flash on pause */}
      {!isPlaying && !buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            key={isPlaying ? "playing" : "paused"}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.85 }}
            transition={{ duration: 0.2 }}
            className="w-16 h-16 rounded-full bg-black/40 backdrop-blur flex items-center justify-center"
          >
            <Icon name="play_arrow" size={36} className="text-white" fill />
          </motion.div>
        </div>
      )}

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"
          >
            {/* Progress bar */}
            <div
              data-control
              className="h-1 mx-4 mb-2 bg-white/20 rounded-full cursor-pointer group/progress pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                handleSeek(e);
              }}
            >
              <div
                className="h-full bg-accent-primary rounded-full relative"
                style={{ width: `${progress * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent-primary opacity-0 group-hover/progress:opacity-100 transition-opacity" />
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 pb-3 text-white pointer-events-auto">
              <button
                data-control
                onClick={(e) => {
                  e.stopPropagation();
                  isPlaying ? onPause() : onPlay();
                }}
                className="hover:text-accent-primary transition-colors cursor-pointer"
                title={isPlaying ? "Pause (space)" : "Play (space)"}
              >
                <Icon
                  name={isPlaying ? "pause" : "play_arrow"}
                  size={28}
                  fill
                />
              </button>

              <button
                data-control
                onClick={(e) => {
                  e.stopPropagation();
                  setMuted(!muted);
                }}
                className="hover:text-accent-primary transition-colors cursor-pointer"
                title="Mute (M)"
              >
                <Icon
                  name={
                    muted
                      ? "volume_off"
                      : volume > 0.5
                        ? "volume_up"
                        : "volume_down"
                  }
                  size={22}
                />
              </button>

              <input
                data-control
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setMuted(false);
                }}
                className="w-20 accent-accent-primary"
              />

              <span className="text-xs text-white/70 ml-auto tabular-nums">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>

              <button
                data-control
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="hover:text-accent-primary transition-colors cursor-pointer"
                title="Fullscreen (F / double-click)"
              >
                <Icon
                  name={isFullscreen ? "fullscreen_exit" : "fullscreen"}
                  size={22}
                />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
