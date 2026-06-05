"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { TextPanel } from "@/components/features/reader/TextPanel";
import { VideoPanel } from "@/components/features/reader/VideoPanel";
import { Skeleton } from "@/components/ui/Skeleton";
import { useReaderStore } from "@/stores/readerStore";
import type {
  Chapter,
  TextBlockWithVideo,
  Work,
  Bookmark,
} from "@/types/database";

export default function ReaderPage() {
  const { workId } = useParams<{ workId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    activeBlockId,
    playQueue,
    setActiveBlock,
    setPlayQueue,
    setCurrentChapter,
    currentChapterId,
  } = useReaderStore();

  const [work, setWork] = useState<Work | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [blocks, setBlocks] = useState<TextBlockWithVideo[]>([]);
  const [loading, setLoading] = useState(true);

  // Deep-link target block from `?block=...` — consumed once after blocks load.
  // Whether to autoplay (default: true via `play=1`, false via `play=0`).
  const targetBlockId = searchParams.get("block");
  const shouldAutoplay = searchParams.get("play") !== "0";
  const consumedDeepLink = useRef(false);
  const autoPlayedAll = useRef(false);

  const chapterId = searchParams.get("chapter") || currentChapterId;
  const currentChapter = chapters.find((c) => c.id === chapterId);
  const currentIndex = chapters.findIndex((c) => c.id === chapterId);

  useEffect(() => {
    Promise.all([
      fetch(`/api/works/${workId}`).then((r) => r.json()),
      fetch(`/api/works/${workId}/chapters`).then((r) => r.json()),
    ]).then(([w, ch]) => {
      setWork(w);
      setChapters(ch ?? []);
      if (ch?.length && !chapterId) {
        setCurrentChapter(ch[0].id);
        router.replace(`/works/${workId}/reader?chapter=${ch[0].id}`);
      }
    });
  }, [workId, chapterId, setCurrentChapter, router]);

  useEffect(() => {
    if (!chapterId) return;
    setLoading(true);
    setCurrentChapter(chapterId);
    consumedDeepLink.current = false; // re-arm for the new chapter
    autoPlayedAll.current = false;

    fetch(`/api/chapters/${chapterId}/blocks`)
      .then((r) => r.json())
      .then((data: TextBlockWithVideo[]) => {
        setBlocks(data ?? []);
        setLoading(false);
      });
  }, [chapterId, setCurrentChapter]);

  // Deep-link → highlight (and optionally play) the requested block once it loads.
  useEffect(() => {
    if (loading || !targetBlockId || consumedDeepLink.current) return;
    if (!blocks.some((b) => b.id === targetBlockId)) return;
    consumedDeepLink.current = true;

    // setActiveBlock sets isPlaying=true; if user wants highlight-only,
    // we pause immediately on the next tick.
    setActiveBlock(targetBlockId);
    if (!shouldAutoplay) {
      // Defer to next tick so the store update settles first
      setTimeout(() => useReaderStore.getState().setIsPlaying(false), 50);
    }

    // Smooth scroll the block into view (the panel also does this when
    // active changes, but we want to ensure it works on first paint)
    setTimeout(() => {
      const el = document.getElementById(`block-${targetBlockId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, [loading, targetBlockId, shouldAutoplay, blocks, setActiveBlock]);

  // Default behaviour: on entering a chapter (no deep-link), auto-play the
  // ENTIRE script — queue all video scenes in order. A manual drag overrides
  // this (setPlayQueue replaces the queue), turning off the auto-all.
  const playAll = useCallback(() => {
    const ids = blocks.filter((b) => b.video_clip).map((b) => b.id);
    if (ids.length) setPlayQueue(ids);
  }, [blocks, setPlayQueue]);

  useEffect(() => {
    if (loading || targetBlockId || autoPlayedAll.current) return;
    const ids = blocks.filter((b) => b.video_clip).map((b) => b.id);
    if (ids.length) {
      autoPlayedAll.current = true;
      setPlayQueue(ids);
    }
  }, [loading, targetBlockId, blocks, setPlayQueue]);

  const navigateChapter = useCallback(
    (offset: number) => {
      const nextCh = chapters[currentIndex + offset];
      if (nextCh) {
        router.push(`/works/${workId}/reader?chapter=${nextCh.id}`);
      }
    },
    [chapters, currentIndex, workId, router]
  );

  const handleBookmarkChange = useCallback(
    (blockId: string, bookmark: Bookmark | null) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, bookmark } : b))
      );
    },
    []
  );

  const handleHighlightsAdded = useCallback(
    (created: { id: string; text_block_id: string; start_offset: number; end_offset: number }[]) => {
      setBlocks((prev) =>
        prev.map((b) => {
          const mine = created.filter((c) => c.text_block_id === b.id);
          return mine.length
            ? { ...b, highlights: [...(b.highlights ?? []), ...mine] }
            : b;
        })
      );
    },
    []
  );

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-5rem)]">
        <div className="lg:w-[55%] p-3 sm:p-4">
          <Skeleton variant="video" />
        </div>
        <div className="lg:w-[45%] p-3 sm:p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="text" className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-5rem)]">
      {/* Video — mobile: sticky under navbar; desktop: left column */}
      <div
        className="lg:w-1/2 xl:w-[55%] p-3 sm:p-4 lg:p-6 lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-glass-border
                   sticky top-16 sm:top-20 z-10 bg-background lg:static lg:z-auto"
      >
        <div className="lg:sticky lg:top-0">
          <VideoPanel blocks={blocks} />
        </div>
      </div>

      {/* Text — mobile: flows below; desktop: right column */}
      <div className="lg:w-1/2 xl:w-[45%] lg:overflow-hidden">
        <TextPanel
          work={work}
          chapter={currentChapter ?? null}
          blocks={blocks}
          activeBlockId={activeBlockId}
          queueIds={playQueue}
          onSelectBlocks={setPlayQueue}
          onClickBlock={setActiveBlock}
          onPlayAll={playAll}
          onBookmarkChange={handleBookmarkChange}
          onHighlightsAdded={handleHighlightsAdded}
          onPrevChapter={() => navigateChapter(-1)}
          onNextChapter={() => navigateChapter(1)}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < chapters.length - 1}
          totalChapters={chapters.length}
        />
      </div>
    </div>
  );
}
