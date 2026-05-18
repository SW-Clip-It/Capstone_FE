import { create } from "zustand";

interface ReaderState {
  activeBlockId: string | null;
  isPlaying: boolean;
  currentChapterId: string | null;
  signedUrls: Map<string, string>;

  // Video playback progress for the active block (0–1).
  // Used by TextBlock to render the equalizer-style border progress.
  videoProgress: number;

  setActiveBlock: (blockId: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentChapter: (chapterId: string) => void;
  setVideoProgress: (progress: number) => void;
  cacheSignedUrl: (storagePath: string, url: string) => void;
  getSignedUrl: (storagePath: string) => string | undefined;
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  activeBlockId: null,
  isPlaying: false,
  currentChapterId: null,
  signedUrls: new Map(),
  videoProgress: 0,

  setActiveBlock: (blockId) =>
    set({ activeBlockId: blockId, isPlaying: !!blockId, videoProgress: 0 }),

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setCurrentChapter: (chapterId) =>
    set({
      currentChapterId: chapterId,
      activeBlockId: null,
      isPlaying: false,
      videoProgress: 0,
    }),

  setVideoProgress: (progress) =>
    set({ videoProgress: Math.max(0, Math.min(1, progress)) }),

  cacheSignedUrl: (storagePath, url) => {
    const urls = new Map(get().signedUrls);
    urls.set(storagePath, url);
    set({ signedUrls: urls });
  },

  getSignedUrl: (storagePath) => get().signedUrls.get(storagePath),
}));
