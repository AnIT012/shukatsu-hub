"use client";

import { useEffect, useState } from "react";
import { Sparkles, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LS_KEY } from "@/lib/constants";

const V2_FLAG = "shukatsu-dashboard:modelVersion";
const BACKUP_KEY = "shukatsu-dashboard:_backupBeforeV2";

/** 旧形式(steps はあるが stages が無い)データを持つキャッシュを探す */
function scanPreV2(): { raw: string } | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(LS_KEY)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const apps = Array.isArray(parsed) ? parsed : parsed?.applications;
      if (!Array.isArray(apps)) continue;
      const preV2 = apps.some(
        (a: any) =>
          Array.isArray(a?.steps) &&
          a.steps.length > 0 &&
          !(Array.isArray(a?.stages) && a.stages.length > 0),
      );
      if (preV2) return { raw };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * 選考フロー(段階＞タスク)への移行をユーザーに1回だけ通告する。
 * 旧データは steps として保持され続けるが、念のため移行前スナップショットも退避する。
 */
export function VersionNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(V2_FLAG) === "2") return;
      const hit = scanPreV2();
      if (hit) {
        // 移行前スナップショットを退避(初回のみ・100%戻せる保険)
        if (!localStorage.getItem(BACKUP_KEY)) {
          localStorage.setItem(BACKUP_KEY, hit.raw);
        }
        setOpen(true);
      } else {
        // 旧データなし(新規ユーザー等) → 以後は出さない
        localStorage.setItem(V2_FLAG, "2");
      }
    } catch {
      // ignore
    }
  }, []);

  const close = () => {
    try {
      localStorage.setItem(V2_FLAG, "2");
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
        <DialogTitle className="text-center text-base">
          選考管理がアップデートされました
        </DialogTitle>
        <DialogDescription className="text-center text-[13px] leading-relaxed">
          選考フローが「<span className="font-medium text-foreground">段階 ＞ タスク</span>
          」になりました。ES＋Webテストなど
          <span className="font-medium text-foreground">同時に進む選考</span>
          も登録でき、各段階で
          <span className="font-medium text-foreground">通過／不合格</span>
          を選ぶだけになりました。
        </DialogDescription>

        <div className="mt-1 space-y-2 rounded-lg bg-muted/60 p-3 text-[12.5px] leading-relaxed">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>
              これまでの進行状況・締切・メモ・リンクは
              <span className="font-medium">自動で引き継ぎ</span>
              ました（元データも保持しています）。
            </span>
          </div>
          <p className="text-muted-foreground">
            「完了」だったステップは「通過」として移しています。設計が変わったため、
            <span className="font-medium text-foreground">各社の状態を一度ご確認のうえ、必要なら修正</span>
            してください。
          </p>
        </div>

        <Button type="button" className="mt-1 w-full" onClick={close}>
          確認しました
        </Button>
      </DialogContent>
    </Dialog>
  );
}
