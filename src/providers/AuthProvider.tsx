"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getAuthUser,
  getSession,
  type CognitoAuthUser,
} from "@/lib/aws/cognito";

interface AuthContextType {
  user: CognitoAuthUser | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CognitoAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    const session = await getSession();
    if (session) {
      const authUser = await getAuthUser();
      setUser(authUser);
      // JWT를 쿠키에 저장 (미들웨어에서 사용)
      document.cookie = `cognitoIdToken=${session
        .getIdToken()
        .getJwtToken()}; path=/; max-age=3600; SameSite=Lax`;
      // 로그인한 유저를 서버 app_users에 동기화 (관리자 유저관리용)
      fetch("/api/me/sync", { method: "POST" }).catch(() => {});
    } else {
      setUser(null);
      document.cookie =
        "cognitoIdToken=; path=/; max-age=0; SameSite=Lax";
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
