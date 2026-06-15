"use client";

import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  total: number;
  inProgress: number;
  passed: number;
  thisWeekTasks: number;
  thisWeekActive: boolean;
  onToggleThisWeek: () => void;
}

export function SummaryBar({
  total,
  inProgress,
  passed,
  thisWeekTasks,
  thisWeekActive,
  onToggleThisWeek,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        icon={<Briefcase className="h-5 w-5" />}
        value={total}
        label="応募総数"
        tint="text-slate-600 dark:text-slate-300 bg-slate-500/10"
      />
      <Stat
        icon={<TrendingUp className="h-5 w-5" />}
        value={inProgress}
        label="進行中"
        tint="text-blue-600 dark:text-blue-400 bg-blue-500/10"
      />
      <Stat
        icon={<CheckCircle2 className="h-5 w-5" />}
        value={passed}
        label="合格・通過"
        tint="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
      />
      <Stat
        icon={<CalendarClock className="h-5 w-5" />}
        value={thisWeekTasks}
        label="今週のタスク"
        sub="今週締切・期限切れ"
        tint={
          thisWeekTasks > 0
            ? "text-rose-600 dark:text-rose-400 bg-rose-500/10"
            : "text-muted-foreground bg-muted"
        }
        onClick={onToggleThisWeek}
        active={thisWeekActive}
        emphasize={thisWeekTasks > 0}
      />
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
  sub,
  tint,
  onClick,
  active,
  emphasize,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  sub?: string;
  tint: string;
  onClick?: () => void;
  active?: boolean;
  emphasize?: boolean;
}) {
  const clickable = !!onClick;
  return (
    <Card
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "flex items-center gap-3 p-4 transition-all",
        clickable && "cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "ring-2 ring-rose-400 dark:ring-rose-500",
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          tint,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div
          className={cn(
            "text-2xl font-bold leading-none tabular-nums",
            emphasize && "text-rose-600 dark:text-rose-400",
          )}
        >
          {value}
        </div>
        <div className="mt-1 truncate text-xs font-medium text-muted-foreground">
          {label}
        </div>
        {sub && (
          <div className="truncate text-[10px] text-muted-foreground/70">
            {sub}
          </div>
        )}
      </div>
    </Card>
  );
}
