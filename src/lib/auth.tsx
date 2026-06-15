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
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const MODE: AuthMode = isSupabaseConfigured ? "cloud" : "local";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ローカルモードでは認証待ちが無いので最初から ready。
  const [ready, setReady] = useState(MODE === "local");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (MODE === "local" || !supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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
    <AuthContext.Provider value={{ ready, mode: MODE, user, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth は AuthProvider の中で使ってください");
  return ctx;
}
