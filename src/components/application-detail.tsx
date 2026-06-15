"use client";

import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link2,
  ListChecks,
  ListPlus,
  MinusCircle,
  Plus,
  StickyNote,
  Target,
  Trash2,
  XCircle,
} from "lucide-react";
import type { Application } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepTimeline } from "@/components/step-timeline";
import {
  PRIORITY_OPTIONS,
  RESULT_LABEL,
  RESULT_OPTIONS,
  STEP_KIND_LABEL,
} from "@/lib/constants";
import { getNextAction } from "@/lib/next-action";
import { formatDue, formatStamp, relativeLabel, urgencyOf } from "@/lib/date";
import { cn } from "@/lib/utils";

export function ApplicationDetail({
  appId,
  onOpenChange,
  onDeleted,
}: {
  appId: string | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (name: string) => void;
}) {
  const { applications } = useStore();
  const app = applications.find((a) => a.id === appId) ?? null;

  return (
    <Sheet
      open={!!appId}
      onOpenChange={(o) => {
        if (!o) onOpenChange(false);
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 scrollbar-thin sm:max-w-xl"
      >
        {app ? (
          <DetailBody app={app} onDeleted={onDeleted} />
        ) : (
          <SheetTitle className="sr-only">企業詳細</SheetTitle>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailBody({
  app,
  onDeleted,
}: {
  app: Application;
  onDeleted: (name: string) => void;
}) {
  const {
    updateApplication,
    deleteApplication,
    addLink,
    updateLink,
    deleteLink,
  } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const next = getNextAction(app);

  return (
    <>
      {/* ヘッダー(固定) */}
      <div className="sticky top-0 z-10 border-b bg-background/95 px-5 pb-4 pt-5 backdrop-blur">
        <SheetTitle className="sr-only">
          {app.company || "名称未設定"} の詳細
        </SheetTitle>
        <Input
          value={app.company}
          onChange={(e) => updateApplication(app.id, { company: e.target.value })}
          placeholder="企業名"
          className="h-auto rounded-md border-0 bg-transparent px-1 text-xl font-bold shadow-none hover:bg-muted/50 focus-visible:ring-1"
        />
        <Input
          value={app.role}
          onChange={(e) => updateApplication(app.id, { role: e.target.value })}
          placeholder="職種 / コース名"
          className="mt-0.5 h-auto rounded-md border-0 bg-transparent px-1 text-sm text-muted-foreground shadow-none hover:bg-muted/50 focus-visible:ring-1"
        />

        <div className="mt-3 grid grid-cols-2 gap-2 pr-8">
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">
              優先度
            </label>
            <Select
              value={app.priority}
              onValueChange={(v) =>
                updateApplication(app.id, { priority: v as any })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    優先度 {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">
              結果ステータス
            </label>
            <Select
              value={app.result}
              onValueChange={(v) =>
                updateApplication(app.id, { result: v as any })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESULT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 次のアクション バナー */}
      <div className="px-5 pt-4">
        <NextActionBanner app={app} next={next} />
      </div>

      {/* ステップ */}
      <section className="px-5 py-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          選考ステップ
        </h3>
        <StepTimeline app={app} />
      </section>

      {/* 関連リンク */}
      <section className="border-t px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            関連リンク
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => addLink(app.id)}
          >
            <Plus className="h-4 w-4" />
            追加
          </Button>
        </div>
        {app.links.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            マイページ・選考案内などのURLを登録できます。
          </p>
        ) : (
          <div className="space-y-2">
            {app.links.map((link) => (
              <div key={link.id} className="flex items-center gap-2">
                <Input
                  value={link.label}
                  onChange={(e) =>
                    updateLink(app.id, link.id, { label: e.target.value })
                  }
                  placeholder="ラベル"
                  className="h-9 w-[34%]"
                />
                <Input
                  value={link.url}
                  onChange={(e) =>
                    updateLink(app.id, link.id, { url: e.target.value })
                  }
                  placeholder="https://..."
                  className="h-9 flex-1"
                />
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 shrink-0",
                    !link.url && "pointer-events-none opacity-40",
                  )}
                  title="開く"
                >
                  <a
                    href={link.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteLink(app.id, link.id)}
                  title="削除"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 全体メモ */}
      <section className="border-t px-5 py-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          全体メモ
        </h3>
        <Textarea
          value={app.memo}
          onChange={(e) => updateApplication(app.id, { memo: e.target.value })}
          placeholder="志望動機メモ、面接の振り返り、人事の名前、待遇など自由に。改行もそのまま保存されます。"
          className="min-h-[120px] resize-y leading-relaxed"
        />
      </section>

      {/* フッター: タイムスタンプ + 削除 */}
      <section className="mt-auto border-t px-5 py-4">
        <div className="mb-3 text-[11px] text-muted-foreground">
          作成: {formatStamp(app.createdAt)} / 更新: {formatStamp(app.updatedAt)}
        </div>
        {confirmDelete ? (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <span className="flex-1 text-sm">この企業を削除しますか？</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                const name = app.company || "名称未設定";
                deleteApplication(app.id);
                onDeleted(name);
              }}
            >
              削除する
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
            この企業を削除
          </Button>
        )}
      </section>
    </>
  );
}

function NextActionBanner({
  app,
  next,
}: {
  app: Application;
  next: ReturnType<typeof getNextAction>;
}) {
  if (next.type === "result") {
    const map = {
      passed: {
        icon: CheckCircle2,
        text: "合格・通過",
        cls: "text-emerald-600 dark:text-emerald-400",
      },
      rejected: {
        icon: XCircle,
        text: "不合格",
        cls: "text-rose-600 dark:text-rose-400",
      },
      declined: {
        icon: MinusCircle,
        text: "辞退済み",
        cls: "text-muted-foreground",
      },
      in_progress: { icon: Clock, text: "", cls: "" },
    } as const;
    const r = map[app.result];
    const Icon = r.icon;
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-4 py-3">
        <Icon className={cn("h-5 w-5", r.cls)} />
        <span className={cn("font-semibold", r.cls)}>
          {RESULT_LABEL[app.result]}
        </span>
      </div>
    );
  }

  if (next.type !== "step") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-4 py-3 text-muted-foreground">
        {next.type === "waiting" ? (
          <>
            <Clock className="h-5 w-5" />
            <span className="font-medium">結果待ち（全ステップ完了）</span>
          </>
        ) : (
          <>
            <ListPlus className="h-5 w-5" />
            <span className="text-sm">
              下の「ステップを追加」から選考の流れを登録しよう
            </span>
          </>
        )}
      </div>
    );
  }

  const step = next.step!;
  const u = step.dueAt ? urgencyOf(step.dueAt) : "none";
  const tone =
    u === "overdue" || u === "soon"
      ? "bg-rose-50 ring-rose-200/70 dark:bg-rose-950/30 dark:ring-rose-900/40"
      : u === "near"
        ? "bg-amber-50 ring-amber-200/70 dark:bg-amber-950/30 dark:ring-amber-900/40"
        : "bg-primary/5 ring-primary/15";
  const dueCls =
    u === "overdue" || u === "soon"
      ? "text-rose-600 dark:text-rose-400"
      : u === "near"
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground/70";

  return (
    <div className={cn("rounded-xl px-4 py-3 ring-1", tone)}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Target className="h-3.5 w-3.5" />
        次にやること
      </div>
      <div className="mt-0.5 text-lg font-bold leading-tight">
        {STEP_KIND_LABEL[step.kind]}
        {step.name && (
          <span className="ml-1.5 text-sm font-medium text-muted-foreground">
            {step.name}
          </span>
        )}
      </div>
      <div
        className={cn(
          "mt-1 flex items-center gap-1.5 text-sm font-medium",
          step.dueAt ? dueCls : "text-muted-foreground",
        )}
      >
        {step.dueAt ? (
          <>
            <CalendarDays className="h-4 w-4" />
            {formatDue(step.dueAt)}
            <ArrowRight className="h-3 w-3 opacity-40" />
            <span className="font-bold">{relativeLabel(step.dueAt)}</span>
          </>
        ) : (
          <>
            <CalendarDays className="h-4 w-4" />
            締切未設定
          </>
        )}
      </div>
    </div>
  );
}
