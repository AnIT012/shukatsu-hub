"use client";

import { useState } from "react";
import { ArrowDownUp, RotateCcw, SlidersHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { Filters, Priority, Situation, SortKey } from "@/lib/types";

const SORT_LABEL: Record<SortKey, string> = {
  deadline: "締切が近い順",
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
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-foreground/80 hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

export function ControlsBar({
  sort,
  onSortChange,
  filters,
  onFiltersChange,
}: {
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
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
      <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
        <SelectTrigger className="h-9 flex-1 bg-card text-sm">
          <ArrowDownUp className="mr-1 h-4 w-4 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
            <SelectItem key={k} value={k}>
              {SORT_LABEL[k]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="outline"
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
