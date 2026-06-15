"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  ListPlus,
  Trash2,
} from "lucide-react";
import type { Application, StepStatus } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  STEP_KIND_ICON,
  STEP_KIND_OPTIONS,
  STEP_STATUS_DOT,
  STEP_STATUS_LABEL,
} from "@/lib/constants";
import { getNextActionStep } from "@/lib/next-action";
import {
  joinDue,
  relativeLabel,
  splitDue,
  urgencyOf,
  type Urgency,
} from "@/lib/date";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_ORDER: StepStatus[] = ["not_started", "in_progress", "done"];

function dueTextClass(u: Urgency): string {
  switch (u) {
    case "overdue":
    case "soon":
      return "text-rose-600 dark:text-rose-400";
    case "near":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-muted-foreground";
  }
}

export function StepTimeline({ app }: { app: Application }) {
  const { addStep, updateStep, deleteStep, moveStep } = useStore();
  const nextId = getNextActionStep(app)?.id;

  return (
    <div>
      {app.steps.length === 0 ? (
        <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
          まだステップがありません。
          <br />
          エントリー→ES→Webテスト→面接… のように追加しよう。
        </p>
      ) : (
        <div className="relative">
          {app.steps.map((step, i) => {
            const Icon = STEP_KIND_ICON[step.kind];
            const { date, time } = splitDue(step.dueAt);
            const isNext = step.id === nextId;
            const u: Urgency =
              step.status !== "done" && step.dueAt
                ? urgencyOf(step.dueAt)
                : "none";
            const cycle = () =>
              updateStep(app.id, step.id, {
                status:
                  STATUS_ORDER[
                    (STATUS_ORDER.indexOf(step.status) + 1) % STATUS_ORDER.length
                  ],
              });

            return (
              <div key={step.id} className="relative flex gap-3 pb-3">
                {/* 縦のコネクタ線 */}
                {i < app.steps.length - 1 && (
                  <span className="absolute left-[13px] top-8 h-[calc(100%-2rem)] w-px bg-border" />
                )}

                {/* 状態ドット(ワンタップで 未着手→進行中→完了) */}
                <button
                  type="button"
                  onClick={cycle}
                  title={`状態: ${STEP_STATUS_LABEL[step.status]}（クリックで切替）`}
                  className={cn(
                    "z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110",
                    STEP_STATUS_DOT[step.status],
                  )}
                >
                  {step.status === "done" && <Check className="h-4 w-4" />}
                  {step.status === "in_progress" && (
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                  )}
                </button>

                {/* 本体カード */}
                <div
                  className={cn(
                    "flex-1 rounded-lg border bg-card p-3 shadow-sm transition-colors",
                    isNext && "ring-2 ring-primary/40",
                    step.status === "done" && "opacity-70",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Select
                      value={step.kind}
                      onValueChange={(v) =>
                        updateStep(app.id, step.id, { kind: v as any })
                      }
                    >
                      <SelectTrigger className="h-8 flex-1 border-0 bg-transparent px-1 text-sm font-semibold shadow-none focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STEP_KIND_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {isNext && (
                      <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                        次にやる
                      </span>
                    )}

                    <div className="flex shrink-0 items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={i === 0}
                        onClick={() => moveStep(app.id, step.id, -1)}
                        title="上へ"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={i === app.steps.length - 1}
                        onClick={() => moveStep(app.id, step.id, 1)}
                        title="下へ"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteStep(app.id, step.id)}
                        title="削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Input
                    value={step.name}
                    onChange={(e) =>
                      updateStep(app.id, step.id, { name: e.target.value })
                    }
                    placeholder="補足名(任意) 例: 一次面接(オンライン)"
                    className="mt-2 h-9"
                  />

                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] text-muted-foreground">
                        締切 / 実施日
                      </label>
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) =>
                          updateStep(app.id, step.id, {
                            dueAt: joinDue(e.target.value, time),
                          })
                        }
                        className="h-9 w-[160px]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-muted-foreground">
                        時刻(任意)
                      </label>
                      <Input
                        type="time"
                        value={time}
                        disabled={!date}
                        onChange={(e) =>
                          updateStep(app.id, step.id, {
                            dueAt: joinDue(date, e.target.value),
                          })
                        }
                        className="h-9 w-[110px]"
                      />
                    </div>
                    {step.dueAt && step.status !== "done" && (
                      <span
                        className={cn(
                          "pb-2 text-xs font-semibold",
                          dueTextClass(u),
                        )}
                      >
                        {relativeLabel(step.dueAt)}
                      </span>
                    )}
                  </div>

                  <Textarea
                    value={step.memo}
                    onChange={(e) =>
                      updateStep(app.id, step.id, { memo: e.target.value })
                    }
                    placeholder="このステップのメモ（例: 玉手箱形式 / GDは6人・30分）"
                    className="mt-2 min-h-[44px] resize-y text-sm"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="mt-1 w-full border-dashed"
        onClick={() => addStep(app.id)}
      >
        <ListPlus className="h-4 w-4" />
        ステップを追加
      </Button>
    </div>
  );
}
