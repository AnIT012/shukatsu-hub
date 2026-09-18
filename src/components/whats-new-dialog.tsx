"use client";

import {
  Sparkles,
  Palette,
  PanelRight,
  Download,
  Compass,
  Bell,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** 大規模改修完了のお知らせ。プッシュ通知(/?whatsnew=1)から開いたとき等に表示。 */
export function WhatsNewDialog({
  open,
  onClose,
  onStartTour,
}: {
  open: boolean;
  onClose: () => void;
  onStartTour: () => void;
}) {
  const items: { icon: LucideIcon; t: string; d: string }[] = [
    {
      icon: Palette,
      t: "画面をまるごと刷新",
      d: "紙とガラスの質感で、見やすく落ち着いた印象に。",
    },
    {
      icon: PanelRight,
      t: "設定がiPhoneらしく",
      d: "項目を開くと右からスッと。スワイプで戻れる。",
    },
    {
      icon: Download,
      t: "取り込みが強力に",
      d: "AIに整理してもらったJSONや、バックアップから一括登録。",
    },
    {
      icon: Compass,
      t: "よく使うサイト",
      d: "外資就活や各社マイページを、右上からワンタップで。",
    },
    {
      icon: Bell,
      t: "通知まわりも改善",
      d: "詳細ページや締切表示をより見やすく。",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="mt-2 text-lg font-semibold">
            就活Hub、新しくなりました
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            使いやすさをまるごと見直しました。おもな変更点はこちら。
          </p>
        </div>

        <div className="mt-3 space-y-3 text-left">
          {items.map((s) => (
            <div key={s.t} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-foreground">
                  {s.t}
                </div>
                <div className="text-[12px] leading-relaxed text-muted-foreground">
                  {s.d}
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogDescription className="sr-only">
          アプリ改修のお知らせ
        </DialogDescription>

        <div className="mt-5 space-y-2">
          <Button className="w-full" onClick={onClose}>
            さっそく使う
          </Button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartTour();
            }}
            className="w-full text-xs text-muted-foreground"
          >
            使い方を見る（1分ガイド）
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
