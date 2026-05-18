"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn(email, password);
    setLoading(false);
  }

  return (
    <GlassCard variant="heavy" hover={false} className="p-8">
      <div className="text-center mb-8">
        <Icon
          name="auto_stories"
          size={48}
          className="text-accent-primary mb-4"
          fill
        />
        <h1 className="text-2xl font-bold mb-2">{t("auth.welcomeBack")}</h1>
        <p className="text-txt-secondary text-sm">
          {t("auth.signInSubtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <GlassInput
          label={t("auth.email")}
          type="email"
          icon="mail"
          placeholder={t("auth.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <GlassInput
          label={t("auth.password")}
          type="password"
          icon="lock"
          placeholder={t("auth.passwordPlaceholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <GlassButton
          type="submit"
          loading={loading}
          className="w-full"
          size="lg"
          icon="login"
        >
          {t("auth.signIn")}
        </GlassButton>
      </form>

      <p className="text-center text-sm text-txt-secondary mt-6">
        {t("auth.noAccount")}{" "}
        <Link
          href="/signup"
          className="text-accent-primary hover:underline"
        >
          {t("nav.signUp")}
        </Link>
      </p>
    </GlassCard>
  );
}
