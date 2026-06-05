"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import {
  signIn as cognitoSignIn,
  signUp as cognitoSignUp,
  signOut as cognitoSignOut,
} from "@/lib/aws/cognito";

export function useAuth() {
  const { user, isLoading, refreshUser } = useAuthContext();
  const router = useRouter();
  const { toast } = useToast();

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        await cognitoSignIn(email, password);
        await refreshUser();
        toast("Welcome back!", "success");
        // Hard navigation so the middleware re-evaluates with the fresh
        // auth cookie (router.push can use a stale prefetch that was
        // redirected back to /login before login).
        window.location.assign("/library");
        return true;
      } catch (err: any) {
        toast(err.message || "Login failed", "error");
        return false;
      }
    },
    [router, toast, refreshUser]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      try {
        await cognitoSignUp(email, password);
        toast("Check your email to confirm your account!", "success");
        router.push(`/confirm?email=${encodeURIComponent(email)}`);
        return true;
      } catch (err: any) {
        toast(err.message || "Sign up failed", "error");
        return false;
      }
    },
    [router, toast]
  );

  const signOut = useCallback(async () => {
    cognitoSignOut();
    document.cookie =
      "cognitoIdToken=; path=/; max-age=0; SameSite=Lax";
    router.push("/");
  }, [router]);

  return { user, session: null, isLoading, signIn, signUp, signOut };
}
