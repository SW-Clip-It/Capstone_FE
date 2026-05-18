"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { VideoPlayer } from "./VideoPlayer";
import { Icon } from "@/components/ui/Icon";
import { useReaderStore } from "@/stores/readerStore";
import { getSignedVideoUrl } from "@/lib/supabase/storage";
import { useToast } from "@/providers/ToastProvider";
import type { TextBlockWithVideo } from "@/types/database";
import { truncate } from "@/lib/utils";

interface VideoPanelProps {
  blocks: TextBlockWithVideo[];
}

export function VideoPanel({ blocks }: VideoPanelProps) {
  const {
    activeBlockId,
    isPlaying,
    setActiveBlock,
    setIsPlaying,
    setVideoProgress,
  } = useReaderStore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  const activeBlock = blocks.find((b) => b.id === activeBlockId);
  const activeIndex = blocks.findIndex((b) => b.id === activeBlockId);

  // Fetch signed URL when active block changes / 활성 블록 변경 시 서명된 URL 가져오기
  useEffect(() => {
    if (!activeBlock?.video_clip) {
      setVideoUrl(null);
      return;
    }

    let cancelled = false;
    setLoadingUrl(true);

    getSignedVideoUrl(activeBlock.video_clip.storage_path)
      .then((url) => {
        if (!cancelled) {
          setVideoUrl(url);
          setLoadingUrl(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast(t("reader.videoLoadError"), "error");
          setLoadingUrl(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeBlock, toast, t]);

  // Prefetch next block's URL / 다음 블록 URL 미리 가져오기
  useEffect(() => {
    if (activeIndex < 0) return;
    const nextBlock = blocks[activeIndex + 1];
    if (nextBlock?.video_clip) {
      getSignedVideoUrl(nextBlock.video_clip.storage_path).catch(() => {});
    }
  }, [activeIndex, blocks]);

  const handleEnded = useCallback(() => {
    // Auto-advance to next block with video / 다음 영상 블록으로 자동 이동
    for (let i = activeIndex + 1; i < blocks.length; i++) {
      if (blocks[i].video_clip) {
        setActiveBlock(blocks[i].id);
        return;
      }
    }
    setIsPlaying(false);
  }, [activeIndex, blocks, setActiveBlock, setIsPlaying]);

  return (
    <div className="space-y-4">
      {loadingUrl ? (
        <div className="aspect-video w-full glass rounded-2xl flex items-center justify-center">
          <Icon
            name="progress_activity"
            size={40}
            className="text-accent-primary animate-spin"
          />
        </div>
      ) : (
        <VideoPlayer
          url={videoUrl}
          isPlaying={isPlaying}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleEnded}
          onError={() => toast(t("reader.videoError"), "error")}
          onProgress={setVideoProgress}
        />
      )}

      {/* Now Playing info / 현재 재생 정보 */}
      {activeBlock && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-accent-primary text-xs font-medium mb-2">
            <Icon name="play_circle" size={16} fill />
            {t("reader.nowPlaying")}
          </div>
          <p className="text-sm text-txt-primary leading-relaxed">
            <span className="text-accent-primary font-medium">
              {truncate(activeBlock.content.split(/[.!?]/)[0] || "", 60)}
            </span>
            {activeBlock.content.length > 60 && (
              <span className="text-txt-secondary">
                {activeBlock.content.slice(
                  (activeBlock.content.split(/[.!?]/)[0] || "").length
                )}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
