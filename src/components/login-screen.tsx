"use client";

import { useState } from "react";
import {
  Bell,
  CalendarDays,
  GraduationCap,
  ListChecks,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const POINTS = [
  { icon: ListChecks, text: "次にやること・締切が自動でトップに" },
  { icon: Bell, text: "締切・予定をプッシュ通知でリマインド" },
  { icon: CalendarDays, text: "選考も説明会・イベントもまとめて管理" },
];

export function LoginScreen() {
  const { signIn, signUp, continueAsGuest } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    const fn = mode === "login" ? signIn : signUp;
    const { error } = await fn(email.trim(), password);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    if (mode === "signup") {
      setNotice(
        "登録しました。自動でログインされない場合は、もう一度ログインしてください。",
      );
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-primary p-3 text-primary-foreground">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-xl font-bold">就活Hub</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            就活の「次にやること」が、毎朝ひと目で。
          </p>
        </div>

        <div className="my-6 space-y-3">
          {POINTS.map((p) => (
            <div key={p.text} className="flex items-center gap-2.5 text-[13px]">
              <p.icon className="h-[19px] w-[19px] shrink-0 text-primary" />
              <span>{p.text}</span>
            </div>
          ))}
        </div>

        <Button className="w-full" onClick={continueAsGuest}>
          まずは試す（登録不要）
        </Button>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          あとで登録すればデータはそのまま引き継がれます
        </p>

        {!showForm ? (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="text-sm font-medium text-foreground underline underline-offset-4"
            >
              メールで登録 / ログイン
            </button>
          </div>
        ) : (
          <>
            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] text-muted-foreground">または</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <form
              onSubmit={submit}
              className="space-y-3 rounded-2xl border bg-card p-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6文字以上"
                />
              </div>
              {error && (
                <p className="text-sm text-rose-600 dark:text-rose-400">
                  {error}
                </p>
              )}
              {notice && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  {notice}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "login" ? "ログイン" : "新規登録"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {mode === "login" ? "アカウントがない？ " : "すでに登録済み？ "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "login" ? "signup" : "login");
                    setError(null);
                    setNotice(null);
                  }}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  {mode === "login" ? "新規登録" : "ログイン"}
                </button>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
