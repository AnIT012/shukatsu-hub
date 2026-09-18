"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Check,
  LayoutList,
  Rows3,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  PRIORITY_OPTIONS,
  SITUATION_LABEL,
  SITUATION_OPTIONS,
} from "@/lib/constants";
import type {
  Filters,
  Priority,
  Situation,
  SortDir,
  SortKey,
  ViewMode,
} from "@/lib/types";

const SORT_LABEL: Record<SortKey, string> = {
  deadline: "締切順",
  priority: "優先度順",
  name: "企業名順",
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground ring-1 ring-inset ring-[hsl(var(--primary))]"
          : "bg-secondary text-foreground ring-1 ring-inset ring-[hsl(var(--muted-foreground)/0.32)] hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

export function ControlsBar({
  sort,
  onSortChange,
  dir,
  onDirChange,
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
}: {
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  dir: SortDir;
  onDirChange: (d: SortDir) => void;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeCount =
    filters.situations.length +
    filters.priorities.length +
    (filters.onlyThisWeek ? 1 : 0);

  const toggleSit = (s: Situation) =>
    onFiltersChange({
      ...filters,
      situations: filters.situations.includes(s)
        ? filters.situations.filter((x) => x !== s)
        : [...filters.situations, s],
    });

  const togglePri = (p: Priority) =>
    onFiltersChange({
      ...filters,
      priorities: filters.priorities.includes(p)
        ? filters.priorities.filter((x) => x !== p)
        : [...filters.priorities, p],
    });

  return (
    <div className="flex items-center gap-2">
      {/* 並べ替え = 1つのピルに統合。左=種別を選ぶ / 右=昇順降順をその場で切り替え */}
      <div
        data-tour="sort"
        className="flex min-w-0 flex-1 items-center rounded-full bg-card ring-1 ring-border"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-1.5 rounded-l-full py-2 pl-3 pr-2 text-sm active:scale-[0.98]"
            >
              <ArrowDownUp className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{SORT_LABEL[sort]}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
              <DropdownMenuItem key={k} onClick={() => onSortChange(k)}>
                <span className="flex-1">{SORT_LABEL[k]}</span>
                {sort === k && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          aria-label={dir === "asc" ? "昇順（タップで降順に）" : "降順（タップで昇順に）"}
          title={
            dir === "asc"
              ? "昇順 — 締切なら近い順 / 優先度なら高い順"
              : "降順 — 締切なら遠い順 / 優先度なら低い順"
          }
          onClick={() => onDirChange(dir === "asc" ? "desc" : "asc")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-r-full border-l border-border text-muted-foreground active:scale-95"
        >
          {dir === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
        </button>
      </div>

      <Button
        type="button"
        variant="outline"
        data-tour="filter"
        className="h-9 shrink-0 bg-card"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal className="h-4 w-4" />
        絞り込み
        {activeCount > 0 && (
          <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-medium text-primary-foreground">
            {activeCount}
          </span>
        )}
      </Button>

      {/* 表示モード = iOSセグメント(選択が紙色で浮く) */}
      <div
        role="group"
        aria-label="表示モード"
        className="flex h-9 shrink-0 items-center rounded-full bg-secondary p-0.5"
      >
        {([
          ["compact", LayoutList, "コンパクト表示"],
          ["detail", Rows3, "詳細表示"],
        ] as const).map(([m, Icon, label]) => (
          <button
            key={m}
            type="button"
            aria-label={label}
            aria-pressed={viewMode === m}
            onClick={() => onViewModeChange(m)}
            className={cn(
              "flex h-8 w-9 items-center justify-center rounded-full transition-all active:scale-95",
              viewMode === m
                ? "bg-card text-primary shadow-[0_1px_2px_hsl(var(--foreground)/0.14)]"
                : "text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl px-5 pb-7 pt-4"
        >
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />
          <SheetTitle className="mb-4 text-base">絞り込み</SheetTitle>

          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs text-muted-foreground">
                状況（複数選択OK）
              </div>
              <div className="flex flex-wrap gap-2">
                {SITUATION_OPTIONS.map((s) => (
                  <Chip
                    key={s}
                    active={filters.situations.includes(s)}
                    onClick={() => toggleSit(s)}
                  >
                    {SITUATION_LABEL[s]}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs text-muted-foreground">優先度</div>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((p) => (
                  <Chip
                    key={p.value}
                    active={filters.priorities.includes(p.value)}
                    onClick={() => togglePri(p.value)}
                  >
                    {p.label}
                  </Chip>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                onFiltersChange({ ...filters, onlyThisWeek: !filters.onlyThisWeek })
              }
              className="flex w-full items-center justify-between rounded-xl bg-muted px-4 py-3 text-sm"
            >
              <span>今週やることだけ表示</span>
              <span
                className={cn(
                  "relative h-6 w-10 rounded-full transition-colors",
                  filters.onlyThisWeek ? "bg-primary" : "bg-border",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-all",
                    filters.onlyThisWeek ? "left-[18px]" : "left-0.5",
                  )}
                />
              </span>
            </button>
          </div>

          <div className="mt-5 flex gap-2">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() =>
                onFiltersChange({
                  situations: [],
                  priorities: [],
                  onlyThisWeek: false,
                })
              }
            >
              <RotateCcw className="h-4 w-4" />
              リセット
            </Button>
            <Button className="flex-1" onClick={() => setOpen(false)}>
              閉じる
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
