import { create } from "zustand";

/**
 * Reader playback state.
 *
 * The reader now supports a *play queue* — a highlight that spans multiple
 * text blocks produces an ordered list of block IDs whose videos are played
 * back-to-back. A single click is just a queue of length 1.
 *
 * `activeBlockId` is kept in sync with `playQueue[queueIndex]` so existing
 * highlight / scroll logic keeps working.
 */
interface ReaderState {
  playQueue: string[]; // ordered block IDs to play
  queueIndex: number; // current position in queue (-1 = nothing playing)
  activeBlockId: string | null; // = playQueue[queueIndex] ?? null
  isPlaying: boolean;
  currentChapterId: string | null;
  videoProgress: number; // 0–1 of the CURRENT segment

  setActiveBlock: (blockId: string | null) => void; // single block → queue of one
  setPlayQueue: (blockIds: string[]) => void; // multi-block selection
  advanceQueue: () => boolean; // → next segment; false when queue ends
  setIsPlaying: (playing: boolean) => void;
  setCurrentChapter: (chapterId: string) => void;
  setVideoProgress: (progress: number) => void;
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  playQueue: [],
  queueIndex: -1,
  activeBlockId: null,
  isPlaying: false,
  currentChapterId: null,
  videoProgress: 0,

  setActiveBlock: (blockId) =>
    set(
      blockId
        ? {
            playQueue: [blockId],
            queueIndex: 0,
            activeBlockId: blockId,
            isPlaying: true,
            videoProgress: 0,
          }
        : {
            playQueue: [],
            queueIndex: -1,
            activeBlockId: null,
            isPlaying: false,
            videoProgress: 0,
          }
    ),

  setPlayQueue: (blockIds) => {
    if (blockIds.length === 0) {
      set({
        playQueue: [],
        queueIndex: -1,
        activeBlockId: null,
        isPlaying: false,
        videoProgress: 0,
      });
      return;
    }
    set({
      playQueue: blockIds,
      queueIndex: 0,
      activeBlockId: blockIds[0],
      isPlaying: true,
      videoProgress: 0,
    });
  },

  advanceQueue: () => {
    const { playQueue, queueIndex } = get();
    const next = queueIndex + 1;
    if (next < playQueue.length) {
      set({
        queueIndex: next,
        activeBlockId: playQueue[next],
        videoProgress: 0,
      });
      return true;
    }
    // Queue finished
    set({ isPlaying: false });
    return false;
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setCurrentChapter: (chapterId) =>
    set({
      currentChapterId: chapterId,
      playQueue: [],
      queueIndex: -1,
      activeBlockId: null,
      isPlaying: false,
      videoProgress: 0,
    }),

  setVideoProgress: (progress) =>
    set({ videoProgress: Math.max(0, Math.min(1, progress)) }),
}));
