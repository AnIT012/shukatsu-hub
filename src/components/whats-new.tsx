"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LATEST_CHANGELOG } from "@/lib/changelog";
import { cn } from "@/lib/utils";

const NEWS_KEY = "shukatsu-dashboard:newsSeen";
// 最新の更新日。これと既読版が違えば全ユーザーに1回だけ表示される。
const NEWS_VERSION = LATEST_CHANGELOG.date;

/**
 * この端末で初めて同意した人(新規・審査用アカウントを初めて開いた人)には、
 * 「更新のお知らせ」を続けて出さない。前の版を見たことがある人(既読の記録がある)はそのまま出す。
 */
export function skipNewsForFirstVisit() {
  try {
    if (localStorage.getItem(NEWS_KEY) === null) {
      localStorage.setItem(NEWS_KEY, NEWS_VERSION);
    }
  } catch {
    // ignore
  }
}

function dateLabel(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return m && d ? `${m}月${d}日` : ymd;
}

/** 既存ユーザーに「更新のお知らせ」を版ごとに1回だけ表示する。 */
export function WhatsNew({
  enabled,
  onOpenLegal,
  onVisibleChange,
}: {
  enabled: boolean;
  /** 出ている間は true。閉じた後は少し待ってから false(次のお知らせと同じ瞬間に開閉させない) */
  onVisibleChange?: (open: boolean) => void;
  /** 添え書きの「詳しく」からプライバシーの全文を開く */
  onOpenLegal?: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let seen = true;
    try {
      seen = localStorage.getItem(NEWS_KEY) === NEWS_VERSION;
    } catch {
      // ignore
    }
    if (seen) return;
    // 前の画面(同意・鍵)が閉じた直後は、少し間を置いて開く(同じ瞬間に開閉させない)
    onVisibleChange?.(true);
    const t = window.setTimeout(() => setOpen(true), 450);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const close = () => {
    try {
      localStorage.setItem(NEWS_KEY, NEWS_VERSION);
    } catch {
      // ignore
    }
    setOpen(false);
    window.setTimeout(() => onVisibleChange?.(false), 450);
  };

  const note = LATEST_CHANGELOG.note;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-sm gap-3.5 overflow-y-auto p-5">
        <div className="text-center">
          <DialogTitle className="text-[17px]">更新のお知らせ</DialogTitle>
          <DialogDescription className="mt-0.5 text-[12.5px]">
            {dateLabel(LATEST_CHANGELOG.date)}
          </DialogDescription>
        </div>

        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
          {LATEST_CHANGELOG.items.map((it, i) => (
            <div
              key={it.title}
              className={cn(
                "relative flex gap-3 px-3.5 py-2.5",
                i > 0 &&
                  "before:absolute before:left-[50px] before:right-0 before:top-0 before:h-px before:bg-border",
              )}
            >
              <it.icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold leading-snug">{it.title}</div>
                <div className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                  {it.body}
                </div>
              </div>
            </div>
          ))}
        </div>

        {note && (
          <div className="flex gap-2.5 rounded-xl bg-accent/60 px-3.5 py-3">
            <ShieldCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary" />
            <div className="min-w-0 text-[12px] leading-relaxed text-muted-foreground">
              <div className="text-[13px] font-semibold text-foreground">{note.title}</div>
              {note.body}
              {onOpenLegal && (
                <button
                  type="button"
                  onClick={onOpenLegal}
                  className="ml-1 font-medium text-primary underline-offset-2 hover:underline"
                >
                  詳しく
                </button>
              )}
            </div>
          </div>
        )}

        <Button type="button" className="h-11 w-full text-[15px]" onClick={close}>
          確認しました
        </Button>
      </DialogContent>
    </Dialog>
  );
}
