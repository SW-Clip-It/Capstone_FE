"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/hooks/useAuth";
import { truncate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Work } from "@/types/database";

interface PassageBookmark {
  id: string;
  note: string | null;
  created_at: string;
  text_block: {
    id: string;
    content: string;
    content_ko: string | null;
    chapter: {
      id: string;
      title: string;
      title_ko: string | null;
      work_id: string;
      work: {
        id: string;
        title: string;
        title_ko: string | null;
        cover_image?: string | null;
      };
    };
  };
}

interface WorkBookmarkItem {
  id: string;
  created_at: string;
  work: Work;
}

type Tab = "works" | "passages";

export default function BookmarksPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>("works");
  const [workBookmarks, setWorkBookmarks] = useState<WorkBookmarkItem[]>([]);
  const [passages, setPassages] = useState<PassageBookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/work-bookmarks").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/bookmarks").then((r) => (r.ok ? r.json() : [])),
    ]).then(([w, p]) => {
      setWorkBookmarks(w ?? []);
      setPassages(p ?? []);
      setLoading(false);
    });
  }, [user]);

  // Group passages by work for the "Passages" tab
  const passagesByWork = useMemo(() => {
    const map = new Map<string, { work: PassageBookmark["text_block"]["chapter"]["work"]; items: PassageBookmark[] }>();
    for (const bm of passages) {
      const w = bm.text_block.chapter.work;
      if (!map.has(w.id)) map.set(w.id, { work: w, items: [] });
      map.get(w.id)!.items.push(bm);
    }
    return Array.from(map.values());
  }, [passages]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-[40px] sm:text-[48px] font-bold tracking-tight text-on-background mb-2">
        {t("bookmarks.title")}
      </h1>
      <p className="font-reading text-[18px] leading-[1.6] text-on-surface-variant mb-8">
        {t("bookmarks.subtitle")}
      </p>

      {/* Tab switcher */}
      <div className="inline-flex p-1 rounded-xl bg-surface-secondary border border-glass-border mb-8">
        <TabButton
          active={tab === "works"}
          onClick={() => setTab("works")}
          count={workBookmarks.length}
          icon="auto_stories"
        >
          {t("bookmarks.tabWorks")}
        </TabButton>
        <TabButton
          active={tab === "passages"}
          onClick={() => setTab("passages")}
          count={passages.length}
          icon="format_quote"
        >
          {t("bookmarks.tabPassages")}
        </TabButton>
      </div>

      {loading ? (
        <div className="text-center py-12 text-on-surface-variant text-sm">
          {t("common.loading")}
        </div>
      ) : tab === "works" ? (
        <WorksTab items={workBookmarks} lang={i18n.language} t={t} />
      ) : (
        <PassagesTab groups={passagesByWork} lang={i18n.language} t={t} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  count,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
        active
          ? "bg-background text-accent-primary shadow-sm"
          : "text-on-surface-variant hover:text-on-surface"
      )}
    >
      <Icon name={icon} size={16} fill={active} />
      {children}
      <span
        className={cn(
          "ml-1 px-1.5 py-0.5 rounded text-xs tabular-nums",
          active ? "bg-accent-primary/10" : "bg-surface-tertiary"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function WorksTab({
  items,
  lang,
  t,
}: {
  items: WorkBookmarkItem[];
  lang: string;
  t: (k: string) => string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon="auto_stories"
        title={t("bookmarks.emptyWorks")}
        hint={t("bookmarks.emptyWorksHint")}
      />
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-5 gap-y-8">
      {items.map((bm) => {
        const w = bm.work;
        const title = lang === "ko" && w.title_ko ? w.title_ko : w.title;
        return (
          <Link
            key={bm.id}
            href={`/works/${w.id}`}
            className="group flex flex-col gap-2.5"
          >
            <div className="aspect-[3/4] rounded-lg overflow-hidden border border-glass-border shadow-sm group-hover:shadow-md group-hover:-translate-y-1 transition-all bg-glass-bg relative">
              <div className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-accent-primary text-white flex items-center justify-center shadow-sm">
                <Icon name="bookmark" size={16} fill />
              </div>
              {w.cover_image && (
                <Image
                  src={w.cover_image}
                  alt={title}
                  fill
                  sizes="200px"
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-on-surface truncate group-hover:text-accent-primary transition-colors">
                {title}
              </h3>
              <p className="text-xs text-on-surface-variant truncate">
                {w.author}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function PassagesTab({
  groups,
  lang,
  t,
}: {
  groups: {
    work: PassageBookmark["text_block"]["chapter"]["work"];
    items: PassageBookmark[];
  }[];
  lang: string;
  t: (k: string) => string;
}) {
  if (groups.length === 0) {
    return (
      <EmptyState
        icon="format_quote"
        title={t("bookmarks.empty")}
        hint={t("bookmarks.emptyHint")}
      />
    );
  }
  return (
    <div className="space-y-10">
      {groups.map(({ work, items }) => {
        const workTitle =
          lang === "ko" && work.title_ko ? work.title_ko : work.title;
        return (
          <section key={work.id}>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-glass-border">
              <Link
                href={`/works/${work.id}`}
                className="flex items-center gap-2 group"
              >
                <Icon
                  name="auto_stories"
                  size={18}
                  className="text-accent-primary"
                />
                <h2 className="text-lg font-semibold text-on-surface group-hover:text-accent-primary transition-colors">
                  {workTitle}
                </h2>
              </Link>
              <span className="text-xs text-on-surface-variant tabular-nums">
                {items.length} {t("bookmarks.passagesCount")}
              </span>
            </div>
            <div className="space-y-3">
              {items.map((bm) => {
                const tb = bm.text_block;
                const ch = tb.chapter;
                const chTitle =
                  lang === "ko" && ch.title_ko ? ch.title_ko : ch.title;
                const content =
                  lang === "ko" && tb.content_ko ? tb.content_ko : tb.content;
                return (
                  <Link
                    key={bm.id}
                    // Deep-link to the specific block, highlight only (play=0)
                    href={`/works/${work.id}/reader?chapter=${ch.id}&block=${tb.id}&play=0`}
                    className="block group"
                  >
                    <div className="border border-glass-border bg-glass-bg hover:bg-glass-bg-hover hover:border-accent-primary/30 rounded-xl p-4 transition-colors">
                      <p className="text-xs text-on-surface-variant mb-1.5">
                        {chTitle}
                      </p>
                      <p className="font-reading text-[15px] text-on-surface leading-relaxed">
                        {truncate(content, 180)}
                      </p>
                      {bm.note && (
                        <p className="text-xs text-on-surface-variant mt-2 italic flex items-start gap-1.5">
                          <Icon
                            name="edit_note"
                            size={13}
                            className="text-accent-primary mt-0.5 shrink-0"
                          />
                          {bm.note}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 bg-surface-secondary rounded-full flex items-center justify-center mb-6">
        <Icon name={icon} size={40} className="text-outline-variant" />
      </div>
      <h2 className="text-[20px] font-semibold text-on-surface mb-2">
        {title}
      </h2>
      <p className="text-on-surface-variant text-sm max-w-md">{hint}</p>
    </div>
  );
}
