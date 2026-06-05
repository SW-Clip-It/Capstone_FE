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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [isAdmin, setIsAdmin] = useState(false);
  const { t } = useTranslation();

  // Only show the Admin menu item to actual admins
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(!!d.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [user]);

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

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem("theme", next);
  };

  return (
    <nav className="bg-background/70 backdrop-blur-xl sticky top-0 z-50 border-b border-outline-variant/40 shadow-[0_4px_30px_rgba(30,41,59,0.04)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Logo + desktop nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center group">
            <span className="text-xl sm:text-2xl font-black tracking-tighter text-accent-primary">
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
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="glass w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border border-glass-border hover:bg-glass-bg-hover transition-colors"
          >
            <Icon
              name={theme === "dark" ? "light_mode" : "dark_mode"}
              size={18}
              className="text-accent-primary"
              fill
            />
          </button>
          <LanguageSwitcher />

          {/* Desktop user menu */}
          {user ? (
            <div className="relative hidden md:block">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-glass-bg-hover transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center">
                  <Icon name="person" size={18} className="text-accent-primary" />
                </div>
                <Icon
                  name="expand_more"
                  size={18}
                  className={cn(
                    "text-on-surface-variant transition-transform",
                    userMenuOpen && "rotate-180"
                  )}
                />
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-48 glass-heavy rounded-xl p-1.5 border border-glass-border"
                  >
                    <DropItem href="/profile" icon="account_circle" onClick={() => setUserMenuOpen(false)}>
                      {t("nav.profile")}
                    </DropItem>
                    {isAdmin && (
                      <DropItem href="/admin" icon="admin_panel_settings" onClick={() => setUserMenuOpen(false)}>
                        {t("nav.admin")}
                      </DropItem>
                    )}
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:text-error hover:bg-error/5 transition-colors cursor-pointer"
                    >
                      <Icon name="logout" size={18} />
                      {t("nav.signOut")}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
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

          {/* Mobile hamburger */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-glass-bg-hover cursor-pointer text-on-surface"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <Icon name={mobileOpen ? "close" : "menu"} size={24} />
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-outline-variant/40 bg-background/95 backdrop-blur-xl"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                      isActive
                        ? "bg-accent-primary/10 text-accent-primary font-medium"
                        : "text-on-surface hover:bg-glass-bg-hover"
                    )}
                  >
                    <Icon name={link.icon} size={20} fill={isActive} />
                    {link.label}
                  </Link>
                );
              })}

              <div className="h-px bg-outline-variant/40 my-2" />

              {user ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface hover:bg-glass-bg-hover transition-colors"
                  >
                    <Icon name="account_circle" size={20} />
                    {t("nav.profile")}
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface hover:bg-glass-bg-hover transition-colors"
                    >
                      <Icon name="admin_panel_settings" size={20} />
                      {t("nav.admin")}
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-error hover:bg-error/5 transition-colors"
                  >
                    <Icon name="logout" size={20} />
                    {t("nav.signOut")}
                  </button>
                </>
              ) : (
                <div className="flex gap-2 pt-1">
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1">
                    <div className="text-center px-4 py-2.5 rounded-xl border border-glass-border text-sm text-on-surface">
                      {t("nav.login")}
                    </div>
                  </Link>
                  <Link href="/signup" onClick={() => setMobileOpen(false)} className="flex-1">
                    <div className="text-center px-4 py-2.5 rounded-xl bg-accent-primary text-white text-sm font-medium">
                      {t("nav.signUp")}
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function DropItem({
  href,
  icon,
  onClick,
  children,
}: {
  href: string;
  icon: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:text-on-surface hover:bg-glass-bg-hover transition-colors"
    >
      <Icon name={icon} size={18} />
      {children}
    </Link>
  );
}
