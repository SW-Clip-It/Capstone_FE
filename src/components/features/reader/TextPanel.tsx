"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { TextBlock } from "./TextBlock";
import { Icon } from "@/components/ui/Icon";
import type { TextBlockWithVideo, Chapter, Work, Bookmark } from "@/types/database";

interface TextPanelProps {
  work: Work | null;
  chapter: Chapter | null;
  blocks: TextBlockWithVideo[];
  activeBlockId: string | null;
  onBlockClick: (blockId: string) => void;
  onBookmarkChange?: (blockId: string, bookmark: Bookmark | null) => void;
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  totalChapters: number;
}

export function TextPanel({
  work,
  chapter,
  blocks,
  activeBlockId,
  onBlockClick,
  onBookmarkChange,
  onPrevChapter,
  onNextChapter,
  hasPrev,
  hasNext,
  totalChapters,
}: TextPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();

  // Chapter progress = (active block index + 1) / total blocks
  const chapterProgress = useMemo(() => {
    if (!activeBlockId || blocks.length === 0) return 0;
    const idx = blocks.findIndex((b) => b.id === activeBlockId);
    if (idx < 0) return 0;
    return (idx + 1) / blocks.length;
  }, [activeBlockId, blocks]);

  // Auto-scroll to active block
  useEffect(() => {
    if (!activeBlockId) return;
    const el = document.getElementById(`block-${activeBlockId}`);
    if (el && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const isVisible =
        elRect.top >= containerRect.top &&
        elRect.bottom <= containerRect.bottom;
      if (!isVisible) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeBlockId]);

  const workTitle = i18n.language === "ko" && work?.title_ko ? work.title_ko : work?.title;
  const chapterTitle =
    i18n.language === "ko" && chapter?.title_ko ? chapter.title_ko : chapter?.title;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Work + Chapter header */}
      {work && chapter && (
        <div className="px-6 py-5 border-b border-glass-border shrink-0 bg-background/95 backdrop-blur-md">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-on-surface truncate">
                {workTitle}
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {work.author} · {t("reader.chapter")} {chapter.chapter_number}
                {chapterTitle && ` · ${chapterTitle}`}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onPrevChapter}
                disabled={!hasPrev}
                className="p-1.5 rounded-lg hover:bg-accent-primary/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-on-surface"
                title={t("reader.prevChapter")}
              >
                <Icon name="chevron_left" size={20} />
              </button>
              <button
                onClick={onNextChapter}
                disabled={!hasNext}
                className="p-1.5 rounded-lg hover:bg-accent-primary/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-on-surface"
                title={t("reader.nextChapter")}
              >
                <Icon name="chevron_right" size={20} />
              </button>
            </div>
          </div>

          {/* Chapter progress */}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs font-medium text-on-surface-variant tabular-nums w-9">
              {Math.round(chapterProgress * 100)}%
            </span>
            <div className="flex-1 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${chapterProgress * 100}%` }}
              />
            </div>
            <span className="text-xs text-on-surface-variant tabular-nums">
              {chapter.chapter_number} / {totalChapters}
            </span>
          </div>
        </div>
      )}

      {/* Text blocks */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-5 scroll-smooth"
      >
        {blocks.map((block) => (
          <TextBlock
            key={block.id}
            block={block}
            isActive={block.id === activeBlockId}
            onClick={() => onBlockClick(block.id)}
            onBookmarkChange={onBookmarkChange}
          />
        ))}
        {blocks.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant text-sm">
            {t("reader.noBlocks")}
          </div>
        )}
      </div>
    </div>
  );
}
