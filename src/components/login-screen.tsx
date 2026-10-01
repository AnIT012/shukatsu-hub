"use client";

import { useEffect, useState } from "react";
import { Bell, ChevronDown, ListChecks, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { Collapse } from "@/components/list-group";
import { launchReady } from "@/components/launch-screen";
import { cn } from "@/lib/utils";

// 起動の膜と同じ地・同じマークで始める。膜が開くと、そのまま同じ絵の上にログインが並んでいる。
const POINTS = [
  { icon: ListChecks, title: "次にやることが一番上に", body: "締切の近い順に、今日やることから並びます。" },
  { icon: Bell, title: "締切を通知でお知らせ", body: "毎朝、または締切の数日前に届きます。" },
  { icon: Lock, title: "ESや選考は暗号化して保存", body: "開発者にも読めない形で保存します。" },
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

  // ログイン画面が出せる状態になったら、起動の膜を退かせる
  useEffect(() => {
    launchReady();
  }, []);

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
      setNotice("登録しました。自動でログインされない場合は、もう一度ログインしてください。");
    }
  };

  return (
    // body は fixed なので、この箱が画面の高さを持って中でスクロールする(フォームを開くと縦に伸びる)
    <div
      className="h-[100dvh] overflow-y-auto overscroll-none"
      style={{
        // 起動の膜(.launch)と同じ地。継ぎ目なく続く
        background:
          "radial-gradient(60% 40% at 50% 28%, hsl(var(--primary) / 0.1), transparent 70%), hsl(var(--card))",
      }}
    >
      <div className="flex min-h-full items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <BrandMark size={76} />
          <h1 className="mt-4 text-[26px] font-bold leading-tight text-foreground">就活Hub</h1>
          <p className="mt-1.5 text-[13.5px] text-muted-foreground">
            就活の「次にやること」が、毎朝ひと目で。
          </p>
        </div>

        <div className="mt-7 overflow-hidden rounded-2xl bg-card ring-1 ring-border elevate-sm">
          {POINTS.map((p, i) => (
            <div
              key={p.title}
              className={cn(
                "relative flex items-center gap-3 px-4 py-3",
                i > 0 &&
                  "before:absolute before:left-[60px] before:right-0 before:top-0 before:h-px before:bg-border",
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <p.icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-foreground">{p.title}</div>
                <div className="text-[12px] leading-relaxed text-muted-foreground">{p.body}</div>
              </div>
            </div>
          ))}
        </div>

        <Button
          className="mt-6 h-12 w-full rounded-full text-[15px] shadow-[0_8px_22px_hsl(var(--primary)/0.28)]"
          onClick={continueAsGuest}
        >
          まずは試す（登録不要）
        </Button>
        <p className="mt-2 text-center text-[11.5px] text-muted-foreground">
          あとで登録すれば、データはそのまま引き継がれます。
        </p>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
          className="mx-auto mt-5 flex items-center gap-1 rounded-full px-3 py-1.5 text-[13.5px] font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
        >
          メールで登録 / ログイン
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-[280ms] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none",
              showForm && "rotate-180",
            )}
          />
        </button>

        <Collapse open={showForm} className="-mx-1 px-1 pb-1 pt-3">
          <form
            onSubmit={submit}
            className="space-y-3.5 rounded-2xl bg-card p-4 ring-1 ring-border elevate-sm"
          >
            {/* ログインと新規登録の切り替え(どちらの画面にいるかを先に見せる) */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => {
                    setMode(m);
                    setError(null);
                    setNotice(null);
                  }}
                  className={cn(
                    "rounded-lg py-1.5 text-[13px] font-medium transition-colors",
                    mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {m === "login" ? "ログイン" : "新規登録"}
                </button>
              ))}
            </div>
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
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上"
                className="h-11"
              />
              {mode === "signup" && (
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                  ESや選考は、このパスワードから作る鍵で暗号化します。忘れると中身は戻せません。
                </p>
              )}
            </div>
            {error && <p className="text-[13px] leading-relaxed text-danger">{error}</p>}
            {notice && <p className="text-[13px] leading-relaxed text-success">{notice}</p>}
            <Button type="submit" className="h-11 w-full text-[15px]" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "ログイン" : "登録する"}
            </Button>
          </form>
        </Collapse>
      </div>
      </div>
    </div>
  );
}
