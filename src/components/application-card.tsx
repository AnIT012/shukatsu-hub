"use client";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  ListPlus,
  MinusCircle,
  XCircle,
} from "lucide-react";
import type { Application } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  PRIORITY_BADGE,
  RESULT_BADGE,
  RESULT_LABEL,
  STEP_KIND_ICON,
  STEP_KIND_LABEL,
} from "@/lib/constants";
import { getNextAction } from "@/lib/next-action";
import { formatDue, relativeLabel, urgencyOf, type Urgency } from "@/lib/date";

function urgencyStyles(u: Urgency) {
  switch (u) {
    case "overdue":
    case "soon":
      return {
        accent: "border-l-rose-500",
        box: "bg-rose-50/80 dark:bg-rose-950/30 ring-1 ring-rose-200/70 dark:ring-rose-900/40",
        due: "text-rose-600 dark:text-rose-400",
      };
    case "near":
      return {
        accent: "border-l-amber-500",
        box: "bg-amber-50/80 dark:bg-amber-950/30 ring-1 ring-amber-200/70 dark:ring-amber-900/40",
        due: "text-amber-600 dark:text-amber-400",
      };
    default:
      return {
        accent: "border-l-border",
        box: "bg-muted/50",
        due: "text-foreground/70",
      };
  }
}

export function ApplicationCard({
  app,
  onOpen,
}: {
  app: Application;
  onOpen: () => void;
}) {
  const next = getNextAction(app);
  const decided = app.result !== "in_progress";

  const u: Urgency =
    next.type === "step" && next.step?.dueAt
      ? urgencyOf(next.step.dueAt)
      : "none";
  const styles = urgencyStyles(u);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group cursor-pointer border-l-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5",
        decided ? "border-l-border" : styles.accent,
        (app.result === "rejected" || app.result === "declined") &&
          "opacity-70 hover:opacity-100",
      )}
    >
      {/* 上段: 企業名 / 職種 / バッジ */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-tight sm:text-lg">
            {app.company || "(名称未設定)"}
          </h3>
          {app.role && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {app.role}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              PRIORITY_BADGE[app.priority],
            )}
            title="優先度"
          >
            {{ high: "優先度 高", medium: "優先度 中", low: "優先度 低" }[
              app.priority
            ]}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              RESULT_BADGE[app.result],
            )}
          >
            {RESULT_LABEL[app.result]}
          </span>
        </div>
      </div>

      {/* 主役: 次のアクション */}
      <div className={cn("mt-3 rounded-lg px-3 py-2.5", styles.box)}>
        <NextActionBody app={app} next={next} dueClass={styles.due} />
      </div>
    </Card>
  );
}

function NextActionBody({
  app,
  next,
  dueClass,
}: {
  app: Application;
  next: ReturnType<typeof getNextAction>;
  dueClass: string;
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
        text: "残念ながら不合格",
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
      <div className={cn("flex items-center gap-2 font-medium", r.cls)}>
        <Icon className="h-5 w-5 shrink-0" />
        <span>{r.text}</span>
      </div>
    );
  }

  if (next.type === "waiting") {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="h-5 w-5 shrink-0" />
        <span className="font-medium">結果待ち</span>
        <span className="text-xs">（全ステップ完了）</span>
      </div>
    );
  }

  if (next.type === "empty") {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <ListPlus className="h-5 w-5 shrink-0" />
        <span className="text-sm">
          選考ステップ未登録 — クリックして追加
        </span>
      </div>
    );
  }

  // type === "step"
  const step = next.step!;
  const Icon = STEP_KIND_ICON[step.kind];
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/70 text-foreground/80 shadow-sm ring-1 ring-border/50">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <ArrowRight className="h-3 w-3" />
          次のアクション
          {step.status === "in_progress" && (
            <span className="rounded bg-amber-500/15 px-1.5 py-px text-[10px] font-medium normal-case text-amber-600 dark:text-amber-400">
              着手中
            </span>
          )}
        </div>
        <div className="truncate text-base font-bold leading-tight">
          {STEP_KIND_LABEL[step.kind]}
          {step.name && (
            <span className="ml-1.5 text-sm font-medium text-muted-foreground">
              {step.name}
            </span>
          )}
        </div>
        <div
          className={cn(
            "mt-0.5 flex items-center gap-1.5 text-sm font-medium",
            step.dueAt ? dueClass : "text-muted-foreground",
          )}
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          {step.dueAt ? (
            <span>
              {formatDue(step.dueAt)}
              <span className="mx-1 opacity-40">·</span>
              <span className="font-semibold">{relativeLabel(step.dueAt)}</span>
            </span>
          ) : (
            <span>締切未設定</span>
          )}
        </div>
      </div>
    </div>
  );
}
