"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/ui/Icon";
import { GlassButton } from "@/components/ui/GlassButton";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const { t } = useTranslation();

  const navLinks = [
    { href: "/library", label: t("nav.library"), icon: "local_library" },
    { href: "/bookmarks", label: t("nav.bookmarks"), icon: "bookmark" },
    { href: "/notes", label: t("nav.notes"), icon: "edit_note" },
  ];

  useEffect(() => {
    const stored = window.localStorage.getItem("theme");
    const initial = stored === "light" || stored === "dark" ? stored : "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem("theme", next);
  };

  return (
    <nav className="bg-background/70 backdrop-blur-xl sticky top-0 z-50 border-b border-outline-variant/40 shadow-[0_4px_30px_rgba(30,41,59,0.04)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
        {/* Logo + Nav (grouped left like the spec) */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center group">
            <span className="text-2xl font-black tracking-tighter text-accent-primary">
              CLIP-IT
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-base transition-colors pb-1",
                    isActive
                      ? "text-accent-primary border-b-2 border-accent-primary font-medium"
                      : "text-on-surface-variant hover:text-accent-primary"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            className="glass w-10 h-10 rounded-xl flex items-center justify-center border border-glass-border hover:bg-glass-bg-hover transition-colors"
          >
            <Icon
              name={theme === "dark" ? "light_mode" : "dark_mode"}
              size={20}
              className="text-accent-primary"
              fill
            />
          </button>
          {/* 언어 전환 / Language Switcher */}
          <LanguageSwitcher />

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center">
                  <Icon name="person" size={18} className="text-accent-primary" />
                </div>
                <Icon
                  name="expand_more"
                  size={18}
                  className={cn(
                    "text-txt-muted transition-transform",
                    menuOpen && "rotate-180"
                  )}
                />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-48 glass-heavy rounded-xl p-1.5 border border-glass-border"
                  >
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-txt-secondary hover:text-txt-primary hover:bg-white/5 transition-colors"
                    >
                      <Icon name="account_circle" size={18} />
                      {t("nav.profile")}
                    </Link>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-txt-secondary hover:text-error hover:bg-error/5 transition-colors cursor-pointer"
                    >
                      <Icon name="logout" size={18} />
                      {t("nav.signOut")}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <GlassButton variant="ghost" size="sm">
                  {t("nav.login")}
                </GlassButton>
              </Link>
              <Link href="/signup">
                <GlassButton variant="primary" size="sm">
                  {t("nav.signUp")}
                </GlassButton>
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-xl hover:bg-white/5 cursor-pointer"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name={menuOpen ? "close" : "menu"} size={24} />
          </button>
        </div>
      </div>
    </nav>
  );
}
