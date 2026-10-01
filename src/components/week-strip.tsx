"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Flag } from "lucide-react";
import { useStore } from "@/lib/store";
import { STEP_KIND_LABEL } from "@/lib/constants";
import { splitDue } from "@/lib/date";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// 今週(月曜始まりの暦の週)の帯。TODOアプリの週の帯と同じ作り:
// 曜日の小字・日付の丸(今日=テーマ色で塗る/過去=薄く)・下に点(締切=赤の点/実施・開催=輪)。
// 日を押すと、その日の締切と予定をシートで並べ、押すと詳細を開く。
// 選考とイベントを合わせて出す=一覧には無い「週を横に見る」ための物。

const WD = ["日", "月", "火", "水", "木", "金", "土"];

type DayItem = {
  type: "app" | "event";
  id: string;
  title: string;
  sub: string;
  kind: "deadline" | "held";
  time: string;
};

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 今日を含む週の7日(月曜始まり) */
export function thisWeekDays(now = new Date()): Date[] {
  const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(s);
    d.setDate(s.getDate() + i);
    return d;
  });
}

/** 帯の見出し。週が月をまたぐときは「9月 – 10月」 */
export function weekMonthLabel(now = new Date()): string {
  const days = thisWeekDays(now);
  const a = days[0].getMonth() + 1;
  const b = days[6].getMonth() + 1;
  return a === b ? `${a}月` : `${a}月 – ${b}月`;
}

export function WeekStrip({
  onOpenApp,
  onOpenEvent,
}: {
  onOpenApp: (id: string) => void;
  onOpenEvent: (id: string) => void;
}) {
  const { applications, events } = useStore();
  const [openDay, setOpenDay] = useState<string | null>(null);
  // 閉じていく間も中身を変えない(閉じた瞬間に「予定はありません」へ化けてから滑り落ちないように)
  const lastDay = useRef<string | null>(null);
  if (openDay) lastDay.current = openDay;
  const viewDay = openDay ?? lastDay.current;
  // 帯が最初に出た時だけ、点を日ごとに少しずつずらして出す(後から増えた点は待たせずに出す)
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setIntro(false), 700);
    return () => window.clearTimeout(t);
  }, []);
  const today = ymd(new Date());
  const days = useMemo(() => thisWeekDays(), [today]); // eslint-disable-line react-hooks/exhaustive-deps

  // 日付ごとの締切・予定。終わった選考・終わったタスク・参加済/辞退のイベントは数えない
  const byDay = useMemo(() => {
    const m = new Map<string, DayItem[]>();
    const add = (due: string | null, it: Omit<DayItem, "time">) => {
      if (!due) return;
      const { date, time } = splitDue(due);
      if (!date) return;
      const list = m.get(date) ?? [];
      list.push({ ...it, time });
      m.set(date, list);
    };
    for (const a of applications) {
      if (a.result !== "in_progress") continue;
      for (const st of a.stages) {
        if (st.result === "passed" || st.result === "failed" || st.result === "declined") continue;
        for (const t of st.tasks) {
          if (t.done) continue;
          const what = t.name.trim() || STEP_KIND_LABEL[t.kind];
          if (!t.submitted)
            add(t.dueAt, { type: "app", id: a.id, title: a.company || "(名称未設定)", sub: `${what}の締切`, kind: "deadline" });
          add(t.heldAt, { type: "app", id: a.id, title: a.company || "(名称未設定)", sub: what, kind: "held" });
        }
      }
    }
    for (const ev of events) {
      if (ev.status !== "todo") continue;
      const title = ev.title || "(イベント名未設定)";
      if (!ev.applyDone)
        add(ev.applyBy, { type: "event", id: ev.id, title, sub: `${ev.company ? `${ev.company}・` : ""}申込締切`, kind: "deadline" });
      add(ev.heldAt, { type: "event", id: ev.id, title, sub: ev.company || "イベント", kind: "held" });
    }
    for (const list of m.values())
      list.sort((x, y) => (x.time || "99:99").localeCompare(y.time || "99:99"));
    return m;
  }, [applications, events]);

  const sel = viewDay ? (byDay.get(viewDay) ?? []) : [];
  const selDate = viewDay ? new Date(`${viewDay}T00:00`) : null;
  const deadlines = sel.filter((x) => x.kind === "deadline");
  const helds = sel.filter((x) => x.kind === "held");

  const open = (it: DayItem) => {
    setOpenDay(null);
    // シートが閉じてから詳細を出す(重なって見えないように)
    window.setTimeout(() => (it.type === "app" ? onOpenApp(it.id) : onOpenEvent(it.id)), 180);
  };

  return (
    <>
      <div className="flex justify-between px-1 pb-2 pt-0.5" role="group" aria-label="今週" data-tour="week">
        {days.map((d, i) => {
          const k = ymd(d);
          const items = byDay.get(k) ?? [];
          const dl = items.filter((x) => x.kind === "deadline").length;
          const hd = items.length - dl;
          const nDl = Math.min(4, dl);
          const nHd = Math.min(4 - nDl, hd);
          const isToday = k === today;
          const isPast = k < today;
          const firstOfMonth = d.getDate() === 1 && i > 0;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setOpenDay(k)}
              aria-label={`${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）${isToday ? "今日・" : ""}締切${dl}件・予定${hd}件`}
              aria-current={isToday ? "date" : undefined}
              className="group flex-1 text-center leading-none"
            >
              <span className="block text-[11px] font-medium text-muted-foreground">
                {WD[d.getDay()]}
              </span>
              <span
                className={cn(
                  "mx-auto mt-1 grid h-8 place-items-center rounded-full text-[16px] font-medium tabular-nums transition-transform duration-100 ease-[cubic-bezier(.2,.8,.2,1)] motion-safe:group-active:scale-90",
                  firstOfMonth ? "w-auto min-w-[2rem] px-1.5 text-[13px]" : "w-8",
                  isToday
                    ? "bg-primary font-bold text-primary-foreground"
                    : isPast
                      ? "text-muted-foreground"
                      : "text-foreground",
                )}
              >
                {firstOfMonth ? `${d.getMonth() + 1}/1` : d.getDate()}
              </span>
              <span className="mt-[3px] flex h-[6px] items-center justify-center gap-[2px]">
                {Array.from({ length: nDl }, (_, j) => (
                  <i
                    key={`d${j}`}
                    className="h-[5px] w-[5px] rounded-full bg-danger motion-safe:animate-dot-pop"
                    style={intro ? { animationDelay: `${120 + i * 35 + j * 25}ms` } : undefined}
                  />
                ))}
                {Array.from({ length: nHd }, (_, j) => (
                  <i
                    key={`h${j}`}
                    className="h-[6px] w-[6px] rounded-full motion-safe:animate-dot-pop"
                    style={{
                      boxShadow: "inset 0 0 0 1.5px hsl(var(--primary))",
                      ...(intro ? { animationDelay: `${120 + i * 35 + (nDl + j) * 25}ms` } : {}),
                    }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {/* 日を押した時: その日の締切と予定(その場の一覧なのでボトムシート) */}
      <Sheet open={openDay !== null} onOpenChange={(o) => !o && setOpenDay(null)}>
        <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto rounded-t-2xl px-5 pb-8 pt-4">
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />
          <SheetTitle className="text-base">
            {selDate && `${selDate.getMonth() + 1}月${selDate.getDate()}日（${WD[selDate.getDay()]}）`}
          </SheetTitle>
          {/* シートが上がってくるのに少し遅れて、中身が4px浮いて現れる(見出し→行の順に30msずつ) */}
          {sel.length === 0 ? (
            <p
              className="mt-6 pb-2 text-center text-[13px] text-muted-foreground motion-safe:animate-row-in"
              style={{ animationDelay: "80ms" }}
            >
              この日の締切・予定はありません
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              {[
                { label: "締切", list: deadlines },
                { label: "予定", list: helds },
              ]
                .filter((g) => g.list.length > 0)
                .map((g, gi, groups) => {
                  // 前のグループの見出し＋行の数だけ後ろへずらす(上限8段)
                  const base = groups.slice(0, gi).reduce((n, x) => n + 1 + x.list.length, 0);
                  const delay = (k: number) => ({
                    animationDelay: `${80 + Math.min(base + k, 8) * 30}ms`,
                  });
                  return (
                  <section key={g.label}>
                    <h3
                      className="mb-1.5 px-1 text-[12.5px] font-semibold text-muted-foreground motion-safe:animate-row-in"
                      style={delay(0)}
                    >
                      {g.label} <span className="tabular-nums text-muted-foreground/70">{g.list.length}</span>
                    </h3>
                    <div
                      className="overflow-hidden rounded-xl bg-card ring-1 ring-border motion-safe:animate-row-in"
                      style={delay(1)}
                    >
                      {g.list.map((it, i) => (
                        <button
                          key={`${it.type}-${it.id}-${it.kind}-${i}`}
                          type="button"
                          onClick={() => open(it)}
                          className={cn(
                            // 押した瞬間に灰を敷き、離したらゆっくり抜く(iOSの行と同じ)
                            "flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors duration-300 ease-[cubic-bezier(.2,.8,.2,1)] active:bg-muted/60 active:duration-0",
                            i > 0 && "border-t border-border",
                          )}
                        >
                          {it.kind === "deadline" ? (
                            <Flag className="h-4 w-4 shrink-0 text-danger" />
                          ) : (
                            <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-semibold text-foreground">
                              {it.title}
                            </span>
                            <span className="block truncate text-[12px] text-muted-foreground">
                              {it.sub}
                            </span>
                          </span>
                          {it.time && (
                            <span
                              className={cn(
                                "shrink-0 text-[13px] font-medium tabular-nums",
                                it.kind === "deadline" ? "text-danger" : "text-foreground",
                              )}
                            >
                              {it.time}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                  );
                })}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
