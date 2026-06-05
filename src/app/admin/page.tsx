"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";

interface BookStat {
  id: string;
  slug: string;
  title: string;
  title_ko: string | null;
  author: string;
  cover_image: string | null;
  chapters: number;
  scenes: number;
  videos: number;
  coverage: number;
}

export default function AdminBooksPage() {
  const { toast } = useToast();
  const [books, setBooks] = useState<BookStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/books");
    if (res.ok) setBooks(await res.json());
    else toast("관리자 권한이 없거나 로그인이 필요합니다", "error");
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-10">
      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-background mb-1">
            책 & 영상 관리
          </h1>
          <p className="text-sm text-on-surface-variant">
            적재된 작품과 장면별 영상 연동 현황
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-primary text-white font-medium hover:bg-accent-primary/90 transition-colors shadow-sm"
        >
          <Icon name="add" size={18} />
          책 추가
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-on-surface-variant">
          <Icon name="progress_activity" size={32} className="animate-spin mx-auto" />
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-20 text-on-surface-variant">
          <Icon name="menu_book" size={40} className="mx-auto mb-3 opacity-50" />
          <p>아직 적재된 책이 없습니다. “책 추가”로 시작하세요.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {books.map((b) => (
            <Link
              key={b.id}
              href={`/admin/books/${b.slug}`}
              className="group rounded-2xl border border-glass-border bg-glass-bg hover:bg-glass-bg-hover hover:border-accent-primary/30 transition-colors p-4 flex gap-4"
            >
              <div className="w-20 h-28 shrink-0 rounded-lg overflow-hidden bg-surface-secondary relative">
                {b.cover_image ? (
                  <Image
                    src={b.cover_image}
                    alt={b.title}
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon name="auto_stories" size={28} className="text-outline-variant" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-on-surface truncate group-hover:text-accent-primary transition-colors">
                  {b.title}
                </h3>
                <p className="text-xs text-on-surface-variant truncate mb-2">
                  {b.author}
                </p>
                <div className="flex items-center gap-3 text-xs text-on-surface-variant mb-2">
                  <span className="flex items-center gap-1">
                    <Icon name="library_books" size={13} /> {b.chapters}장
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="subject" size={13} /> {b.scenes}장면
                  </span>
                </div>
                {/* Coverage bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        b.coverage === 100
                          ? "bg-success"
                          : "bg-gradient-to-r from-accent-primary to-accent-secondary"
                      )}
                      style={{ width: `${b.coverage}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-medium tabular-nums text-on-surface-variant">
                    {b.videos}/{b.scenes}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant mt-1">
                  영상 {b.coverage}%
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showAdd && (
        <AddBookModal
          onClose={() => setShowAdd(false)}
          onDone={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function AddBookModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [titleKo, setTitleKo] = useState("");
  const [author, setAuthor] = useState("");
  const [slug, setSlug] = useState("");
  const [cover, setCover] = useState("");
  const [jsonl, setJsonl] = useState("");
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title || !author || !slug || !jsonl.trim()) {
      toast("제목·저자·slug·JSONL은 필수입니다", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          title_ko: titleKo || null,
          author,
          slug,
          cover_image: cover || null,
          jsonl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "실패");
      toast(`적재 완료: ${data.chapters}장 / ${data.scenes}장면`, "success");
      onDone();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background rounded-2xl border border-glass-border shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-on-surface">책 추가 / 갱신</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <Field label="제목 (영문)" value={title} onChange={setTitle} placeholder="The Sign of the Four" />
          <Field label="제목 (한글)" value={titleKo} onChange={setTitleKo} placeholder="네 사람의 서명" />
          <Field label="저자" value={author} onChange={setAuthor} placeholder="Arthur Conan Doyle" />
          <Field label="slug (S3 경로용)" value={slug} onChange={setSlug} placeholder="sign-of-four" />
        </div>
        <div className="mb-3">
          <Field label="표지 이미지 URL" value={cover} onChange={setCover} placeholder="https://covers.openlibrary.org/..." />
        </div>

        <label className="block text-sm font-medium text-on-surface mb-1.5">
          JSONL (한 줄당 한 장면 — Chapter / Scene number / Content / Content_kor)
        </label>

        {/* .jsonl file drag-drop / picker */}
        <JsonlDropZone
          fileName={fileName}
          onFile={(text, name) => {
            setJsonl(text);
            setFileName(name);
            // auto-fill from first line if present (deliverables format has Book/Author)
            try {
              const first = JSON.parse(text.split("\n").filter((l) => l.trim())[0]);
              if (!title && first.Book) setTitle(first.Book);
              if (!author && first.Author) setAuthor(first.Author);
              if (!slug && (first.Book || title))
                setSlug(
                  (first.Book || title)
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "")
                );
            } catch {
              /* ignore */
            }
          }}
        />

        <textarea
          value={jsonl}
          onChange={(e) => setJsonl(e.target.value)}
          rows={6}
          placeholder='또는 여기에 직접 붙여넣기: {"Chapter":1,"Scene number":1,"Content":"...","Content_kor":"..."}'
          className="w-full mt-2 p-3 rounded-lg bg-surface-secondary border border-glass-border focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-xs font-mono resize-none text-on-surface placeholder:text-on-surface-variant/50"
        />
        <p className="text-[11px] text-on-surface-variant mt-1.5">
          💡 <code>_kor.jsonl</code> 파일을 위에 드롭하거나 내용을 붙여넣으세요. 같은 slug면 덮어쓰기됩니다.
        </p>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-glass-bg-hover transition-colors"
          >
            취소
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm bg-accent-primary text-white font-medium hover:bg-accent-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Icon name="progress_activity" size={15} className="animate-spin" />}
            적재
          </button>
        </div>
      </div>
    </div>
  );
}

function JsonlDropZone({
  fileName,
  onFile,
}: {
  fileName: string;
  onFile: (text: string, name: string) => void;
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function read(file: File) {
    file.text().then((text) => onFile(text, file.name));
  }

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
        if (f) read(f);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-colors",
        over
          ? "border-accent-primary bg-accent-primary/5"
          : "border-glass-border hover:border-accent-primary/40 hover:bg-glass-bg-hover"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".jsonl,.json,.txt,application/json"
        hidden
        onChange={(e) => e.target.files?.[0] && read(e.target.files[0])}
      />
      <div className="flex items-center justify-center gap-2 text-sm">
        <Icon
          name={fileName ? "description" : "upload_file"}
          size={18}
          className={over || fileName ? "text-accent-primary" : "text-on-surface-variant"}
        />
        <span className={fileName ? "text-accent-primary font-medium" : "text-on-surface-variant"}>
          {fileName || ".jsonl 파일을 드래그하거나 클릭해서 선택"}
        </span>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-on-surface mb-1.5">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-glass-border focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-sm text-on-surface placeholder:text-on-surface-variant/50"
      />
    </div>
  );
}
