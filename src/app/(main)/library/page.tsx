"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";
import type { Work } from "@/types/database";

interface WorkWithProgress extends Work {
  progress?: number;
  isReading?: boolean;
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

type FilterMode = "all" | "recent" | "bookmarked";

export default function LibraryPage() {
  const { t } = useTranslation();
  const [works, setWorks] = useState<WorkWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");

  useEffect(() => {
    async function fetchWorks() {
      const res = await fetch("/api/works");
      const data: Work[] = await res.json();

      const progressMap = new Map<string, number>();
      try {
        const pRes = await fetch("/api/user/progress");
        if (pRes.ok) {
          const progress = (await pRes.json()) as { work_id: string }[];
          progress.forEach((p) => progressMap.set(p.work_id, 0.45));
        }
      } catch {
        /* not logged in */
      }

      const withProgress: WorkWithProgress[] = (data ?? []).map((w) => ({
        ...w,
        progress: progressMap.get(w.id),
        isReading: progressMap.has(w.id),
      }));
      setWorks(withProgress);
      setLoading(false);
    }
    fetchWorks();
  }, []);

  // Toggle handled per-card; we update local state to avoid refetch
  function handleBookmarkToggle(workId: string, next: boolean) {
    setWorks((prev) =>
      prev.map((w) => (w.id === workId ? { ...w, is_bookmarked: next } : w))
    );
  }

  const filtered = works
    .filter(
      (w) =>
        w.title.toLowerCase().includes(search.toLowerCase()) ||
        w.author.toLowerCase().includes(search.toLowerCase())
    )
    .filter((w) => {
      if (filter === "recent") return w.isReading;
      if (filter === "bookmarked") return w.is_bookmarked;
      return true;
    });

  return (
    <main className="flex-grow max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-12">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 mb-10">
        <div>
          <h1 className="text-[40px] sm:text-[48px] font-bold tracking-tight leading-[1.1] text-on-background mb-2">
            {t("library.title")}
          </h1>
          <p className="font-reading text-[18px] sm:text-[20px] leading-[1.6] text-on-surface-variant max-w-2xl">
            {t("library.subtitle")}
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">
              search
            </span>
            <input
              className="w-full sm:w-64 pl-10 pr-4 py-2 bg-glass-bg backdrop-blur-md border border-glass-border rounded-full text-sm focus:outline-none focus:border-accent-primary focus:ring-4 focus:ring-accent-primary/20 shadow-sm transition-all text-on-surface placeholder:text-outline"
              placeholder={t("library.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <FilterChip
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              {t("library.allWorks")}
            </FilterChip>
            <FilterChip
              active={filter === "recent"}
              onClick={() => setFilter("recent")}
            >
              {t("library.recent")}
            </FilterChip>
            <FilterChip
              active={filter === "bookmarked"}
              onClick={() => setFilter("bookmarked")}
              icon="bookmark"
            >
              {t("library.bookmarked")}
            </FilterChip>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton variant="card" className="aspect-[3/4] h-auto" />
              <Skeleton variant="text" className="h-4 w-2/3" />
              <Skeleton variant="text" className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-20 h-20 bg-surface-secondary rounded-full flex items-center justify-center mb-6">
            <Icon
              name={filter === "bookmarked" ? "bookmark" : "search_off"}
              size={36}
              className="text-outline-variant"
            />
          </div>
          <h2 className="text-[24px] font-semibold text-on-surface mb-2">
            {t("library.noWorksFound")}
          </h2>
          <p className="font-reading text-[16px] text-on-surface-variant max-w-md">
            {t("library.noResults")}
          </p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {filtered.map((work) => (
            <motion.div key={work.id} variants={fadeUp}>
              <BookCard
                work={work}
                onBookmarkToggle={handleBookmarkToggle}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer",
        active
          ? "bg-accent-primary text-white hover:bg-accent-primary/90"
          : "bg-glass-bg backdrop-blur-md border border-glass-border text-accent-primary hover:bg-glass-bg-hover"
      )}
    >
      {icon && <Icon name={icon} size={14} fill={active} />}
      {children}
    </button>
  );
}

function BookCard({
  work,
  onBookmarkToggle,
}: {
  work: WorkWithProgress;
  onBookmarkToggle: (workId: string, next: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const continueLabel = work.isReading
    ? t("library.continue")
    : t("library.readNow");
  const displayTitle =
    i18n.language === "ko" && work.title_ko ? work.title_ko : work.title;

  async function handleBookmarkClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    const next = !work.is_bookmarked;
    try {
      if (next) {
        await fetch("/api/work-bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ work_id: work.id }),
        });
        toast(t("library.bookmarkSaved"), "success");
      } else {
        await fetch(`/api/work-bookmarks?work_id=${work.id}`, {
          method: "DELETE",
        });
        toast(t("library.bookmarkRemoved"), "info");
      }
      onBookmarkToggle(work.id, next);
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Link
      href={`/works/${work.id}`}
      className="group cursor-pointer flex flex-col gap-3"
    >
      <div className="aspect-[3/4] rounded-lg overflow-hidden border border-glass-border shadow-sm group-hover:-translate-y-1 group-hover:shadow-md transition-all duration-300 relative bg-glass-bg backdrop-blur-md">
        {/* Bookmark toggle button — top right */}
        <button
          onClick={handleBookmarkClick}
          disabled={saving}
          aria-label={
            work.is_bookmarked ? t("library.removeBookmark") : t("library.bookmark")
          }
          className={cn(
            "absolute top-3 right-3 z-20 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center shadow-sm transition-all hover:scale-110 active:scale-95 disabled:opacity-60",
            work.is_bookmarked
              ? "bg-accent-primary text-white"
              : "bg-white/85 text-on-surface-variant hover:text-accent-primary"
          )}
        >
          <Icon
            name={work.is_bookmarked ? "bookmark" : "bookmark_border"}
            size={18}
            fill={work.is_bookmarked}
          />
        </button>

        {/* Reading indicator */}
        {work.isReading && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded text-accent-primary text-[10px] font-bold flex items-center gap-1 border border-accent-primary/20 shadow-sm z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
            {t("library.reading")}
          </div>
        )}

        {/* Progress bar */}
        {work.isReading && typeof work.progress === "number" && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-surface-tertiary z-10">
            <div
              className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary"
              style={{ width: `${work.progress * 100}%` }}
            />
          </div>
        )}

        {/* Hover CTA */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-end p-4 pb-6">
          <div className="w-full py-2 bg-white/90 backdrop-blur-sm text-accent-primary rounded text-[12px] tracking-widest uppercase font-semibold text-center hover:bg-white transition-colors">
            {continueLabel}
          </div>
        </div>

        {work.cover_image ? (
          <Image
            src={work.cover_image}
            alt={displayTitle}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon
              name="auto_stories"
              size={64}
              className="text-outline-variant"
            />
          </div>
        )}
      </div>

      <div>
        <h3 className="text-[16px] font-semibold text-on-surface truncate">
          {displayTitle}
        </h3>
        <p className="text-[14px] text-on-surface-variant truncate">
          {work.author}
        </p>
        {work.genre && (
          <div className="mt-2 inline-block px-2 py-1 bg-surface-secondary text-on-surface-variant rounded text-[10px] tracking-wider uppercase border border-glass-border font-semibold">
            {t(`genres.${work.genre}`, work.genre)}
          </div>
        )}
      </div>
    </Link>
  );
}
