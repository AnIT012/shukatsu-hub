"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";

export type AuthMode = "local" | "cloud";

interface AuthValue {
  ready: boolean;
  mode: AuthMode;
  user: User | null;
  /** 登録せず端末内だけで使う(ゲスト) */
  continueAsGuest: () => void;
  /** ゲストをやめてログイン画面へ(登録/ログインで同期) */
  exitGuest: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const CONFIGURED = isSupabaseConfigured;
const LS_GUEST_KEY = "shukatsu-dashboard:guest";

function hasGuestFlag(): boolean {
  try {
    return !!localStorage.getItem(LS_GUEST_KEY);
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Supabase 未設定 or ゲスト選択中は local。それ以外は cloud(セッション確認待ち)。
  const initialMode: AuthMode =
    !CONFIGURED || hasGuestFlag() ? "local" : "cloud";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  // local(=待ち無し)なら即 ready。cloud はセッション確認後に ready。
  const [ready, setReady] = useState(initialMode === "local");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!CONFIGURED || !supabase) {
      setReady(true);
      return;
    }
    let active = true;
    const applyUser = (u: User | null) => {
      setUser(u);
      if (u) {
        // ログイン済みならゲスト解除してクラウドへ
        setMode("cloud");
        try {
          localStorage.removeItem(LS_GUEST_KEY);
        } catch {
          // ignore
        }
      }
    };
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      applyUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const continueAsGuest = () => {
    try {
      localStorage.setItem(LS_GUEST_KEY, "1");
    } catch {
      // ignore
    }
    setMode("local");
    setReady(true);
  };

  const exitGuest = () => {
    try {
      localStorage.removeItem(LS_GUEST_KEY);
    } catch {
      // ignore
    }
    setMode("cloud");
  };

  const signIn: AuthValue["signIn"] = async (email, password) => {
    if (!supabase) return { error: "Supabase が未設定です" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp: AuthValue["signUp"] = async (email, password) => {
    if (!supabase) return { error: "Supabase が未設定です" };
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        ready,
        mode,
        user,
        continueAsGuest,
        exitGuest,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth は AuthProvider の中で使ってください");
  return ctx;
}
