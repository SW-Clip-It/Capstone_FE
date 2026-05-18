"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Work, Chapter } from "@/types/database";

export default function WorkDetailPage() {
  const { workId } = useParams<{ workId: string }>();
  const { t, i18n } = useTranslation();
  const [work, setWork] = useState<Work | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [workRes, chaptersRes] = await Promise.all([
        fetch(`/api/works/${workId}`).then((r) => r.json()),
        fetch(`/api/works/${workId}/chapters`).then((r) => r.json()),
      ]);
      setWork(workRes);
      setChapters(chaptersRes ?? []);
      setLoading(false);
    }
    fetchData();
  }, [workId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Skeleton variant="card" className="h-64" />
        <Skeleton variant="text" className="h-8 w-1/2" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="text" className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (!work) {
    return (
      <div className="text-center py-20 text-on-surface-variant">
        <Icon name="error" size={48} className="mb-4 mx-auto" />
        <p>{t("works.notFound")}</p>
      </div>
    );
  }

  const ko = i18n.language === "ko";
  const displayTitle = ko && work.title_ko ? work.title_ko : work.title;
  const displayDescription =
    ko && work.description_ko ? work.description_ko : work.description;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden mb-8">
        <div className="absolute inset-0 bg-surface-secondary">
          {work.cover_image && (
            <Image
              src={work.cover_image}
              alt=""
              fill
              className="object-cover opacity-20 blur-lg scale-110"
              unoptimized
            />
          )}
        </div>
        <div className="relative flex flex-col sm:flex-row gap-6 p-6 sm:p-8 bg-background/40 backdrop-blur-sm">
          <div className="w-40 h-56 shrink-0 rounded-xl overflow-hidden bg-glass-bg self-center sm:self-start border border-glass-border shadow-sm">
            {work.cover_image ? (
              <Image
                src={work.cover_image}
                alt={displayTitle}
                width={160}
                height={224}
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon
                  name="auto_stories"
                  size={48}
                  className="text-on-surface-variant"
                />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2 text-on-surface">
              {displayTitle}
            </h1>
            <p className="text-on-surface-variant mb-3">by {work.author}</p>
            <div className="flex items-center gap-3 text-sm text-on-surface-variant mb-4">
              {work.genre && (
                <span className="px-3 py-1 rounded-full bg-accent-primary/10 text-accent-primary">
                  {t(`genres.${work.genre}`, work.genre)}
                </span>
              )}
              {work.published_year && <span>{work.published_year}</span>}
              <span className="flex items-center gap-1">
                <Icon name="library_books" size={16} />
                {chapters.length} {t("works.chapters")}
              </span>
            </div>
            {displayDescription && (
              <p className="text-on-surface-variant text-sm leading-relaxed font-reading">
                {displayDescription}
              </p>
            )}
            {chapters.length > 0 && (
              <Link
                href={`/works/${work.id}/reader?chapter=${chapters[0].id}`}
                className="inline-block mt-5"
              >
                <GlassButton icon="play_arrow" size="lg">
                  {t("works.startReading")}
                </GlassButton>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Chapters */}
      <h2 className="text-xl font-semibold mb-4 text-on-surface">
        {t("works.chapters")}
      </h2>
      <motion.div
        className="space-y-3"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      >
        {chapters.map((ch) => {
          const chTitle = ko && ch.title_ko ? ch.title_ko : ch.title;
          return (
            <motion.div
              key={ch.id}
              variants={{
                hidden: { opacity: 0, x: -10 },
                visible: { opacity: 1, x: 0 },
              }}
            >
              <Link href={`/works/${work.id}/reader?chapter=${ch.id}`}>
                <GlassCard className="p-4 flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary font-semibold text-sm">
                      {ch.chapter_number}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-on-surface">
                        {chTitle}
                      </h3>
                      <p className="text-xs text-on-surface-variant">
                        {ch.total_blocks} {t("works.blocks")}
                      </p>
                    </div>
                  </div>
                  <Icon
                    name="arrow_forward"
                    size={20}
                    className="text-on-surface-variant group-hover:text-accent-primary transition-colors"
                  />
                </GlassCard>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
