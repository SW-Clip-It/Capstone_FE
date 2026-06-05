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
import type {
  TextBlockWithVideo,
  Bookmark,
  Highlight,
} from "@/types/database";

interface RangeSpec {
  text_block_id: string;
  start_offset: number;
  end_offset: number;
}
interface SelectionState {
  blockIds: string[];
  ranges: RangeSpec[];
  top: number; // content coords (within scroll container)
  left: number;
}

interface ReaderProseProps {
  blocks: TextBlockWithVideo[];
  activeBlockId: string | null;
  queueIds: string[];
  showKo: boolean;
  onSelectBlocks: (ids: string[]) => void;
  onClickBlock: (id: string) => void;
  onBookmarkChange?: (blockId: string, bookmark: Bookmark | null) => void;
  onHighlightsAdded?: (created: (Highlight & { text_block_id: string })[]) => void;
}

// Split text into plain/highlighted segments from per-block highlight ranges.
function segmentText(text: string, highlights: Highlight[] | undefined) {
  if (!highlights?.length) return [{ text, hl: false }];
  const ranges = highlights
    .map((h) => ({
      s: Math.max(0, h.start_offset),
      e: Math.min(text.length, h.end_offset),
    }))
    .filter((r) => r.e > r.s)
    .sort((a, b) => a.s - b.s);
  const segs: { text: string; hl: boolean }[] = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.s > pos) segs.push({ text: text.slice(pos, r.s), hl: false });
    segs.push({ text: text.slice(Math.max(pos, r.s), r.e), hl: true });
    pos = Math.max(pos, r.e);
  }
  if (pos < text.length) segs.push({ text: text.slice(pos), hl: false });
  return segs;
}

function offsetWithin(span: HTMLElement, node: Node, nodeOffset: number): number {
  const r = document.createRange();
  r.selectNodeContents(span);
  try {
    r.setEnd(node, nodeOffset);
  } catch {
    return span.textContent?.length ?? 0;
  }
  return r.toString().length;
}

export function ReaderProse({
  blocks,
  activeBlockId,
  queueIds,
  showKo,
  onSelectBlocks,
  onClickBlock,
  onBookmarkChange,
  onHighlightsAdded,
}: ReaderProseProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const queueSet = new Set(queueIds);

  const anchorFromRect = useCallback((rect: DOMRect) => {
    const c = containerRef.current!;
    const cr = c.getBoundingClientRect();
    return {
      top: rect.top - cr.top + c.scrollTop,
      left: rect.left - cr.left + rect.width / 2,
    };
  }, []);

  // Drag selection → ranges + play + toolbar anchor
  const captureSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const spans =
      containerRef.current?.querySelectorAll<HTMLElement>("[data-block-id]") ?? [];

    const blockIds: string[] = [];
    const videoIds: string[] = [];
    const ranges: RangeSpec[] = [];
    spans.forEach((span) => {
      if (!range.intersectsNode(span)) return;
      const id = span.getAttribute("data-block-id")!;
      blockIds.push(id);
      if (span.getAttribute("data-has-video") === "1") videoIds.push(id);
      const isStart = span.contains(range.startContainer);
      const isEnd = span.contains(range.endContainer);
      const start = isStart
        ? offsetWithin(span, range.startContainer, range.startOffset)
        : 0;
      const end = isEnd
        ? offsetWithin(span, range.endContainer, range.endOffset)
        : span.textContent?.length ?? 0;
      if (end > start) ranges.push({ text_block_id: id, start_offset: start, end_offset: end });
    });
    if (blockIds.length === 0) return;

    const { top, left } = anchorFromRect(range.getBoundingClientRect());
    setSelection({ blockIds, ranges, top, left });
    if (videoIds.length) onSelectBlocks(videoIds); // play matching scenes
  }, [anchorFromRect, onSelectBlocks]);

  // Click a block → single-block selection (whole block) + play
  const clickBlock = useCallback(
    (id: string, span: HTMLElement, hasVideo: boolean) => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return; // tail of a drag
      const text = span.textContent ?? "";
      const { top, left } = anchorFromRect(span.getBoundingClientRect());
      setSelection({
        blockIds: [id],
        ranges: [{ text_block_id: id, start_offset: 0, end_offset: text.length }],
        top,
        left,
      });
      if (hasVideo) onClickBlock(id);
    },
    [anchorFromRect, onClickBlock]
  );

  // Dismiss toolbar when clicking empty space inside the container
  function onContainerMouseDown(e: React.MouseEvent) {
    if (!(e.target as HTMLElement).closest("[data-block-id],[data-toolbar]")) {
      setSelection(null);
    }
  }

  return (
    <div className="flex flex-col lg:h-full">
      <div
        ref={containerRef}
        onMouseUp={captureSelection}
        onTouchEnd={captureSelection}
        onMouseDown={onContainerMouseDown}
        className="relative lg:flex-1 lg:overflow-y-auto px-5 sm:px-10 py-6 sm:py-8 scroll-smooth"
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
              const segs = segmentText(text, block.highlights);

              return (
                <span key={block.id}>
                  <span
                    id={`block-${block.id}`}
                    data-block-id={block.id}
                    data-has-video={hasVideo ? "1" : "0"}
                    onClick={(e) =>
                      clickBlock(block.id, e.currentTarget, hasVideo)
                    }
                    className={cn(
                      "[box-decoration-break:clone] [-webkit-box-decoration-break:clone] rounded-[3px] px-0.5 -mx-0.5 transition-colors duration-300",
                      hasVideo && "cursor-pointer",
                      isActive
                        ? "bg-accent-primary/20 text-on-surface"
                        : inQueue
                          ? "bg-accent-primary/8"
                          : hasVideo
                            ? "hover:bg-accent-primary/8"
                            : ""
                    )}
                  >
                    {segs.map((s, j) =>
                      s.hl ? (
                        <mark
                          key={j}
                          className="bg-yellow-300/60 dark:bg-yellow-400/30 text-on-surface rounded-[2px] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
                        >
                          {s.text}
                        </mark>
                      ) : (
                        <span key={j}>{s.text}</span>
                      )
                    )}
                  </span>
                  {i < blocks.length - 1 ? " " : ""}
                </span>
              );
            })}
          </article>
        )}

        {/* Selection toolbar — anchored above the dragged/clicked text */}
        <AnimatePresence>
          {selection && (
            <SelectionToolbar
              key={`${selection.blockIds.join(",")}-${selection.top}`}
              selection={selection}
              blocks={blocks}
              showKo={showKo}
              onClose={() => setSelection(null)}
              onBookmarkChange={onBookmarkChange}
              onHighlightsAdded={onHighlightsAdded}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Selection hint (before anything is selected/playing) */}
      {!activeBlockId && !selection && blocks.length > 0 && (
        <div className="shrink-0 px-6 py-2.5 border-t border-glass-border bg-background/80 backdrop-blur text-center">
          <p className="text-xs text-on-surface-variant flex items-center justify-center gap-1.5">
            <Icon name="ink_highlighter" size={14} className="text-accent-primary" />
            {t("reader.selectHint")}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Floating toolbar above the selection (북마크/노트/번역/형광펜) ─────
function SelectionToolbar({
  selection,
  blocks,
  showKo,
  onClose,
  onBookmarkChange,
  onHighlightsAdded,
}: {
  selection: SelectionState;
  blocks: TextBlockWithVideo[];
  showKo: boolean;
  onClose: () => void;
  onBookmarkChange?: (blockId: string, bookmark: Bookmark | null) => void;
  onHighlightsAdded?: (created: (Highlight & { text_block_id: string })[]) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const primaryId = selection.blockIds[0];
  const block = blocks.find((b) => b.id === primaryId);
  const [bookmark, setBookmark] = useState<Bookmark | null>(block?.bookmark ?? null);
  const [panel, setPanel] = useState<"none" | "note" | "translate">("none");
  const [note, setNote] = useState(block?.bookmark?.note ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBookmark(block?.bookmark ?? null);
    setNote(block?.bookmark?.note ?? "");
  }, [block?.id, block?.bookmark]);

  if (!block) return null;
  const isBookmarked = !!bookmark;
  const hasKo = !!block.content_ko;
  const translationText = showKo ? block.content : block.content_ko;

  async function toggleBookmark() {
    setSaving(true);
    try {
      if (isBookmarked) {
        await fetch(`/api/bookmarks?text_block_id=${block!.id}`, { method: "DELETE" });
        setBookmark(null);
        onBookmarkChange?.(block!.id, null);
        toast(t("reader.bookmarkRemoved"), "info");
      } else {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text_block_id: block!.id, note: null }),
        });
        const bm = await res.json();
        setBookmark(bm);
        onBookmarkChange?.(block!.id, bm);
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
        body: JSON.stringify({ text_block_id: block!.id, note: note.trim() || null }),
      });
      const bm = await res.json();
      setBookmark(bm);
      onBookmarkChange?.(block!.id, bm);
      setPanel("none");
      toast(t("reader.noteSaved"), "success");
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function addHighlight() {
    if (!selection.ranges.length) return;
    setSaving(true);
    try {
      const res = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ranges: selection.ranges }),
      });
      const d = await res.json();
      if (d.highlights?.length) {
        onHighlightsAdded?.(d.highlights);
        toast(t("reader.highlightSaved"), "success");
      }
      window.getSelection()?.removeAllRanges();
      onClose();
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  }

  // position above the selection, clamped horizontally
  const left = Math.min(Math.max(selection.left, 130), 640 - 10);

  return (
    <div
      data-toolbar
      className="absolute z-30 -translate-x-1/2 -translate-y-full pointer-events-none"
      style={{ top: selection.top - 8, left }}
    >
      <div className="flex flex-col items-center gap-2 pb-1">
        <AnimatePresence>
          {panel === "note" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="pointer-events-auto w-[280px] sm:w-[360px] rounded-2xl border border-glass-border bg-background shadow-xl p-3"
            >
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("reader.notePlaceholder")}
                rows={3}
                autoFocus
                className="w-full p-2.5 rounded-lg bg-surface-secondary border border-glass-border focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-sm resize-none text-on-surface placeholder:text-on-surface-variant/60"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setPanel("none")}
                  className="px-3 py-1.5 text-xs rounded-md text-on-surface-variant hover:bg-glass-bg-hover"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={saveNote}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs rounded-md bg-accent-primary text-white hover:bg-accent-primary/90 disabled:opacity-50"
                >
                  {t("common.save")}
                </button>
              </div>
            </motion.div>
          )}
          {panel === "translate" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="pointer-events-auto w-[280px] sm:w-[360px] rounded-2xl border border-glass-border bg-background shadow-xl p-3"
            >
              <p className="text-sm text-on-surface font-reading leading-relaxed">
                {translationText || t("reader.noTranslation")}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-glass-border bg-background/95 backdrop-blur-md shadow-lg px-1.5 py-1.5 whitespace-nowrap"
        >
          <ToolBtn
            icon={isBookmarked ? "bookmark" : "bookmark_border"}
            label={isBookmarked ? t("reader.bookmarked") : t("reader.bookmark")}
            active={isBookmarked}
            fill={isBookmarked}
            disabled={saving}
            onClick={toggleBookmark}
          />
          <ToolBtn
            icon="edit_note"
            label={t("reader.note")}
            active={panel === "note" || !!bookmark?.note}
            onClick={() => setPanel((p) => (p === "note" ? "none" : "note"))}
          />
          {hasKo && (
            <ToolBtn
              icon="translate"
              label={t("reader.translate")}
              active={panel === "translate"}
              onClick={() => setPanel((p) => (p === "translate" ? "none" : "translate"))}
            />
          )}
          <ToolBtn
            icon="ink_highlighter"
            label={t("reader.highlight")}
            disabled={saving}
            onClick={addHighlight}
          />
        </motion.div>
      </div>
    </div>
  );
}

function ToolBtn({
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
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-full text-xs font-medium transition-colors disabled:opacity-50",
        active
          ? "text-accent-primary bg-accent-primary/10"
          : "text-on-surface-variant hover:text-accent-primary hover:bg-accent-primary/5"
      )}
    >
      <Icon name={icon} size={17} fill={fill || active} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
