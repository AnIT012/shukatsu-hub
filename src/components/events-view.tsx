"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, Plus, SearchX } from "lucide-react";
import type {
  EventFilters,
  EventItem,
  EventSortKey,
  SortDir,
  ViewMode,
} from "@/lib/types";
import { useStore } from "@/lib/store";
import { focusOf, isEventDone } from "@/lib/next-action";
import { dueInstant, isDueThisWeekOrOverdue } from "@/lib/date";
import { EventCard } from "@/components/event-card";
import { EventsControlsBar } from "@/components/events-controls-bar";
import { Button } from "@/components/ui/button";

const TERMINAL = Number.POSITIVE_INFINITY;
const NO_DATE = Number.MAX_SAFE_INTEGER;

const DEFAULT_FILTERS: EventFilters = { statuses: [], onlyThisWeek: false };

/** イベントの注目日(申込締切優先・消化/超過で開催へ)の絶対時刻。完了(参加済/辞退/開催済)は末尾。 */
function focusInst(ev: EventItem): number {
  if (isEventDone(ev)) return TERMINAL;
  const d = focusOf(ev.applyBy, ev.heldAt, ev.applyDone).date;
  return d ? (dueInstant(d) ?? NO_DATE) : NO_DATE;
}

export function EventsView({
  onOpenEvent,
  onAddEvent,
  viewMode,
  onViewModeChange,
}: {
  onOpenEvent: (id: string) => void;
  onAddEvent: () => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
}) {
  const { events } = useStore();
  const [sort, setSort] = useState<EventSortKey>("apply");
  const [dir, setDir] = useState<SortDir>("asc");
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);

  const visible = useMemo(() => {
    const list = events.filter((ev) => {
      if (filters.statuses.length && !filters.statuses.includes(ev.status))
        return false;
      if (
        filters.onlyThisWeek &&
        !(
          !isEventDone(ev) &&
          isDueThisWeekOrOverdue(
            focusOf(ev.applyBy, ev.heldAt, ev.applyDone).date,
          )
        )
      )
        return false;
      return true;
    });
    const dirMul = dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      let r: number;
      if (sort === "name") {
        r = a.company.localeCompare(b.company, "ja");
      } else if (sort === "held") {
        const ai = a.heldAt ? (dueInstant(a.heldAt) ?? NO_DATE) : NO_DATE;
        const bi = b.heldAt ? (dueInstant(b.heldAt) ?? NO_DATE) : NO_DATE;
        r = ai - bi || a.company.localeCompare(b.company, "ja");
      } else {
        r = focusInst(a) - focusInst(b) || a.company.localeCompare(b.company, "ja");
      }
      return r * dirMul;
    });
  }, [events, sort, dir, filters]);

  if (events.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary">
          <CalendarPlus className="h-7 w-7" />
        </div>
        <h2 className="mt-4 font-semibold">説明会・イベントを登録</h2>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          申込締切と開催日を入れておけば、選考と同じく締切が近い順に並びます。
        </p>
        <Button className="mt-5" onClick={onAddEvent}>
          <Plus className="h-4 w-4" />
          最初のイベントを追加
        </Button>
      </div>
    );
  }

  return (
    <>
      <div>
        <EventsControlsBar
          sort={sort}
          onSortChange={setSort}
          dir={dir}
          onDirChange={setDir}
          filters={filters}
          onFiltersChange={setFilters}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
      </div>

      {visible.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center">
          <SearchX className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            条件に一致するイベントがありません
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            フィルターをリセット
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {visible.map((ev) => (
            <div key={ev.id}>
              <EventCard
                ev={ev}
                onOpen={() => onOpenEvent(ev.id)}
                compact={viewMode === "compact"}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
