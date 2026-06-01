"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SeamlessVideoPlayer,
  type QueueItem,
} from "./SeamlessVideoPlayer";
import { Icon } from "@/components/ui/Icon";
import { useReaderStore } from "@/stores/readerStore";
import { getSignedVideoUrl } from "@/lib/supabase/storage";
import { useToast } from "@/providers/ToastProvider";
import type { TextBlockWithVideo } from "@/types/database";

interface VideoPanelProps {
  blocks: TextBlockWithVideo[];
}

export function VideoPanel({ blocks }: VideoPanelProps) {
  const {
    playQueue,
    queueIndex,
    isPlaying,
    advanceQueue,
    setIsPlaying,
    setVideoProgress,
  } = useReaderStore();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const [resolved, setResolved] = useState<QueueItem[]>([]);
  const [resolving, setResolving] = useState(false);

  const activeBlockId = playQueue[queueIndex] ?? null;
  const activeBlock = blocks.find((b) => b.id === activeBlockId) ?? null;

  // Resolve signed URLs for every block in the queue (in parallel) whenever
  // the queue changes. We resolve ALL of them up-front so the seamless
  // player can preload the next clip while the current one plays.
  const queueKey = playQueue.join("|");
  useEffect(() => {
    if (playQueue.length === 0) {
      setResolved([]);
      return;
    }
    let cancelled = false;
    setResolving(true);

    const items = playQueue
      .map((id) => blocks.find((b) => b.id === id))
      .filter((b): b is TextBlockWithVideo => !!b?.video_clip);

    Promise.all(
      items.map(async (b) => ({
        blockId: b.id,
        url: await getSignedVideoUrl(b.video_clip!.storage_path),
      }))
    )
      .then((list) => {
        if (!cancelled) {
          setResolved(list);
          setResolving(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast(t("reader.videoLoadError"), "error");
          setResolving(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueKey, blocks]);

  const showLoader = resolving && resolved.length === 0;

  return (
    <div className="space-y-4">
      {showLoader ? (
        <div className="aspect-video w-full glass rounded-2xl flex items-center justify-center">
          <Icon
            name="progress_activity"
            size={40}
            className="text-accent-primary animate-spin"
          />
        </div>
      ) : (
        <SeamlessVideoPlayer
          queue={resolved}
          index={queueIndex < 0 ? 0 : queueIndex}
          isPlaying={isPlaying}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onSegmentProgress={setVideoProgress}
          onSegmentEnded={advanceQueue}
          onError={() => toast(t("reader.videoError"), "error")}
        />
      )}

      {/* Now Playing info */}
      {activeBlock && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-accent-primary text-xs font-medium">
              <Icon name="play_circle" size={16} fill />
              {t("reader.nowPlaying")}
            </div>
            {playQueue.length > 1 && (
              <span className="text-xs text-on-surface-variant tabular-nums">
                {t("reader.segment")} {queueIndex + 1}/{playQueue.length}
              </span>
            )}
          </div>
          <p className="text-sm text-on-surface leading-relaxed font-reading">
            {i18n.language === "ko" && activeBlock.content_ko
              ? activeBlock.content_ko
              : activeBlock.content}
          </p>
        </div>
      )}
    </div>
  );
}
