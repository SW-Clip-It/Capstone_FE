"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<
    "checking" | "allowed" | "denied"
  >("checking");

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => setStatus(d.isAdmin ? "allowed" : "denied"))
      .catch(() => setStatus("denied"));
  }, []);

  useEffect(() => {
    if (status === "denied") {
      const t = setTimeout(() => router.replace("/library"), 1800);
      return () => clearTimeout(t);
    }
  }, [status, router]);

  const tabs = [
    { href: "/admin", label: "Books", icon: "menu_book", exact: true },
    { href: "/admin/users", label: "Users", icon: "group" },
    { href: "/admin/developers", label: "Developer API", icon: "terminal" },
  ];

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Icon
          name="progress_activity"
          size={32}
          className="animate-spin text-accent-primary"
        />
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-6">
        <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
          <Icon name="lock" size={28} className="text-error" />
        </div>
        <h1 className="text-xl font-bold text-on-surface mb-1">
          접근 권한이 없습니다
        </h1>
        <p className="text-sm text-on-surface-variant">
          관리자 권한이 필요합니다. 라이브러리로 이동합니다…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-outline-variant/40">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <Link href="/admin" className="flex items-center gap-2 shrink-0">
              <span className="text-lg sm:text-xl font-black tracking-tighter text-accent-primary">
                CLIP-IT
              </span>
              <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-md bg-accent-primary/10 text-accent-primary uppercase tracking-wider">
                Admin
              </span>
            </Link>
            <nav className="flex items-center gap-1">
              {tabs.map((tab) => {
                const active = tab.exact
                  ? pathname === tab.href
                  : pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-accent-primary/10 text-accent-primary"
                        : "text-on-surface-variant hover:text-on-surface hover:bg-glass-bg-hover"
                    )}
                  >
                    <Icon name={tab.icon} size={16} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <Link
            href="/library"
            className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent-primary transition-colors shrink-0"
          >
            <Icon name="arrow_back" size={16} />
            <span className="hidden sm:inline">사이트로</span>
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
