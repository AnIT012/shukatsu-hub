"use client";

import { useEffect, useState } from "react";
import { Bell, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const NEWS_KEY = "shukatsu-dashboard:newsSeen";
// 内容を更新したらこの版番号を変えると、全ユーザーに再度1回だけ表示される。
const NEWS_VERSION = "2026-06-20";

const ITEMS = [
  {
    icon: KeyRound,
    title: "企業ごとにログインID・会員番号を保存",
    body: "ピン留めすれば一覧からワンタップでコピー。「••••」で隠して表示もできます。",
  },
  {
    icon: Bell,
    title: "アプリアイコンに件数バッジ ＋ 通知の改善",
    body: "直近の予定数をアイコンに表示。毎朝のまとめ／前日・〇日前のリマインドも選べます。",
  },
  {
    icon: ShieldCheck,
    title: "プライバシーの説明を明確化",
    body: "あなたのデータは本人だけがアクセス可能。開発者は閲覧せず、パスワードは保存しません。",
  },
];

/** 既存ユーザーに「更新のお知らせ」を版ごとに1回だけ表示する。 */
export function WhatsNew({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    try {
      if (localStorage.getItem(NEWS_KEY) === NEWS_VERSION) return;
      setOpen(true);
    } catch {
      // ignore
    }
  }, [enabled]);

  const close = () => {
    try {
      localStorage.setItem(NEWS_KEY, NEWS_VERSION);
    } catch {
      // ignore
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-sm">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <DialogTitle className="text-center text-base">更新のお知らせ</DialogTitle>
        <DialogDescription className="text-center text-[13px] leading-relaxed">
          就活Hubがいくつかアップデートされました。
        </DialogDescription>

        <div className="mt-1 space-y-2.5">
          {ITEMS.map((it) => (
            <div
              key={it.title}
              className="flex items-start gap-2.5 rounded-lg bg-muted/60 p-3"
            >
              <it.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <div className="text-[13px] font-medium">{it.title}</div>
                <div className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                  {it.body}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" className="mt-1 w-full" onClick={close}>
          確認しました
        </Button>
      </DialogContent>
    </Dialog>
  );
}
