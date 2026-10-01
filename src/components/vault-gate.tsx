"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";

const LATER_KEY = "shukatsu-dashboard:vault-later";

/**
 * 暗号化の鍵を開く/作る画面。
 *  locked … クラウドは暗号化済みで、この端末に鍵が無い。パスワードを入れるまで閉じられない
 *  setup  … クラウドがまだ平文。パスワードを入れると暗号化に切り替わる。「あとで」で閉じられる(その日のうちは出さない)
 */
export function VaultGate() {
  const { vaultState, unlockVault } = useStore();
  const { user, signOut } = useAuth();
  const [laterToday, setLaterToday] = useState(true);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLaterToday(localStorage.getItem(LATER_KEY) === new Date().toDateString());
    } catch {
      setLaterToday(false);
    }
  }, [vaultState]);

  const locked = vaultState === "locked";
  const open = locked || (vaultState === "setup" && !laterToday);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true);
    setErr(null);
    const ok = await unlockVault(pw);
    setBusy(false);
    if (ok) {
      setPw("");
    } else {
      setErr("パスワードが違います。ログインに使っているパスワードを入れてください。");
    }
  };

  const later = () => {
    try {
      localStorage.setItem(LATER_KEY, new Date().toDateString());
    } catch {
      // ignore
    }
    setLaterToday(true);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !locked && later()}>
      <DialogContent
        className="max-w-sm gap-3.5 p-5 [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => locked && e.preventDefault()}
      >
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary">
          {locked ? <Lock className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
        </div>
        <DialogTitle className="text-center text-[17px]">
          {locked ? "パスワードを入れてください" : "ESと選考を暗号化します"}
        </DialogTitle>
        <DialogDescription className="text-center text-[13px] leading-relaxed">
          {locked
            ? "ESや選考は暗号化して保存しています。この端末で開くには、ログインのパスワードで鍵を開きます。"
            : "ログインのパスワードをもう一度入れると、ESや選考の中身を暗号化して保存します。開発者にも読めなくなります。"}
        </DialogDescription>

        <form onSubmit={submit} className="space-y-2.5">
          {/* パスワード管理(キーチェーン等)が埋められるように、ユーザー名も渡す */}
          <input
            type="email"
            autoComplete="username"
            value={user?.email ?? ""}
            readOnly
            hidden
          />
          <Input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              setErr(null);
            }}
            placeholder="パスワード"
            aria-label="パスワード"
            className="h-11"
          />
          {err && <p className="text-[12.5px] leading-relaxed text-danger">{err}</p>}
          <Button type="submit" className="h-11 w-full text-[15px]" disabled={!pw || busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {locked ? "開く" : "暗号化する"}
          </Button>
        </form>

        <p className="text-center text-[11.5px] leading-relaxed text-muted-foreground">
          パスワードを忘れると、暗号化した中身は誰にも戻せません。
          この端末には毎日の自動バックアップが30日分残ります。
        </p>

        {/* DialogContent 直下の button は閉じる×と一緒に隠れるので、div で包む */}
        <div className="flex justify-center">
          {locked ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="text-[12.5px] font-medium text-muted-foreground underline underline-offset-4"
            >
              別のアカウントでログインする
            </button>
          ) : (
            <button
              type="button"
              onClick={later}
              className="px-3 py-1 text-[13px] font-medium text-muted-foreground"
            >
              あとで
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
