"use client";

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const toggleLanguage = () => {
    const nextLang = currentLang === "ko" ? "en" : "ko";
    i18n.changeLanguage(nextLang);
    // HTML lang 속성도 업데이트
    document.documentElement.lang = nextLang;
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium
        glass hover:bg-glass-bg-hover border border-glass-border
        transition-all duration-200 cursor-pointer"
      title={currentLang === "ko" ? "Switch to English" : "한국어로 전환"}
    >
      <span
        className={cn(
          "transition-colors",
          currentLang === "ko" ? "text-accent-primary" : "text-txt-muted"
        )}
      >
        한
      </span>
      <span className="text-txt-muted">/</span>
      <span
        className={cn(
          "transition-colors",
          currentLang === "en" ? "text-accent-primary" : "text-txt-muted"
        )}
      >
        EN
      </span>
    </button>
  );
}
