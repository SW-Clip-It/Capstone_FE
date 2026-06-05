"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";

interface Scene {
  text_block_id: string;
  scene: number;
  content: string;
  content_ko: string | null;
  storage_path: string | null;
  has_video: boolean;
  is_external: boolean;
}
interface Chapter {
  chapter_number: number;
  title: string;
  scenes: Scene[];
}
interface BookDetail {
  id: string;
  slug: string;
  title: string;
  title_ko: string | null;
  author: string;
  cover_image: string | null;
  chapters: Chapter[];
}

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Uploads a file straight to S3 (presigned PUT) and registers it to the scene.
 * The server decides the S3 key (videos/{slug}/{chapter}_{scene}.mp4); the DB
 * link is by text_block_id.
 */
async function uploadToScene(
  file: File,
  textBlockId: string,
  onProgress: (frac: number) => void
): Promise<void> {
  // 1) presigned PUT url
  const r = await fetch("/api/admin/videos/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text_block_id: textBlockId }),
  });
  if (!r.ok) throw new Error((await r.json()).error || "URL 발급 실패");
  const { upload_url, storage_key } = await r.json();

  // 2) PUT bytes to S3 (XHR for progress)
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", upload_url);
    xhr.setRequestHeader("Content-Type", "video/mp4");
    xhr.upload.onprogress = (e) =>
      e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`S3 업로드 실패 (${xhr.status})`));
    xhr.onerror = () =>
      reject(new Error("네트워크/CORS 오류 — S3 CORS에 PUT 허용 필요"));
    xhr.send(file);
  });

  // 3) register in DB
  const reg = await fetch("/api/admin/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text_block_id: textBlockId, storage_path: storage_key }),
  });
  if (!reg.ok) throw new Error("등록 실패");
}

export default function AdminBookDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [openCh, setOpenCh] = useState<number | null>(null);
  const [uploads, setUploads] = useState<Record<string, number>>({}); // tbid -> 0..1

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/books/${slug}`);
    if (res.ok) {
      const data = await res.json();
      setBook(data);
      if (data.chapters?.length)
        setOpenCh((c) => c ?? data.chapters[0].chapter_number);
    } else {
      toast("불러오기 실패", "error");
    }
    setLoading(false);
  }, [slug, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Lookups for bulk routing
  const lookups = useMemo(() => {
    const byId = new Set<string>();
    const byChScene = new Map<string, string>(); // "ch-sc" -> tbid
    book?.chapters.forEach((c) =>
      c.scenes.forEach((s) => {
        byId.add(s.text_block_id);
        byChScene.set(`${c.chapter_number}-${s.scene}`, s.text_block_id);
      })
    );
    return { byId, byChScene };
  }, [book]);

  const totalScenes =
    book?.chapters.reduce((a, c) => a + c.scenes.length, 0) ?? 0;
  const withVideo =
    book?.chapters.reduce(
      (a, c) => a + c.scenes.filter((s) => s.has_video).length,
      0
    ) ?? 0;

  const setProg = (tbid: string, v: number | null) =>
    setUploads((u) => {
      const n = { ...u };
      if (v == null) delete n[tbid];
      else n[tbid] = v;
      return n;
    });

  async function handleSceneUpload(file: File, textBlockId: string) {
    setProg(textBlockId, 0);
    try {
      await uploadToScene(file, textBlockId, (f) => setProg(textBlockId, f));
      toast("업로드 완료", "success");
      await load();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setProg(textBlockId, null);
    }
  }

  // Resolve a filename → text_block_id (UUID in name, or ch{N}sc{M})
  function resolveFile(file: File): string | null {
    const name = file.name.replace(/\.[^.]+$/, "");
    const uuid = name.match(UUID_RE);
    if (uuid && lookups.byId.has(uuid[0].toLowerCase())) return uuid[0].toLowerCase();
    const m = name.match(/ch\D*(\d+)\D*sc\D*(\d+)/i) || name.match(/(\d+)[_-](\d+)/);
    if (m) {
      const key = `${parseInt(m[1], 10)}-${parseInt(m[2], 10)}`;
      return lookups.byChScene.get(key) ?? null;
    }
    return null;
  }

  async function handleBulkDrop(files: FileList) {
    const jobs: { file: File; tbid: string }[] = [];
    const unmatched: string[] = [];
    Array.from(files).forEach((f) => {
      const tbid = resolveFile(f);
      if (tbid) jobs.push({ file: f, tbid });
      else unmatched.push(f.name);
    });
    if (unmatched.length)
      toast(
        `매칭 실패 ${unmatched.length}개 (파일명을 ch{N}sc{M} 또는 {text_block_id} 로)`,
        "error"
      );
    if (!jobs.length) return;
    toast(`${jobs.length}개 업로드 시작…`, "info");
    // simple concurrency cap of 3
    let i = 0;
    async function worker() {
      while (i < jobs.length) {
        const job = jobs[i++];
        setProg(job.tbid, 0);
        try {
          await uploadToScene(job.file, job.tbid, (f) => setProg(job.tbid, f));
        } catch (e: any) {
          toast(`${job.file.name}: ${e.message}`, "error");
        } finally {
          setProg(job.tbid, null);
        }
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    toast("일괄 업로드 완료", "success");
    await load();
  }

  function copyAllPending() {
    if (!book) return;
    const keys: string[] = [];
    book.chapters.forEach((c) =>
      c.scenes.forEach((s) => {
        if (!s.has_video)
          keys.push(`videos/${book.slug}/${c.chapter_number}_${s.scene}.mp4`);
      })
    );
    navigator.clipboard.writeText(keys.join("\n"));
    toast(`미할당 ${keys.length}개 경로 복사됨`, "success");
  }

  if (loading) {
    return (
      <div className="text-center py-20 text-on-surface-variant">
        <Icon name="progress_activity" size={32} className="animate-spin mx-auto" />
      </div>
    );
  }
  if (!book) return null;

  const coverage = totalScenes ? Math.round((withVideo / totalScenes) * 100) : 0;

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-8 py-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent-primary mb-5"
      >
        <Icon name="arrow_back" size={16} /> 목록
      </Link>

      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">{book.title}</h1>
          <p className="text-sm text-on-surface-variant">
            {book.author} · {book.chapters.length}장 · {totalScenes}장면 ·{" "}
            <code className="text-xs">{book.slug}</code>
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-accent-primary tabular-nums">
            {coverage}%
          </div>
          <div className="text-xs text-on-surface-variant">
            영상 {withVideo}/{totalScenes}
          </div>
        </div>
      </div>

      {/* Bulk drop zone */}
      <BulkDropZone onFiles={handleBulkDrop} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 my-4">
        <button
          onClick={() => setPendingOnly((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            pendingOnly
              ? "bg-accent-primary text-white"
              : "bg-glass-bg text-on-surface-variant hover:text-on-surface"
          )}
        >
          <Icon name="filter_alt" size={15} />
          영상 없는 장면만
        </button>
        <button
          onClick={copyAllPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-glass-bg text-on-surface-variant hover:text-accent-primary transition-colors"
        >
          <Icon name="content_copy" size={15} />
          미할당 경로 복사
        </button>
      </div>

      {/* Chapters */}
      <div className="space-y-2">
        {book.chapters.map((ch) => {
          const scenes = pendingOnly
            ? ch.scenes.filter((s) => !s.has_video)
            : ch.scenes;
          if (pendingOnly && scenes.length === 0) return null;
          const open = openCh === ch.chapter_number;
          const chWithVideo = ch.scenes.filter((s) => s.has_video).length;

          return (
            <div
              key={ch.chapter_number}
              className="rounded-xl border border-glass-border bg-glass-bg overflow-hidden"
            >
              <button
                onClick={() => setOpenCh(open ? null : ch.chapter_number)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-glass-bg-hover transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-accent-primary/10 text-accent-primary text-xs font-bold flex items-center justify-center shrink-0">
                    {ch.chapter_number}
                  </span>
                  <span className="font-medium text-on-surface truncate">
                    {ch.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-on-surface-variant tabular-nums">
                    {chWithVideo}/{ch.scenes.length}
                  </span>
                  <Icon
                    name={open ? "expand_less" : "expand_more"}
                    size={20}
                    className="text-on-surface-variant"
                  />
                </div>
              </button>

              {open && (
                <div className="divide-y divide-glass-border/60">
                  {scenes.map((s) => (
                    <SceneRow
                      key={s.text_block_id}
                      scene={s}
                      progress={uploads[s.text_block_id]}
                      onUpload={(file) => handleSceneUpload(file, s.text_block_id)}
                      onSetUrl={async (url) => {
                        await fetch("/api/admin/videos", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            text_block_id: s.text_block_id,
                            storage_path: url,
                          }),
                        });
                        toast("연결됨", "success");
                        load();
                      }}
                      onClear={async () => {
                        await fetch(
                          `/api/admin/videos?text_block_id=${s.text_block_id}`,
                          { method: "DELETE" }
                        );
                        toast("해제됨", "info");
                        load();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BulkDropZone({ onFiles }: { onFiles: (files: FileList) => void }) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
        over
          ? "border-accent-primary bg-accent-primary/5"
          : "border-glass-border hover:border-accent-primary/40 hover:bg-glass-bg-hover"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/*"
        multiple
        hidden
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
      <Icon
        name="upload_file"
        size={28}
        className={cn("mx-auto mb-2", over ? "text-accent-primary" : "text-on-surface-variant")}
      />
      <p className="text-sm font-medium text-on-surface">
        영상 파일을 여기에 드래그하거나 클릭해서 업로드
      </p>
      <p className="text-xs text-on-surface-variant mt-1">
        여러 파일 한꺼번에 가능 · 파일명은{" "}
        <code>ch{"{N}"}sc{"{M}"}.mp4</code> 또는{" "}
        <code>{"{text_block_id}"}.mp4</code>
      </p>
    </div>
  );
}

function SceneRow({
  scene,
  progress,
  onUpload,
  onSetUrl,
  onClear,
}: {
  scene: Scene;
  progress?: number;
  onUpload: (file: File) => void;
  onSetUrl: (url: string) => void;
  onClear: () => void;
}) {
  const { toast } = useToast();
  const [over, setOver] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState(scene.storage_path ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const uploading = progress != null;

  const status = !scene.has_video
    ? { label: "없음", cls: "bg-surface-secondary text-on-surface-variant", icon: "block" }
    : scene.is_external
      ? { label: "데모(외부)", cls: "bg-warning/15 text-warning", icon: "public" }
      : { label: "S3 연결됨", cls: "bg-success/15 text-success", icon: "check_circle" };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onUpload(f);
      }}
      className={cn(
        "px-4 py-3 transition-colors relative",
        over && "bg-accent-primary/5 ring-1 ring-inset ring-accent-primary/40"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-xs text-on-surface-variant tabular-nums mt-0.5 w-8 shrink-0">
          #{scene.scene}
        </span>
        <p className="flex-1 text-sm text-on-surface-variant line-clamp-2 leading-relaxed">
          {scene.content.replace(/\n/g, " ")}
        </p>
        <span
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0",
            status.cls
          )}
        >
          <Icon name={status.icon} size={12} fill />
          {status.label}
        </span>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="mt-2 pl-11 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-primary rounded-full transition-all"
              style={{ width: `${(progress ?? 0) * 100}%` }}
            />
          </div>
          <span className="text-[11px] text-accent-primary tabular-nums">
            {Math.round((progress ?? 0) * 100)}%
          </span>
        </div>
      )}

      {!uploading && (
        <div className="flex flex-wrap items-center gap-2 mt-2 pl-11">
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/*"
            hidden
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
          {urlMode ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://… (외부 데모 URL)"
                className="flex-1 px-2 py-1 text-[11px] rounded border border-glass-border bg-surface-secondary text-on-surface"
              />
              <button
                onClick={() => {
                  onSetUrl(url);
                  setUrlMode(false);
                }}
                className="text-[11px] px-2 py-1 rounded bg-accent-primary text-white"
              >
                저장
              </button>
              <button
                onClick={() => setUrlMode(false)}
                className="text-[11px] px-2 py-1 rounded text-on-surface-variant"
              >
                취소
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded text-accent-primary hover:bg-accent-primary/10"
              >
                <Icon name="upload" size={13} />
                {scene.has_video ? "영상 교체" : "영상 업로드"}
              </button>
              <span className="text-[10px] text-on-surface-variant">
                또는 이 행에 드래그
              </span>
              <div className="flex-1" />
              <button
                onClick={() => setUrlMode(true)}
                className="text-[11px] px-2 py-1 rounded text-on-surface-variant hover:text-accent-primary"
              >
                URL 직접
              </button>
              {scene.has_video && (
                <button
                  onClick={onClear}
                  className="text-[11px] px-2 py-1 rounded text-error hover:bg-error/10"
                >
                  해제
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
