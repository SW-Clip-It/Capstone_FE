"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/ui/Icon";
import { formatDuration } from "@/lib/utils";

export interface QueueItem {
  blockId: string;
  url: string;
}

interface SeamlessVideoPlayerProps {
  /** Ordered, already URL-resolved list of clips to play back-to-back. */
  queue: QueueItem[];
  /** Currently playing index (controlled by the store). */
  index: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  /** Fraction (0–1) of the CURRENT segment. */
  onSegmentProgress: (fraction: number) => void;
  /** Current segment finished — parent should advance `index`. */
  onSegmentEnded: () => void;
  onError: () => void;
}

/**
 * SeamlessVideoPlayer
 * ─────────────────────────────────────────────────────────────
 * Plays a queue of separate video files back-to-back with NO visible
 * reload between them — without ever merging the files.
 *
 * How: two stacked <video> elements ("double buffering").
 *   - Even queue indices live in slot A, odd indices in slot B.
 *   - While the active slot plays clip N, the other slot has already
 *     loaded clip N+1 with preload="auto" (fully buffered in the
 *     background).
 *   - When the active clip fires `ended`, the parent bumps `index`.
 *     The previously-hidden, already-buffered slot becomes visible and
 *     `play()` is called on it — it starts on the very next frame, so
 *     the transition is imperceptible.
 *
 * This is the same trick streaming players use for gapless playback.
 * It does NOT require server-side concatenation or re-encoding.
 */
export function SeamlessVideoPlayer({
  queue,
  index,
  isPlaying,
  onPlay,
  onPause,
  onSegmentProgress,
  onSegmentEnded,
  onError,
}: SeamlessVideoPlayerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const vidA = useRef<HTMLVideoElement>(null);
  const vidB = useRef<HTMLVideoElement>(null);
  const refs = [vidA, vidB] as const;

  const [segProgress, setSegProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTap = useRef(0);

  const slotOf = (i: number) => (i % 2 === 0 ? 0 : 1);
  const activeSlot = slotOf(index);
  const item = queue[index];

  // ── Slot assignment + preloading ─────────────────────────────
  useEffect(() => {
    const cur = queue[index];
    if (!cur) return;
    const aVid = refs[activeSlot].current;
    const oVid = refs[1 - activeSlot].current;
    if (!aVid) return;

    // Active video — only (re)assign src when it actually changes,
    // so toggling play/pause never triggers a reload.
    if (aVid.getAttribute("data-url") !== cur.url) {
      aVid.setAttribute("data-url", cur.url);
      aVid.src = cur.url;
      aVid.load();
    }
    aVid.volume = volume;
    aVid.muted = muted;
    if (isPlaying) {
      aVid.play().catch(() => {});
    } else {
      aVid.pause();
    }

    // Preload the NEXT clip into the other slot (fully buffered, paused at 0)
    const next = queue[index + 1];
    if (next && oVid) {
      if (oVid.getAttribute("data-url") !== next.url) {
        oVid.setAttribute("data-url", next.url);
        oVid.src = next.url;
        oVid.preload = "auto";
        oVid.load();
      }
      oVid.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, index, isPlaying]);

  // Keep volume/mute applied live
  useEffect(() => {
    const aVid = refs[activeSlot].current;
    if (aVid) {
      aVid.volume = volume;
      aVid.muted = muted;
    }
  }, [volume, muted, activeSlot]);

  // Fullscreen tracking
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (clickTimer.current) clearTimeout(clickTimer.current);
    };
  }, []);

  // ── Active-video event handlers ──────────────────────────────
  const handleTimeUpdate = (slot: number) => {
    if (slotOf(index) !== slot) return;
    const v = refs[slot].current;
    if (v && v.duration) {
      const frac = v.currentTime / v.duration;
      setSegProgress(frac);
      setCurrentTime(v.currentTime);
      onSegmentProgress(frac);
    }
  };

  const handleEnded = (slot: number) => {
    if (slotOf(index) !== slot) return;
    setSegProgress(0);
    onSegmentEnded();
  };

  const handleLoadedMeta = (slot: number) => {
    if (slotOf(index) !== slot) return;
    const v = refs[slot].current;
    if (v) setDuration(v.duration || 0);
  };

  // ── Controls ─────────────────────────────────────────────────
  const showThenHide = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else containerRef.current?.requestFullscreen?.();
  }

  function seek(e: ReactMouseEvent<HTMLDivElement>) {
    const v = refs[activeSlot].current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    v.currentTime = frac * v.duration;
  }

  // Single click → play/pause, double click → fullscreen
  function handleSurfaceClick(e: ReactMouseEvent) {
    if ((e.target as HTMLElement).closest("[data-control]")) return;
    const now = Date.now();
    if (now - lastTap.current < 300) {
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
      isPlaying ? onPause() : onPlay();
      clickTimer.current = null;
    }, 250);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tgt = e.target as HTMLElement;
      if (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        isPlaying ? onPause() : onPlay();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "m" || e.key === "M") {
        setMuted((m) => !m);
      } else if (e.key === "ArrowRight") {
        const v = refs[activeSlot].current;
        if (v) v.currentTime = Math.min(v.duration, v.currentTime + 5);
      } else if (e.key === "ArrowLeft") {
        const v = refs[activeSlot].current;
        if (v) v.currentTime = Math.max(0, v.currentTime - 5);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, activeSlot, onPlay, onPause]);

  if (!item) {
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
      onMouseMove={showThenHide}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={handleSurfaceClick}
    >
      {/* Two stacked video slots */}
      {[0, 1].map((slot) => (
        <video
          key={slot}
          ref={refs[slot]}
          playsInline
          className="absolute inset-0 w-full h-full object-contain bg-black transition-opacity duration-150"
          style={{
            opacity: activeSlot === slot ? 1 : 0,
            zIndex: activeSlot === slot ? 2 : 1,
          }}
          onTimeUpdate={() => handleTimeUpdate(slot)}
          onEnded={() => handleEnded(slot)}
          onLoadedMetadata={() => handleLoadedMeta(slot)}
          onError={() => {
            if (slotOf(index) === slot) onError();
          }}
        />
      ))}

      {/* Center play glyph when paused */}
      {!isPlaying && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur flex items-center justify-center opacity-85">
            <Icon name="play_arrow" size={36} className="text-white" fill />
          </div>
        </div>
      )}

      {/* Controls */}
      {showControls && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none">
          {/* Queue overview dots (multi-segment) — non-interactive */}
          {queue.length > 1 && (
            <div className="flex items-center gap-1.5 px-4 pt-3 pointer-events-none">
              {queue.map((_, i) => (
                <div
                  key={i}
                  className="h-0.5 rounded-full"
                  style={{
                    flex: 1,
                    background:
                      i < index
                        ? "rgb(var(--accent-primary))"
                        : "rgba(255,255,255,0.25)",
                  }}
                />
              ))}
            </div>
          )}

          {/* Seekable scrubber for the CURRENT segment (always) */}
          <div
            data-control
            className="group/seek mx-4 mt-2 py-2 cursor-pointer pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              seek(e);
            }}
          >
            <div className="h-1 bg-white/25 rounded-full relative">
              <div
                className="h-full bg-accent-primary rounded-full relative"
                style={{ width: `${segProgress * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full bg-accent-primary shadow opacity-0 group-hover/seek:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-3 px-4 py-3 text-white pointer-events-auto">
            <button
              data-control
              onClick={(e) => {
                e.stopPropagation();
                isPlaying ? onPause() : onPlay();
              }}
              className="hover:text-accent-primary transition-colors cursor-pointer"
              title={isPlaying ? "Pause (space)" : "Play (space)"}
            >
              <Icon name={isPlaying ? "pause" : "play_arrow"} size={28} fill />
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
                  muted ? "volume_off" : volume > 0.5 ? "volume_up" : "volume_down"
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

            {queue.length > 1 && (
              <span className="text-xs text-white/80 font-medium tabular-nums">
                {t("reader.segment")} {index + 1}/{queue.length}
              </span>
            )}

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
        </div>
      )}
    </div>
  );
}
