"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/ToastProvider";
import type { TextBlockWithVideo, Bookmark } from "@/types/database";

interface ReaderProseProps {
  blocks: TextBlockWithVideo[];
  activeBlockId: string | null;
  queueIds: string[];
  showKo: boolean;
  /** A drag-selection resolved to ordered video block IDs. */
  onSelectBlocks: (ids: string[]) => void;
  /** A plain click on a single video block. */
  onClickBlock: (id: string) => void;
  onBookmarkChange?: (blockId: string, bookmark: Bookmark | null) => void;
}

export function ReaderProse({
  blocks,
  activeBlockId,
  queueIds,
  showKo,
  onSelectBlocks,
  onClickBlock,
  onBookmarkChange,
}: ReaderProseProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const queueSet = new Set(queueIds);

  // Resolve which video blocks a text selection covers, in document order.
  const captureSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const spans =
      containerRef.current?.querySelectorAll<HTMLElement>("[data-block-id]") ??
      [];
    const ids: string[] = [];
    spans.forEach((span) => {
      const hasVideo = span.getAttribute("data-has-video") === "1";
      if (hasVideo && range.intersectsNode(span)) {
        ids.push(span.getAttribute("data-block-id")!);
      }
    });
    if (ids.length > 0) {
      onSelectBlocks(ids);
      sel.removeAllRanges(); // hand off to our own persistent highlight
    }
  }, [onSelectBlocks]);

  return (
    <div className="flex flex-col lg:h-full">
      <div
        ref={containerRef}
        onMouseUp={captureSelection}
        onTouchEnd={captureSelection}
        className="lg:flex-1 lg:overflow-y-auto px-5 sm:px-10 py-6 sm:py-8 scroll-smooth"
      >
        {blocks.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant text-sm">
            {t("reader.noBlocks")}
          </div>
        ) : (
          <article className="max-w-[680px] mx-auto font-reading text-[19px] sm:text-[20px] leading-[1.9] text-on-surface text-justify [hyphens:auto] selection:bg-accent-primary/30">
            {blocks.map((block, i) => {
              const hasVideo = !!block.video_clip;
              const isActive = block.id === activeBlockId;
              const inQueue = queueSet.has(block.id);
              const text =
                showKo && block.content_ko ? block.content_ko : block.content;

              return (
                <span key={block.id}>
                  <span
                    id={`block-${block.id}`}
                    data-block-id={block.id}
                    data-has-video={hasVideo ? "1" : "0"}
                    onClick={() => {
                      // Ignore if this was the tail of a drag selection
                      const sel = window.getSelection();
                      if (sel && !sel.isCollapsed) return;
                      if (hasVideo) onClickBlock(block.id);
                    }}
                    className={cn(
                      "[box-decoration-break:clone] [-webkit-box-decoration-break:clone] rounded-[3px] px-0.5 -mx-0.5 transition-colors duration-300",
                      hasVideo && "cursor-pointer",
                      isActive
                        ? "bg-accent-primary/25 text-on-surface"
                        : inQueue
                          ? "bg-accent-primary/10"
                          : hasVideo
                            ? "hover:bg-accent-primary/8"
                            : ""
                    )}
                  >
                    {text}
                  </span>
                  {/* space between blocks keeps the prose flowing */}
                  {i < blocks.length - 1 ? " " : ""}
                </span>
              );
            })}
          </article>
        )}
      </div>

      {/* Selection hint (only before anything is playing) */}
      {!activeBlockId && blocks.length > 0 && (
        <div className="shrink-0 px-6 py-2.5 border-t border-glass-border bg-background/80 backdrop-blur text-center">
          <p className="text-xs text-on-surface-variant flex items-center justify-center gap-1.5">
            <Icon name="ink_highlighter" size={14} className="text-accent-primary" />
            {t("reader.selectHint")}
          </p>
        </div>
      )}

      {/* Active-block action bar (bookmark / note) */}
      <AnimatePresence>
        {activeBlockId && (
          <ActiveBlockBar
            key={activeBlockId}
            block={blocks.find((b) => b.id === activeBlockId)!}
            onBookmarkChange={onBookmarkChange}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Bottom action bar for the currently-active block ──────────────
function ActiveBlockBar({
  block,
  onBookmarkChange,
}: {
  block: TextBlockWithVideo;
  onBookmarkChange?: (blockId: string, bookmark: Bookmark | null) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [bookmark, setBookmark] = useState<Bookmark | null>(
    block.bookmark ?? null
  );
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState(block.bookmark?.note ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBookmark(block.bookmark ?? null);
    setNote(block.bookmark?.note ?? "");
    setShowNote(false);
  }, [block.id, block.bookmark]);

  const isBookmarked = !!bookmark;

  async function toggleBookmark() {
    setSaving(true);
    try {
      if (isBookmarked) {
        await fetch(`/api/bookmarks?text_block_id=${block.id}`, {
          method: "DELETE",
        });
        setBookmark(null);
        onBookmarkChange?.(block.id, null);
        toast(t("reader.bookmarkRemoved"), "info");
      } else {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text_block_id: block.id, note: null }),
        });
        const bm = await res.json();
        setBookmark(bm);
        onBookmarkChange?.(block.id, bm);
        toast(t("reader.bookmarkSaved"), "success");
      }
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveNote() {
    setSaving(true);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text_block_id: block.id,
          note: note.trim() || null,
        }),
      });
      const bm = await res.json();
      setBookmark(bm);
      onBookmarkChange?.(block.id, bm);
      setShowNote(false);
      toast(t("reader.noteSaved"), "success");
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className="shrink-0 border-t border-glass-border bg-background/95 backdrop-blur-md sticky bottom-0 z-20 lg:static"
    >
      <AnimatePresence>
        {showNote && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-5 pt-4"
          >
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("reader.notePlaceholder")}
              rows={3}
              className="w-full p-3 rounded-lg bg-surface-secondary border border-glass-border focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-sm resize-none text-on-surface placeholder:text-on-surface-variant/60"
            />
            <div className="flex justify-end gap-2 mt-2 pb-1">
              <button
                onClick={() => {
                  setShowNote(false);
                  setNote(bookmark?.note ?? "");
                }}
                className="px-3 py-1.5 text-xs rounded-md text-on-surface-variant hover:bg-glass-bg-hover transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={saveNote}
                disabled={saving}
                className="px-3 py-1.5 text-xs rounded-md bg-accent-primary text-white hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
              >
                {t("common.save")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1 px-4 py-2.5">
        <span className="text-xs text-on-surface-variant mr-2 flex items-center gap-1">
          <Icon name="play_circle" size={14} className="text-accent-primary" fill />
          {t("reader.nowPlaying")}
        </span>
        <div className="flex-1" />
        <BarButton
          icon={isBookmarked ? "bookmark" : "bookmark_border"}
          fill={isBookmarked}
          active={isBookmarked}
          disabled={saving}
          onClick={toggleBookmark}
        >
          {isBookmarked ? t("reader.bookmarked") : t("reader.bookmark")}
        </BarButton>
        <BarButton
          icon="edit_note"
          active={showNote || !!bookmark?.note}
          onClick={() => setShowNote((v) => !v)}
        >
          {t("reader.note")}
        </BarButton>
      </div>

      {/* Existing saved note preview */}
      {!showNote && bookmark?.note && (
        <div className="px-5 pb-3 -mt-1">
          <p className="text-xs text-on-surface-variant italic flex items-start gap-1.5">
            <Icon
              name="format_quote"
              size={13}
              className="text-accent-primary mt-0.5 shrink-0"
            />
            {bookmark.note}
          </p>
        </div>
      )}
    </motion.div>
  );
}

function BarButton({
  icon,
  children,
  active,
  fill,
  disabled,
  onClick,
}: {
  icon: string;
  children: React.ReactNode;
  active?: boolean;
  fill?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50",
        active
          ? "text-accent-primary bg-accent-primary/10 hover:bg-accent-primary/15"
          : "text-on-surface-variant hover:text-accent-primary hover:bg-accent-primary/5"
      )}
    >
      <Icon name={icon} size={15} fill={fill} />
      {children}
    </button>
  );
}
