"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";

interface AppUser {
  sub: string;
  email: string | null;
  role: "user" | "admin";
  first_seen: string | null;
  last_seen: string | null;
  is_super: boolean;
  pending: boolean;
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantEmail, setGrantEmail] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setRole(email: string, role: "admin" | "user") {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const d = await res.json();
    if (!res.ok) return toast(d.error || "실패", "error");
    toast(
      role === "admin" ? "관리자 권한 부여됨" : "권한 해제됨",
      "success"
    );
    load();
  }

  async function grant() {
    const email = grantEmail.trim();
    if (!email) return;
    await setRole(email, "admin");
    setGrantEmail("");
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-10">
      <h1 className="text-3xl font-bold text-on-background mb-1">유저 관리</h1>
      <p className="text-sm text-on-surface-variant mb-8">
        가입한 사용자 목록과 관리자 권한 관리. 관리자만 <code>/admin</code>에
        접근할 수 있습니다.
      </p>

      {/* Grant by email */}
      <div className="flex flex-col sm:flex-row gap-2 mb-8 p-4 rounded-xl border border-glass-border bg-glass-bg">
        <div className="flex-1">
          <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
            이메일로 관리자 권한 부여 (아직 가입 전이어도 가능)
          </label>
          <input
            value={grantEmail}
            onChange={(e) => setGrantEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && grant()}
            placeholder="user@example.com"
            className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-glass-border focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-sm text-on-surface"
          />
        </div>
        <button
          onClick={grant}
          className="px-4 py-2 sm:self-end rounded-lg bg-accent-primary text-white text-sm font-medium hover:bg-accent-primary/90 transition-colors flex items-center justify-center gap-1.5"
        >
          <Icon name="add_moderator" size={16} />
          관리자 부여
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-on-surface-variant">
          <Icon name="progress_activity" size={28} className="animate-spin mx-auto" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <Icon name="group" size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">아직 로그인한 사용자가 없습니다.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-glass-border overflow-hidden">
          {users.map((u, i) => (
            <div
              key={u.sub}
              className={cn(
                "flex items-center gap-3 px-4 py-3",
                i > 0 && "border-t border-glass-border/60"
              )}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                  u.role === "admin"
                    ? "bg-accent-primary/15 text-accent-primary"
                    : "bg-surface-secondary text-on-surface-variant"
                )}
              >
                <Icon
                  name={u.role === "admin" ? "shield_person" : "person"}
                  size={18}
                  fill={u.role === "admin"}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface truncate">
                  {u.email ?? "(이메일 없음)"}
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  {u.is_super
                    ? "슈퍼 관리자"
                    : u.pending
                      ? "초대됨 (로그인 대기)"
                      : u.last_seen
                        ? `최근 접속 ${new Date(u.last_seen).toLocaleDateString()}`
                        : ""}
                </p>
              </div>

              {u.is_super ? (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent-primary/10 text-accent-primary shrink-0">
                  SUPER
                </span>
              ) : u.role === "admin" ? (
                <button
                  onClick={() => u.email && setRole(u.email, "user")}
                  className="text-xs px-3 py-1.5 rounded-lg bg-accent-primary/10 text-accent-primary hover:bg-error/10 hover:text-error transition-colors shrink-0"
                >
                  관리자 해제
                </button>
              ) : (
                <button
                  onClick={() => u.email && setRole(u.email, "admin")}
                  className="text-xs px-3 py-1.5 rounded-lg bg-surface-secondary text-on-surface-variant hover:bg-accent-primary/10 hover:text-accent-primary transition-colors shrink-0"
                >
                  관리자 부여
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
