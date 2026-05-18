"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/hooks/useAuth";
import { truncate } from "@/lib/utils";

interface NoteItem {
  id: string;
  note: string;
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
      };
    };
  };
}

export default function NotesPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch("/api/bookmarks?notesOnly=true")
      .then((r) => r.json())
      .then((data) => {
        setNotes((data ?? []).filter((n: NoteItem) => n.note));
        setLoading(false);
      });
  }, [user]);

  // Group by work, preserving date order within each group
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { work: NoteItem["text_block"]["chapter"]["work"]; items: NoteItem[] }
    >();
    for (const n of notes) {
      const w = n.text_block.chapter.work;
      if (!map.has(w.id)) map.set(w.id, { work: w, items: [] });
      map.get(w.id)!.items.push(n);
    }
    return Array.from(map.values());
  }, [notes]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-[40px] sm:text-[48px] font-bold tracking-tight text-on-background mb-2">
        {t("nav.notes")}
      </h1>
      <p className="font-reading text-[18px] leading-[1.6] text-on-surface-variant mb-10">
        {t("notes.subtitle")}
      </p>

      {loading ? (
        <div className="text-center py-12 text-on-surface-variant text-sm">
          {t("common.loading")}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-surface-secondary rounded-full flex items-center justify-center mb-6">
            <Icon name="edit_note" size={40} className="text-outline-variant" />
          </div>
          <h2 className="text-[24px] font-semibold text-on-surface mb-2">
            {t("notes.empty")}
          </h2>
          <p className="text-on-surface-variant text-sm max-w-md">
            {t("notes.emptyHint")}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(({ work, items }) => {
            const workTitle =
              i18n.language === "ko" && work.title_ko
                ? work.title_ko
                : work.title;
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
                    {items.length} {t("notes.notesCount")}
                  </span>
                </div>
                <div className="space-y-3">
                  {items.map((n) => {
                    const tb = n.text_block;
                    const ch = tb.chapter;
                    const chTitle =
                      i18n.language === "ko" && ch.title_ko
                        ? ch.title_ko
                        : ch.title;
                    const content =
                      i18n.language === "ko" && tb.content_ko
                        ? tb.content_ko
                        : tb.content;
                    return (
                      <Link
                        key={n.id}
                        // Deep-link to the block, highlight only
                        href={`/works/${work.id}/reader?chapter=${ch.id}&block=${tb.id}&play=0`}
                        className="block group"
                      >
                        <div className="border border-glass-border bg-glass-bg hover:bg-glass-bg-hover hover:border-accent-primary/30 rounded-xl p-5 transition-colors">
                          <div className="flex items-center justify-between mb-3 text-xs text-on-surface-variant">
                            <span>{chTitle}</span>
                            <span className="tabular-nums">
                              {new Date(n.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <blockquote className="border-l-2 border-accent-primary/40 pl-3 mb-3">
                            <p className="text-sm text-on-surface-variant italic font-reading leading-relaxed">
                              &ldquo;{truncate(content, 180)}&rdquo;
                            </p>
                          </blockquote>

                          <div className="flex items-start gap-2">
                            <Icon
                              name="edit_note"
                              size={16}
                              className="text-accent-primary shrink-0 mt-0.5"
                            />
                            <p className="text-sm text-on-surface leading-relaxed flex-1">
                              {n.note}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
