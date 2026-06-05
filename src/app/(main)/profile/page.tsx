"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/hooks/useAuth";
import type { UserProgress, Work } from "@/types/database";
import Link from "next/link";

interface ProgressWithWork extends UserProgress {
  work: Work;
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const [history, setHistory] = useState<ProgressWithWork[]>([]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/user/progress")
      .then((r) => r.json())
      .then((data) => {
        setHistory(data ?? []);
      });
  }, [user]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold mb-8">{t("profile.title")}</h1>

      {/* User info / 사용자 정보 */}
      <GlassCard hover={false} className="p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-accent-primary/20 flex items-center justify-center shrink-0">
            <Icon name="person" size={32} className="text-accent-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-lg break-all">{user?.email}</p>
            <p className="text-txt-muted text-sm">
              {t("profile.memberSince")}{" "}
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : ""}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <GlassButton
            variant="secondary"
            icon="logout"
            onClick={signOut}
          >
            {t("nav.signOut")}
          </GlassButton>
        </div>
      </GlassCard>

      {/* Reading History / 독서 기록 */}
      <h2 className="text-xl font-semibold mb-4">{t("profile.readingHistory")}</h2>
      {history.length === 0 ? (
        <div className="text-center py-12 text-txt-muted">
          <Icon name="history" size={40} className="mb-3 mx-auto" />
          <p className="text-sm">{t("profile.noHistory")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((h) => (
            <Link key={h.id} href={`/works/${h.work_id}`}>
              <GlassCard className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{h.work.title}</p>
                  <p className="text-xs text-txt-muted">
                    {new Date(h.last_accessed_at).toLocaleDateString()}
                  </p>
                </div>
                <Icon
                  name="arrow_forward"
                  size={18}
                  className="text-txt-muted"
                />
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
