"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin", label: "Books", icon: "menu_book", exact: true },
    { href: "/admin/developers", label: "Developer API", icon: "terminal" },
  ];

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
