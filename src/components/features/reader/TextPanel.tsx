"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ReaderProse } from "./ReaderProse";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import type {
  TextBlockWithVideo,
  Chapter,
  Work,
  Bookmark,
} from "@/types/database";

interface TextPanelProps {
  work: Work | null;
  chapter: Chapter | null;
  blocks: TextBlockWithVideo[];
  activeBlockId: string | null;
  queueIds: string[];
  onSelectBlocks: (ids: string[]) => void;
  onClickBlock: (id: string) => void;
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
  queueIds,
  onSelectBlocks,
  onClickBlock,
  onBookmarkChange,
  onPrevChapter,
  onNextChapter,
  hasPrev,
  hasNext,
  totalChapters,
}: TextPanelProps) {
  const { t, i18n } = useTranslation();

  // Whole-chapter EN ↔ KO toggle (defaults to follow the UI language).
  const hasKo = blocks.some((b) => b.content_ko);
  const [showKo, setShowKo] = useState(i18n.language === "ko");
  useEffect(() => {
    setShowKo(i18n.language === "ko");
  }, [i18n.language]);

  // Chapter progress = position of the active block within the chapter.
  const chapterProgress = useMemo(() => {
    if (!activeBlockId || blocks.length === 0) return 0;
    const idx = blocks.findIndex((b) => b.id === activeBlockId);
    if (idx < 0) return 0;
    return (idx + 1) / blocks.length;
  }, [activeBlockId, blocks]);

  // Auto-scroll the active block into view as the queue advances.
  useEffect(() => {
    if (!activeBlockId) return;
    const el = document.getElementById(`block-${activeBlockId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeBlockId]);

  const workTitle =
    i18n.language === "ko" && work?.title_ko ? work.title_ko : work?.title;
  const chapterTitle =
    i18n.language === "ko" && chapter?.title_ko
      ? chapter.title_ko
      : chapter?.title;

  return (
    <div className="flex flex-col lg:h-full bg-background">
      {/* Header */}
      {work && chapter && (
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-glass-border shrink-0 bg-background/95 backdrop-blur-md">
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
              {hasKo && (
                <button
                  onClick={() => setShowKo((v) => !v)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors mr-1",
                    showKo
                      ? "bg-accent-primary/10 text-accent-primary"
                      : "text-on-surface-variant hover:bg-accent-primary/5 hover:text-accent-primary"
                  )}
                  title={t("reader.translate")}
                >
                  <Icon name="translate" size={15} />
                  {showKo ? "KO" : "EN"}
                </button>
              )}
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

      {/* Continuous ebook-style prose with drag-to-play */}
      <ReaderProse
        blocks={blocks}
        activeBlockId={activeBlockId}
        queueIds={queueIds}
        showKo={showKo}
        onSelectBlocks={onSelectBlocks}
        onClickBlock={onClickBlock}
        onBookmarkChange={onBookmarkChange}
      />
    </div>
  );
}
