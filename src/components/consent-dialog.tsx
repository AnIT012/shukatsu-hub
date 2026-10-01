"use client";

import { Bell, Check, ChevronRight, History, KeyRound, ShieldCheck, Smartphone, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 「誰が読めるか」に1枚で答える。ここに書くことは legal-content(全文)と食い違わせない。
// 通知用に平文で置く項目を増やしたら、lib/vault.ts の buildNotifyFeed と一緒にここも直す。
const WHO = [
  { who: "あなた", mark: "すべて", tone: "yes", note: "" },
  { who: "ほかの利用者", mark: "読めません", tone: "no", note: "利用者ごとに分けて保存しています" },
  { who: "開発者", mark: "読めません", tone: "no", note: "暗号化しているので、保存先を開いても読めません" },
  { who: "通知のプログラム", mark: "企業名と日時だけ", tone: "part", note: "通知をオンにした時だけ" },
] as const;

const NOTES = [
  { icon: KeyRound, strong: "パスワードは保存しません。", rest: "各社マイページは IDだけを保存できます。" },
  { icon: History, strong: "毎日、この端末にバックアップ。", rest: "30日分残ります。" },
  { icon: Smartphone, strong: "登録しなければ、端末の中だけ。", rest: "入れた内容を外へ送りません。" },
];

/** 初めて使う時の同意。閉じられない(同意して始める だけ)。全文は別のシートで読める */
export function ConsentDialog({
  open,
  onAgree,
  onOpenFull,
}: {
  open: boolean;
  onAgree: () => void;
  onOpenFull: () => void;
}) {
  return (
    <Dialog open={open}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] max-w-sm gap-3.5 overflow-y-auto p-5 [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <DialogTitle className="mt-3 text-[17px]">ご利用の前に</DialogTitle>
          <DialogDescription className="mt-1 text-[13px] leading-relaxed">
            入れたESや選考の中身を、誰が読めるかを明記しています。
          </DialogDescription>
        </div>

        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
          {WHO.map((r, i) => (
            <div
              key={r.who}
              className={cn(
                "relative flex items-center gap-3 px-3.5 py-2.5",
                i > 0 &&
                  "before:absolute before:left-3.5 before:right-0 before:top-0 before:h-px before:bg-border",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">{r.who}</div>
                {r.note && (
                  <div className="text-[11.5px] leading-snug text-muted-foreground">{r.note}</div>
                )}
              </div>
              {/* 押せない印なので塗らない(色つきの字だけ) */}
              <span
                className={cn(
                  "flex shrink-0 items-center gap-1 text-[12.5px] font-semibold",
                  r.tone === "yes" && "text-primary",
                  r.tone === "no" && "text-success",
                  r.tone === "part" && "text-warning",
                )}
              >
                {r.tone === "yes" && <Check className="h-3.5 w-3.5" />}
                {r.tone === "no" && <X className="h-3.5 w-3.5" />}
                {r.tone === "part" && <Bell className="h-3.5 w-3.5" />}
                {r.mark}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-2 rounded-xl bg-card px-3.5 py-3 ring-1 ring-border">
          {NOTES.map((n) => (
            <div key={n.strong} className="flex gap-2.5">
              <n.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="text-[12.5px] leading-relaxed">
                <span className="font-semibold">{n.strong}</span>
                <span className="text-muted-foreground">{n.rest}</span>
              </div>
            </div>
          ))}
        </div>

        {/* DialogContent 直下の button は閉じる×と一緒に隠れるので、div で包む */}
        <div className="space-y-3.5">
          <button
            type="button"
            onClick={onOpenFull}
            className="mx-auto flex items-center gap-0.5 text-[12.5px] font-medium text-primary"
          >
            プライバシーポリシーと利用規約の全文
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <Button className="h-11 w-full text-[15px]" onClick={onAgree}>
            同意して始める
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
