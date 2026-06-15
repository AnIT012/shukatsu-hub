"use client";

import { ArrowDownUp, CalendarRange, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PRIORITY_OPTIONS, RESULT_OPTIONS } from "@/lib/constants";
import type { Filters, Priority, ResultStatus, SortKey } from "@/lib/types";

interface Props {
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
}

const SORT_LABEL: Record<SortKey, string> = {
  deadline: "締切が近い順",
  priority: "優先度順",
  name: "企業名順",
};

export function ControlsBar({
  sort,
  onSortChange,
  filters,
  onFiltersChange,
}: Props) {
  const set = (patch: Partial<Filters>) =>
    onFiltersChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 検索 */}
      <div className="relative min-w-[180px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
          placeholder="企業名・職種で検索"
          className="pl-9"
        />
        {filters.query && (
          <button
            onClick={() => set({ query: "" })}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="検索クリア"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ソート */}
      <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
        <SelectTrigger className="w-[150px]">
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

      {/* 結果フィルター */}
      <Select
        value={filters.result}
        onValueChange={(v) => set({ result: v as ResultStatus | "all" })}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">結果: すべて</SelectItem>
          {RESULT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 優先度フィルター */}
      <Select
        value={filters.priority}
        onValueChange={(v) => set({ priority: v as Priority | "all" })}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">優先度: 全</SelectItem>
          {PRIORITY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              優先度 {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 今週やること トグル */}
      <Button
        type="button"
        variant={filters.onlyThisWeek ? "default" : "outline"}
        onClick={() => set({ onlyThisWeek: !filters.onlyThisWeek })}
        className={cn(
          filters.onlyThisWeek &&
            "bg-rose-600 text-white hover:bg-rose-600/90",
        )}
      >
        <CalendarRange className="h-4 w-4" />
        今週やること
      </Button>
    </div>
  );
}
