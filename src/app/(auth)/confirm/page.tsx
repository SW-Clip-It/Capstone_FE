"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/providers/ToastProvider";
import { confirmSignUp } from "@/lib/aws/cognito";

export default function ConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await confirmSignUp(email, code);
      toast(t("auth.confirmSuccess"), "success");
      router.push("/login");
    } catch (err: any) {
      toast(err.message || t("auth.confirmError"), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard variant="heavy" hover={false} className="p-8">
      <div className="text-center mb-8">
        <Icon
          name="mark_email_read"
          size={48}
          className="text-accent-primary mb-4"
          fill
        />
        <h1 className="text-2xl font-bold mb-2">{t("auth.confirmTitle")}</h1>
        <p className="text-txt-secondary text-sm">
          {t("auth.confirmSubtitle")}
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
          label={t("auth.confirmCode")}
          type="text"
          icon="pin"
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <GlassButton
          type="submit"
          loading={loading}
          className="w-full"
          size="lg"
          icon="verified"
        >
          {t("auth.confirmBtn")}
        </GlassButton>
      </form>

      <p className="text-center text-sm text-txt-secondary mt-6">
        {t("auth.hasAccount")}{" "}
        <Link href="/login" className="text-accent-primary hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </GlassCard>
  );
}
