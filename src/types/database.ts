export interface Work {
  id: string;
  slug: string | null;
  title: string;
  title_ko: string | null;
  author: string;
  cover_image: string | null;
  description: string | null;
  description_ko: string | null;
  genre: string | null;
  published_year: number | null;
  total_chapters: number;
  is_bookmarked?: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkBookmark {
  id: string;
  user_id: string;
  work_id: string;
  created_at: string;
}

export interface Chapter {
  id: string;
  work_id: string;
  chapter_number: number;
  title: string;
  title_ko: string | null;
  total_blocks: number;
  created_at: string;
}

export interface TextBlock {
  id: string;
  chapter_id: string;
  block_order: number;
  content: string;
  content_ko: string | null;
  created_at: string;
}

export interface VideoClip {
  id: string;
  text_block_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  created_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  work_id: string;
  chapter_id: string | null;
  text_block_id: string | null;
  last_accessed_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  text_block_id: string;
  note: string | null;
  created_at: string;
}

export interface Highlight {
  id: string;
  start_offset: number;
  end_offset: number;
}

// Joined types
export interface TextBlockWithVideo extends TextBlock {
  video_clip: VideoClip | null;
  bookmark?: Bookmark | null;
  highlights?: Highlight[];
}

export interface ChapterWithBlocks extends Chapter {
  text_blocks: TextBlockWithVideo[];
}

export interface WorkWithChapters extends Work {
  chapters: Chapter[];
}
