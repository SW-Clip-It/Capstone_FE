"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";

interface UserRow {
  username: string;
  sub: string;
  email: string | null;
  status: string;
  enabled: boolean;
  created: string | null;
  role: "user" | "admin";
  is_super: boolean;
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [source, setSource] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const d = await res.json();
      setUsers(d.users ?? []);
      setSource(d.source ?? "");
    } else {
      toast("불러오기 실패", "error");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setRole(email: string | null, role: "admin" | "user") {
    if (!email) return;
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const d = await res.json();
    if (!res.ok) return toast(d.error || "실패", "error");
    toast(role === "admin" ? "관리자 권한 부여됨" : "권한 해제됨", "success");
    load();
  }

  async function removeUser(u: UserRow) {
    if (!confirm(`정말 ${u.email ?? u.username} 계정을 삭제하시겠습니까?`)) return;
    const res = await fetch(
      `/api/admin/users?username=${encodeURIComponent(u.username)}&email=${encodeURIComponent(u.email ?? "")}`,
      { method: "DELETE" }
    );
    const d = await res.json();
    if (!res.ok) return toast(d.error || "삭제 실패", "error");
    toast("회원 삭제됨", "info");
    load();
  }

  async function toggleEnabled(u: UserRow) {
    const action = u.enabled ? "disable" : "enable";
    const res = await fetch(
      `/api/admin/users?username=${encodeURIComponent(u.username)}&email=${encodeURIComponent(u.email ?? "")}&action=${action}`,
      { method: "DELETE" }
    );
    const d = await res.json();
    if (!res.ok) return toast(d.error || "실패", "error");
    toast(u.enabled ? "계정 비활성화" : "계정 활성화", "success");
    load();
  }

  const adminCount = users.filter((u) => u.role === "admin").length;

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-10">
      <h1 className="text-3xl font-bold text-on-background mb-1">유저 관리</h1>
      <p className="text-sm text-on-surface-variant mb-6">
        전체 회원 {users.length}명 · 관리자 {adminCount}명. 관리자만{" "}
        <code>/admin</code>에 접근할 수 있습니다.
        {source === "app_users" && (
          <span className="text-warning"> (Cognito 권한 없음 — 로그인 기록만 표시)</span>
        )}
      </p>

      {loading ? (
        <div className="text-center py-12 text-on-surface-variant">
          <Icon name="progress_activity" size={28} className="animate-spin mx-auto" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <Icon name="group" size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">회원이 없습니다.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-glass-border overflow-hidden">
          {users.map((u, i) => (
            <div
              key={u.sub || u.username}
              className={cn(
                "flex items-center gap-3 px-3 sm:px-4 py-3",
                i > 0 && "border-t border-glass-border/60",
                !u.enabled && "opacity-60"
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
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-on-surface truncate">
                    {u.email ?? "(이메일 없음)"}
                  </p>
                  {u.is_super && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent-primary/10 text-accent-primary shrink-0">
                      SUPER
                    </span>
                  )}
                  {u.status && u.status !== "CONFIRMED" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/15 text-warning shrink-0">
                      {u.status}
                    </span>
                  )}
                  {!u.enabled && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-error/15 text-error shrink-0">
                      비활성
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant truncate">
                  {u.created
                    ? `가입 ${new Date(u.created).toLocaleDateString()}`
                    : u.role === "admin" && !u.is_super
                      ? "초대됨"
                      : ""}
                </p>
              </div>

              {/* Actions */}
              {!u.is_super && (
                <div className="flex items-center gap-1 shrink-0">
                  {u.role === "admin" ? (
                    <button
                      onClick={() => setRole(u.email, "user")}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-accent-primary/10 text-accent-primary hover:bg-glass-bg-hover transition-colors"
                    >
                      <span className="hidden sm:inline">관리자 해제</span>
                      <Icon name="remove_moderator" size={15} className="sm:hidden" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setRole(u.email, "admin")}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-surface-secondary text-on-surface-variant hover:text-accent-primary hover:bg-accent-primary/10 transition-colors"
                    >
                      <span className="hidden sm:inline">관리자 부여</span>
                      <Icon name="add_moderator" size={15} className="sm:hidden" />
                    </button>
                  )}
                  {source === "cognito" && (
                    <>
                      <button
                        onClick={() => toggleEnabled(u)}
                        title={u.enabled ? "비활성화" : "활성화"}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-glass-bg-hover transition-colors"
                      >
                        <Icon name={u.enabled ? "block" : "check_circle"} size={16} />
                      </button>
                      <button
                        onClick={() => removeUser(u)}
                        title="회원 삭제"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-error hover:bg-error/10 transition-colors"
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-on-surface-variant mt-4">
        💡 관리자 권한이 없는 회원이 가입 전이라면, 가입 후 이 목록에 나타납니다.
      </p>
    </div>
  );
}
