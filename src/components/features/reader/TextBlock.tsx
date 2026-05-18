"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { useReaderStore } from "@/stores/readerStore";
import { useToast } from "@/providers/ToastProvider";
import type { TextBlockWithVideo, Bookmark } from "@/types/database";

interface TextBlockProps {
  block: TextBlockWithVideo;
  isActive: boolean;
  onClick: () => void;
  onBookmarkChange?: (blockId: string, bookmark: Bookmark | null) => void;
}

export function TextBlock({
  block,
  isActive,
  onClick,
  onBookmarkChange,
}: TextBlockProps) {
  const hasVideo = !!block.video_clip;
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const videoProgress = useReaderStore((s) => s.videoProgress);

  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [noteDraft, setNoteDraft] = useState(block.bookmark?.note ?? "");
  const [showTranslation, setShowTranslation] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [localBookmark, setLocalBookmark] = useState<Bookmark | null>(
    block.bookmark ?? null
  );

  useEffect(() => {
    setLocalBookmark(block.bookmark ?? null);
    setNoteDraft(block.bookmark?.note ?? "");
  }, [block.bookmark]);

  // Smooth progress (interpolate at 60fps between actual updates)
  const smoothedProgress = useSmoothedProgress(isActive ? videoProgress : 0);

  const hasKo = !!block.content_ko;
  const display =
    showTranslation && hasKo
      ? block.content_ko!
      : i18n.language === "ko" && hasKo
        ? block.content_ko!
        : block.content;

  const isBookmarked = !!localBookmark;

  async function toggleBookmark(e: React.MouseEvent) {
    e.stopPropagation();
    setSavingBookmark(true);
    try {
      if (isBookmarked) {
        await fetch(`/api/bookmarks?text_block_id=${block.id}`, {
          method: "DELETE",
        });
        setLocalBookmark(null);
        onBookmarkChange?.(block.id, null);
        toast(t("reader.bookmarkRemoved"), "info");
      } else {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text_block_id: block.id, note: null }),
        });
        const bm = await res.json();
        setLocalBookmark(bm);
        onBookmarkChange?.(block.id, bm);
        toast(t("reader.bookmarkSaved"), "success");
      }
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSavingBookmark(false);
    }
  }

  async function saveNote(e?: React.MouseEvent) {
    e?.stopPropagation();
    setSavingBookmark(true);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text_block_id: block.id,
          note: noteDraft.trim() || null,
        }),
      });
      const bm = await res.json();
      setLocalBookmark(bm);
      onBookmarkChange?.(block.id, bm);
      setShowNoteEditor(false);
      toast(t("reader.noteSaved"), "success");
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSavingBookmark(false);
    }
  }

  return (
    <motion.div
      layout
      id={`block-${block.id}`}
      onClick={hasVideo ? onClick : undefined}
      className={cn(
        "relative rounded-xl transition-colors duration-300",
        hasVideo ? "cursor-pointer" : "cursor-default opacity-70",
        isActive
          ? "bg-accent-primary/8"
          : "border border-glass-border bg-glass-bg hover:bg-glass-bg-hover hover:border-glass-border-hover"
      )}
      whileHover={hasVideo && !isActive ? { scale: 1.005 } : undefined}
    >
      {isActive && <EqualizerBorder progress={smoothedProgress} />}

      {/* Now Playing badge */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-accent-primary text-white text-xs flex items-center gap-1 z-10"
        >
          <Icon name="play_arrow" size={12} fill />
          {t("reader.nowPlaying")}
          <span className="ml-1 tabular-nums opacity-90">
            {Math.round(smoothedProgress * 100)}%
          </span>
        </motion.div>
      )}

      <div className="flex items-start gap-3 p-4">
        {!isActive && (
          <div className="shrink-0 mt-1">
            {hasVideo ? (
              <Icon
                name="play_arrow"
                size={18}
                className="text-on-surface-variant"
              />
            ) : (
              <Icon
                name="text_snippet"
                size={18}
                className="text-on-surface-variant"
              />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "font-reading transition-[font-size,line-height] duration-300",
              isActive
                ? "text-[19px] sm:text-[20px] leading-[1.7] text-on-surface font-medium tracking-[-0.005em]"
                : "text-[15px] leading-[1.65] text-on-surface-variant"
            )}
          >
            {display}
          </p>

          {/* Active block toolbar — bookmark / note / translate */}
          {isActive && (
            <div className="flex items-center gap-1 mt-3 pt-3 border-t border-glass-border/60">
              <ToolButton
                icon={isBookmarked ? "bookmark" : "bookmark_border"}
                fill={isBookmarked}
                active={isBookmarked}
                disabled={savingBookmark}
                onClick={toggleBookmark}
                label={
                  isBookmarked
                    ? t("reader.bookmarked")
                    : t("reader.bookmark")
                }
              />
              <ToolButton
                icon="edit_note"
                active={showNoteEditor || !!localBookmark?.note}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNoteEditor((v) => !v);
                }}
                label={t("reader.note")}
              />
              {hasKo && (
                <ToolButton
                  icon="translate"
                  active={showTranslation}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTranslation((v) => !v);
                  }}
                  label={t("reader.translate")}
                />
              )}
            </div>
          )}

          {/* Note editor */}
          <AnimatePresence>
            {isActive && showNoteEditor && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-3"
                onClick={(e) => e.stopPropagation()}
              >
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder={t("reader.notePlaceholder")}
                  rows={3}
                  className="w-full p-3 rounded-lg bg-background border border-glass-border focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-sm resize-none text-on-surface placeholder:text-on-surface-variant/60"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNoteEditor(false);
                      setNoteDraft(localBookmark?.note ?? "");
                    }}
                    className="px-3 py-1.5 text-xs rounded-md text-on-surface-variant hover:bg-glass-bg-hover transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={saveNote}
                    disabled={savingBookmark}
                    className="px-3 py-1.5 text-xs rounded-md bg-accent-primary text-white hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
                  >
                    {t("common.save")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Show existing note inline (when not editing) */}
          {isActive && !showNoteEditor && localBookmark?.note && (
            <div className="mt-3 p-3 rounded-lg bg-background/60 border border-glass-border text-sm italic text-on-surface-variant">
              <Icon
                name="format_quote"
                size={14}
                className="inline mr-1 align-text-top"
              />
              {localBookmark.note}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * useSmoothedProgress
 * ─────────────────────────────────────────────
 * The video player reports `played` at ~5 Hz (every 200 ms).
 * If we bind the SVG stroke directly to that value, the border
 * jumps in visible steps. We linearly interpolate towards the
 * target value at 60 FPS so the equalizer fill always feels
 * fluid even when the underlying signal is coarse.
 */
function useSmoothedProgress(target: number) {
  const [smooth, setSmooth] = useState(target);
  const raf = useRef<number | null>(null);
  const last = useRef<number>(performance.now());

  useEffect(() => {
    function tick(now: number) {
      const dt = (now - last.current) / 1000;
      last.current = now;

      setSmooth((prev) => {
        const diff = target - prev;
        if (Math.abs(diff) < 0.0005) return target;
        // Reset when target jumps far backwards (new block / seek)
        if (target < prev - 0.05) return target;
        // Approach target — speed proportional to distance, capped so it never feels laggy
        const speed = Math.min(Math.abs(diff) * 6, 1) * dt;
        return prev + Math.sign(diff) * Math.min(Math.abs(diff), speed);
      });

      raf.current = requestAnimationFrame(tick);
    }

    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [target]);

  return smooth;
}

/**
 * EqualizerBorder
 * ─────────────────────────────────────────────────────────────
 * Glowing border drawn around the active block, filling clockwise
 * from the top-left as the video progresses. A pulsing "head"
 * segment travels along the leading edge for an equalizer feel.
 *
 * Smooth animation comes from `useSmoothedProgress` upstream
 * (60 FPS interpolation), so this component just paints what
 * it receives — no `transition` on the dash itself (which is
 * what caused the visible "step" jumps before).
 */
function EqualizerBorder({ progress }: { progress: number }) {
  const dashPattern = "6 4"; // dash + gap (visual rhythm of the EQ bars)

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
      aria-hidden
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="eq-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgb(var(--accent-primary))" />
          <stop offset="100%" stopColor="rgb(var(--accent-secondary))" />
        </linearGradient>
      </defs>

      {/* Track */}
      <rect
        x="1"
        y="1"
        width="calc(100% - 2px)"
        height="calc(100% - 2px)"
        rx="11"
        ry="11"
        fill="none"
        stroke="rgb(var(--accent-primary) / 0.22)"
        strokeWidth="2"
        strokeDasharray={dashPattern}
      />

      {/* Progress fill (normalized via pathLength=1) */}
      <rect
        x="1"
        y="1"
        width="calc(100% - 2px)"
        height="calc(100% - 2px)"
        rx="11"
        ry="11"
        fill="none"
        stroke="url(#eq-grad)"
        strokeWidth="2.5"
        strokeDasharray={dashPattern}
        pathLength={1}
        style={{
          // No CSS transition here — smoothing happens in JS at 60fps.
          strokeDasharray: `${Math.max(progress, 0.0001)} ${1 - Math.max(progress, 0.0001) + 0.0001}`,
          filter: "drop-shadow(0 0 4px rgb(var(--accent-primary) / 0.5))",
        }}
      />

      {/* Pulse head */}
      {progress > 0.005 && progress < 0.995 && (
        <rect
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx="11"
          ry="11"
          fill="none"
          stroke="rgb(var(--accent-secondary))"
          strokeWidth="3"
          pathLength={1}
          strokeDasharray="0.014 0.986"
          style={{
            strokeDashoffset: -progress,
            filter: "drop-shadow(0 0 6px rgb(var(--accent-secondary) / 0.8))",
            animation: "eq-pulse 1.2s ease-in-out infinite",
          }}
        />
      )}
    </svg>
  );
}

function ToolButton({
  icon,
  label,
  active,
  fill,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  fill?: boolean;
  disabled?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50",
        active
          ? "text-accent-primary hover:bg-accent-primary/10"
          : "text-on-surface-variant hover:text-accent-primary hover:bg-accent-primary/5"
      )}
    >
      <Icon name={icon} size={14} fill={fill} />
      {label}
    </button>
  );
}
