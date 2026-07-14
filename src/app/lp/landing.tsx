"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  ArrowUp,
  Bell,
  BellRing,
  Check,
  ChevronDown,
  Clipboard,
  ClipboardList,
  CloudOff,
  FileText,
  Flame,
  Flower2,
  Footprints,
  GraduationCap,
  LayoutList,
  Lock,
  MessagesSquare,
  Palette,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  UserPlus,
  Users,
} from "lucide-react";
import type {
  Application,
  EventItem,
  SelectionStage,
  SelectionTask,
  StepKind,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { STEP_KIND_LABEL } from "@/lib/constants";
import { focusOf, getStageNextAction, isEventDone } from "@/lib/next-action";
import { dueInstant, dueToDate, urgencyOf } from "@/lib/date";
import { ApplicationCard } from "@/components/application-card";
import { EventCard } from "@/components/event-card";
import { CompanionComment } from "@/components/companion-comment";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WD_JP = ["日", "月", "火", "水", "木", "金", "土"];

// 実物の画面を「実寸(390x800)」で組み、CSS transform で縮小して枠に収める。
// これでフォントサイズも余白も比率も実アプリと完全に一致する。
const DESIGN_W = 390;
const DESIGN_H = 800;

const LP_CSS = `
.lp-root{height:100dvh;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;background:hsl(var(--background));color:hsl(var(--foreground));}
.lp-root::-webkit-scrollbar{display:none}
.lp-root{scrollbar-width:none}
.lp-reveal{opacity:0;transform:translateY(28px);transition:opacity .7s ease,transform .7s cubic-bezier(.22,.61,.36,1)}
.lp-reveal.in{opacity:1;transform:none}
.lp-pop{opacity:0;transform:scale(.86);transition:opacity .8s ease,transform .9s cubic-bezier(.22,1,.36,1)}
.lp-pop.in{opacity:1;transform:scale(1)}
.lp-float{animation:lpfloat 6s ease-in-out infinite}
@keyframes lpfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
.lp-fade{opacity:0;transition:opacity .6s ease}
.lp-fade.show{opacity:1}
/* テーマ展開(トランプ配り) */
.fan{position:relative;height:360px;display:flex;align-items:center;justify-content:center}
.fan-card{position:absolute;transition:transform 1.05s cubic-bezier(.22,1,.36,1),opacity .7s ease;transform:translateX(0) translateY(0) rotate(0) scale(.8);opacity:0;z-index:1}
.fan.in .fan-card{opacity:1}
.fan.in .fan-card[data-p="l2"]{transform:translateX(-176px) translateY(24px) rotate(-19deg);transition-delay:.2s}
.fan.in .fan-card[data-p="l1"]{transform:translateX(-92px) translateY(2px) rotate(-9deg);transition-delay:.1s}
.fan.in .fan-card[data-p="r1"]{transform:translateX(92px) translateY(2px) rotate(9deg);transition-delay:.1s}
.fan.in .fan-card[data-p="r2"]{transform:translateX(176px) translateY(24px) rotate(19deg);transition-delay:.2s}
.fan-card[data-p="l1"],.fan-card[data-p="r1"]{z-index:3}
.fan-card[data-p="l2"],.fan-card[data-p="r2"]{z-index:2}
.fan-card[data-p="c"]{z-index:5;transform:translateY(-8px) scale(1)}
/* 締切セクション: 要素が順番に並び込む(自動でトップへ) */
.stg{opacity:0;transform:translateY(16px)}
.in .stg{opacity:1;transform:none}
/* 通知スライドイン(ループ) */
.notif{animation:notifin 4.4s ease-in-out infinite}
@keyframes notifin{0%{opacity:0;transform:translateY(-28px) scale(.96)}9%{opacity:1;transform:translateY(0) scale(1)}84%{opacity:1;transform:translateY(0) scale(1)}93%,100%{opacity:0;transform:translateY(-10px) scale(.98)}}
/* 画面内スワイプ(選考↔進捗) */
/* スワイプ: 下タブ順(進捗｜選考｜イベント)。選考を起点に、右で進捗・左でイベントへ。 */
.swipe3{animation:swipe3 13s cubic-bezier(.65,0,.35,1) infinite}
@keyframes swipe3{
0%,14%{transform:translateX(-${DESIGN_W}px)}
22%,36%{transform:translateX(0)}
44%,58%{transform:translateX(-${DESIGN_W}px)}
66%,80%{transform:translateX(-${DESIGN_W * 2}px)}
88%,100%{transform:translateX(-${DESIGN_W}px)}}
.navsel{animation:navsel 13s cubic-bezier(.65,0,.35,1) infinite}
.navprog{animation:navprog 13s cubic-bezier(.65,0,.35,1) infinite}
.navevt{animation:navevt 13s cubic-bezier(.65,0,.35,1) infinite}
@keyframes navsel{0%,16%{opacity:1}21%,37%{opacity:0}43%,59%{opacity:1}65%,81%{opacity:0}87%,100%{opacity:1}}
@keyframes navprog{0%,17%{opacity:0}22%,36%{opacity:1}41%,100%{opacity:0}}
@keyframes navevt{0%,61%{opacity:0}66%,80%{opacity:1}85%,100%{opacity:0}}
.plusswipe{animation:plusswipe 13s cubic-bezier(.65,0,.35,1) infinite}
@keyframes plusswipe{0%,16%{opacity:1;transform:none}22%,36%{opacity:0;transform:rotate(-30deg) scale(.5)}43%,100%{opacity:1;transform:none}}
/* 進捗: 歩数が増えるたび花が一輪ずつ咲く / 称号がポップで入る */
.flow{transform-origin:bottom center;animation:flowin .45s cubic-bezier(.34,1.56,.64,1)}
@keyframes flowin{0%{transform:scale(0);opacity:0}100%{transform:scale(1);opacity:1}}
.bdg{opacity:0;transform:scale(.6)}
.bdg-go .bdg{animation:bdgpop .5s cubic-bezier(.34,1.56,.64,1) both}
@keyframes bdgpop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}
/* 通知が上から順に届く */
.notifrise{opacity:0;transform:translateY(-14px)}
.in .notifrise{opacity:1;transform:none;transition:opacity .5s ease,transform .55s cubic-bezier(.22,1,.36,1)}
.aurora{position:absolute;border-radius:9999px;filter:blur(64px);opacity:.5;pointer-events:none}
`;

/* ============ サンプルデータ(実型・実コンポーネントへ流す) ============ */

function tk(o: Partial<SelectionTask> & { id: string; kind: StepKind }): SelectionTask {
  return {
    id: o.id,
    kind: o.kind,
    name: o.name ?? "",
    dueAt: o.dueAt ?? null,
    heldAt: o.heldAt ?? null,
    location: "",
    memo: "",
    submitted: o.submitted,
    done: o.done ?? false,
  };
}

function mkApp(o: Partial<Application> & { id: string; company: string; stages: SelectionStage[] }): Application {
  return {
    id: o.id,
    company: o.company,
    role: o.role ?? "",
    priority: o.priority ?? "medium",
    result: o.result ?? "in_progress",
    selectionType: o.selectionType ?? "main",
    venueMode: "",
    venuePlace: "",
    links: o.links ?? [],
    esEntries: [],
    memo: "",
    steps: [],
    stages: o.stages,
    createdAt: "2026-01-01T00:00:00",
    updatedAt: "2026-01-01T00:00:00",
  };
}

/** 今日基準で n 日後の "YYYY-MM-DD"(任意で時刻付き) */
function ymd(now: Date, add: number, time?: string): string {
  const d = new Date(now);
  d.setDate(d.getDate() + add);
  const p = (n: number) => String(n).padStart(2, "0");
  const base = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return time ? `${base}T${time}` : base;
}

/** 選考一覧用の3社(締切が近い順 + 内定1社) */
function listApps(now: Date): Application[] {
  return [
    mkApp({
      id: "suntory",
      company: "あおば食品",
      selectionType: "main",
      links: [{ id: "l1", label: "マイページ", url: "https://example.com", pin: true }],
      stages: [
        { id: "s1", label: "書類選考", result: "passed", tasks: [tk({ id: "t1", kind: "es", done: true })] },
        { id: "s2", label: "Webテスト", result: "pending", tasks: [tk({ id: "t2", kind: "web_test", dueAt: ymd(now, 2, "23:59") })] },
      ],
    }),
    mkApp({
      id: "rakuten",
      company: "さくらネット",
      selectionType: "main",
      stages: [{ id: "s3", label: "", result: "pending", tasks: [tk({ id: "t3", kind: "es", dueAt: ymd(now, 6) })] }],
    }),
    mkApp({
      id: "mercari",
      company: "そらアプリ",
      selectionType: "main",
      stages: [{ id: "s4", label: "一次面接", result: "pending", tasks: [tk({ id: "t4", kind: "interview", heldAt: ymd(now, 12, "14:00") })] }],
    }),
    mkApp({
      id: "cyber",
      company: "みなと広告",
      selectionType: "early",
      result: "passed",
      stages: [
        { id: "s5", label: "書類選考", result: "passed", tasks: [tk({ id: "t5", kind: "es", done: true })] },
        { id: "s6", label: "最終面接", result: "passed", tasks: [tk({ id: "t6", kind: "final_interview", done: true })] },
      ],
    }),
  ];
}

/** 段階バー＋いろんな状態(進行中・結果待ち・内定・不合格)を見せる用 */
function flowApps(now: Date): Application[] {
  return [
    mkApp({
      id: "recruit",
      company: "あすなろ人材",
      selectionType: "main",
      stages: [
        { id: "f1", label: "書類選考", result: "passed", tasks: [tk({ id: "ft1", kind: "es", done: true })] },
        { id: "f2", label: "Webテスト", result: "passed", tasks: [tk({ id: "ft2", kind: "web_test", done: true })] },
        { id: "f3", label: "一次面接", result: "passed", tasks: [tk({ id: "ft3", kind: "interview", done: true })] },
        { id: "f4", label: "二次面接", result: "pending", tasks: [tk({ id: "ft4", kind: "interview", dueAt: ymd(now, 4) })] },
        { id: "f5", label: "最終面接", result: "pending", tasks: [tk({ id: "ft5", kind: "final_interview" })] },
      ],
    }),
    mkApp({
      id: "nintendo",
      company: "こだまゲームス",
      selectionType: "main",
      stages: [
        { id: "n1", label: "書類選考", result: "passed", tasks: [tk({ id: "nt1", kind: "es", done: true })] },
        { id: "n2", label: "一次面接", result: "waiting", tasks: [tk({ id: "nt2", kind: "interview", done: true })] },
        { id: "n3", label: "最終面接", result: "pending", tasks: [tk({ id: "nt3", kind: "final_interview" })] },
      ],
    }),
    mkApp({
      id: "shiseido",
      company: "はなやか化粧品",
      selectionType: "main",
      result: "passed",
      stages: [
        { id: "sh1", label: "書類選考", result: "passed", tasks: [tk({ id: "sht1", kind: "es", done: true })] },
        { id: "sh2", label: "一次面接", result: "passed", tasks: [tk({ id: "sht2", kind: "interview", done: true })] },
        { id: "sh3", label: "最終面接", result: "passed", tasks: [tk({ id: "sht3", kind: "final_interview", done: true })] },
      ],
    }),
    mkApp({
      id: "fujitsu",
      company: "やまと電機",
      selectionType: "main",
      result: "rejected",
      stages: [
        { id: "j1", label: "書類選考", result: "passed", tasks: [tk({ id: "jt1", kind: "es", done: true })] },
        { id: "j2", label: "一次面接", result: "failed", tasks: [tk({ id: "jt2", kind: "interview", done: true })] },
      ],
    }),
  ];
}

function evMk(o: Partial<EventItem> & { id: string; company: string; title: string }): EventItem {
  return {
    id: o.id,
    company: o.company,
    title: o.title,
    venueMode: o.venueMode ?? "",
    venuePlace: o.venuePlace ?? "",
    applyBy: o.applyBy ?? null,
    applyDone: o.applyDone,
    heldAt: o.heldAt ?? null,
    links: o.links ?? [],
    memo: "",
    status: o.status ?? "todo",
    createdAt: "2026-01-01T00:00:00",
    updatedAt: "2026-01-01T00:00:00",
  };
}

/** イベント一覧用(申込締切が近い順 + 参加済1件) */
function listEvents(now: Date): EventItem[] {
  return [
    evMk({
      id: "e1",
      company: "あすなろ人材",
      title: "OB訪問",
      venueMode: "onsite",
      venuePlace: "東京・丸の内",
      applyBy: ymd(now, 2),
      links: [{ id: "el1", label: "予約ページ", url: "https://example.com", pin: true }],
    }),
    evMk({ id: "e2", company: "就活フェスタ", title: "合同説明会", venueMode: "online", applyBy: ymd(now, 5), heldAt: ymd(now, 8, "13:00") }),
    evMk({ id: "e3", company: "みなと広告", title: "1day仕事体験", venueMode: "onsite", venuePlace: "渋谷", heldAt: ymd(now, 15, "10:00") }),
    evMk({ id: "e4", company: "そらアプリ", title: "エンジニア説明会", venueMode: "online", heldAt: ymd(now, -3), status: "attended" }),
  ];
}

/** 数字を 0→target にカウントアップ。animated=false なら即 target。started で発火。 */
function useCountUp(target: number, animated: boolean, started: boolean): number {
  const [n, setN] = useState(animated ? 0 : target);
  useEffect(() => {
    if (!animated) {
      setN(target);
      return;
    }
    if (!started) {
      setN(0);
      return;
    }
    let raf = 0;
    let startT = 0;
    const dur = 1100;
    const tick = (t: number) => {
      if (!startT) startT = t;
      const p = Math.min(1, (t - startT) / dur);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animated, started, target]);
  return n;
}

/* ============ 実物の「直近1週間の予定」バナー(dashboard から忠実移植) ============ */

function AnnouncementBanner({ applications }: { applications: Application[] }) {
  const items = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const limit = new Date();
    limit.setDate(limit.getDate() + 7);
    const limitKey = fmt(limit);
    return applications
      .flatMap((app) => {
        const na = getStageNextAction(app);
        if (na.type !== "step" || !na.focusDate) return [];
        if (na.focusDate.slice(0, 10) > limitKey) return [];
        const inst = dueInstant(na.focusDate);
        if (inst == null) return [];
        return [
          {
            app,
            kind: na.tasks[0]?.kind,
            dueAt: na.focusDate,
            inst,
            urgent: ["overdue", "soon", "near"].includes(urgencyOf(na.focusDate)),
          },
        ];
      })
      .sort((a, b) => a.inst - b.inst);
  }, [applications]);

  const hasUrgent = items.some((x) => x.urgent);
  const accent = items.length === 0 ? "text-muted-foreground" : hasUrgent ? "text-danger" : "text-primary";

  return (
    <div
      className={cn(
        "rounded-xl bg-card p-3 shadow-[0_1px_2px_rgba(20,28,55,0.05),0_6px_16px_rgba(20,28,55,0.05)] ring-2",
        items.length === 0 ? "ring-border" : hasUrgent ? "ring-[hsl(var(--danger)/0.6)]" : "ring-[hsl(var(--primary)/0.75)]",
      )}
    >
      <div className="flex items-center gap-1.5 text-[12px] font-medium">
        <Bell className={cn("h-3.5 w-3.5", accent)} />
        <span className={accent}>直近1週間の予定</span>
        {items.length > 0 && <span className="ml-auto text-[11px] text-muted-foreground">{items.length}件</span>}
      </div>
      <div className="mt-1.5 space-y-1">
        {items.map((x) => {
          const d = dueToDate(x.dueAt);
          return (
            <div key={x.app.id} className="flex items-center gap-2.5 text-[12.5px]">
              <span className={cn("w-14 shrink-0 font-medium", x.urgent ? "text-danger" : "text-primary")}>
                {d ? `${d.getMonth() + 1}/${d.getDate()}(${WD_JP[d.getDay()]})` : "未定"}
              </span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{x.app.company}</span>
                <span className="text-muted-foreground">・{x.kind ? STEP_KIND_LABEL[x.kind] : "予定"}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ 下タブ(実物再現・固定でなく枠内 absolute) ============ */

type Tab = "progress" | "selection" | "events" | "settings";

function NavBar({ active, className }: { active: Tab; className?: string }) {
  const Cell = ({ tab, label, children }: { tab: Tab; label: string; children: React.ReactNode }) => {
    const on = active === tab;
    return (
      <div className={cn("relative flex flex-1 flex-col items-center gap-0.5 py-2", on ? "text-primary" : "text-muted-foreground")}>
        {children}
        <span className="text-[10.5px] font-medium leading-none">{label}</span>
      </div>
    );
  };
  const ic = "h-[22px] w-[22px]";
  return (
    <nav className={cn("absolute inset-x-0 bottom-0 border-t bg-card", className)}>
      <div className="mx-auto flex max-w-3xl">
        <Cell tab="progress" label="進捗">
          {active === "progress" ? (
            <Flower2 className={cn(ic, "scale-110")} strokeWidth={2.4} />
          ) : (
            <Sprout className={ic} strokeWidth={2} />
          )}
        </Cell>
        <Cell tab="selection" label="選考">
          {active === "selection" ? (
            <span className="relative flex h-[22px] w-[22px] scale-110 items-center justify-center">
              <Clipboard className={ic} strokeWidth={2.4} />
              <Check className="absolute left-1/2 top-[60%] h-3 w-3" style={{ transform: "translate(-50%,-50%)" }} strokeWidth={3.2} />
            </span>
          ) : (
            <ClipboardList className={ic} strokeWidth={2} />
          )}
        </Cell>
        <Cell tab="events" label="イベント">
          {active === "events" ? <BellRing className={cn(ic, "scale-110")} strokeWidth={2.4} /> : <Bell className={ic} strokeWidth={2} />}
        </Cell>
        <Cell tab="settings" label="設定">
          <Settings className={cn(ic, active === "settings" && "scale-110")} strokeWidth={active === "settings" ? 2.4 : 2} />
        </Cell>
      </div>
    </nav>
  );
}

/* ============ 実物の画面(実寸 390x800) ============ */

function Screen({ children }: { children: React.ReactNode }) {
  // relative にして下タブ(absolute)を必ずこの画面に固定する(スワイプ時の重なり防止)
  return (
    <div className="relative flex flex-col bg-background" style={{ width: DESIGN_W, height: DESIGN_H }}>
      {children}
    </div>
  );
}

/** 実物の絞り込み/並べ替え行(ControlsBar の見た目を忠実再現・静止) */
function ControlsBarStatic({ sortLabel = "締切順" }: { sortLabel?: string }) {
  const box = "flex h-9 shrink-0 items-center justify-center rounded-md border bg-card";
  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex h-9 min-w-0 flex-1 items-center rounded-md border bg-card px-3 text-sm">
          <ArrowDownUp className="mr-1 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{sortLabel}</span>
          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
        </div>
        <div className={cn(box, "w-9")}>
          <ArrowUp className="h-4 w-4" />
        </div>
      </div>
      <div className={cn(box, "gap-1.5 px-3 text-sm")}>
        <SlidersHorizontal className="h-4 w-4" />
        絞り込み
      </div>
      <div className={cn(box, "w-9")}>
        <LayoutList className="h-4 w-4" />
      </div>
    </div>
  );
}

function Header({ showAdd = true, plusClassName }: { showAdd?: boolean; plusClassName?: string }) {
  const now = new Date();
  return (
    <header className="shrink-0 border-b bg-card">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
        <span className="text-[15px] font-semibold tracking-wide text-primary">
          {now.getMonth() + 1}/{now.getDate()} <span className="text-muted-foreground">{WD[now.getDay()]}.</span>
        </span>
        <div className="ml-auto flex items-center gap-1">
          <span className="flex h-9 w-9 items-center justify-center text-muted-foreground">
            <RefreshCw className="h-[18px] w-[18px]" />
          </span>
          {(showAdd || plusClassName) && (
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground",
                plusClassName,
              )}
            >
              <span className="text-[20px] leading-none">＋</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

/** 選考の中身(ヘッダー・下タブを除く本体)。スワイプ枠でも使い回す。 */
function SelectionBody({ apps, cascade = false }: { apps: Application[]; cascade?: boolean }) {
  // 実物の並び: 伴走コメント → mt-3 直近1週間 → mt-3 絞り込み/並べ替え → mt-3 カード(space-y-2.5)
  const blocks: React.ReactNode[] = [
    <CompanionComment key="c" variant="selection" />,
    <div key="b" className="mt-3">
      <AnnouncementBanner applications={apps} />
    </div>,
    <div key="ctl" className="mt-3">
      <ControlsBarStatic />
    </div>,
    ...apps.map((a, i) => (
      <div key={a.id} className={i === 0 ? "mt-3" : "mt-2.5"}>
        <ApplicationCard app={a} compact onOpen={() => {}} />
      </div>
    )),
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 pt-4">
      {cascade
        ? blocks.map((node, i) => (
            <div
              key={i}
              className="stg"
              style={{
                transition:
                  "opacity .5s ease, transform .6s cubic-bezier(.22,1,.36,1)",
                transitionDelay: `${i * 85}ms`,
              }}
            >
              {node}
            </div>
          ))
        : blocks}
    </div>
  );
}

function SelectionScreen({ apps, cascade = false }: { apps: Application[]; cascade?: boolean }) {
  return (
    <Screen>
      <Header />
      <div className="flex-1 overflow-hidden">
        <SelectionBody apps={apps} cascade={cascade} />
      </div>
      <NavBar active="selection" />
    </Screen>
  );
}

/* ============ イベント画面(実物再現) ============ */

function EventsBanner({ events }: { events: EventItem[] }) {
  const items = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const lim = new Date();
    lim.setDate(lim.getDate() + 7);
    const limitKey = fmt(lim);
    return events
      .flatMap((ev) => {
        if (isEventDone(ev)) return [];
        const f = focusOf(ev.applyBy, ev.heldAt, ev.applyDone);
        if (!f.date) return [];
        if (f.date.slice(0, 10) > limitKey) return [];
        const inst = dueInstant(f.date);
        if (inst == null) return [];
        return [{ ev, date: f.date, inst, urgent: ["overdue", "soon", "near"].includes(urgencyOf(f.date)) }];
      })
      .sort((a, b) => a.inst - b.inst);
  }, [events]);
  const hasUrgent = items.some((x) => x.urgent);
  const accent = items.length === 0 ? "text-muted-foreground" : hasUrgent ? "text-danger" : "text-primary";
  return (
    <div
      className={cn(
        "rounded-xl bg-card p-3 shadow-[0_1px_2px_rgba(20,28,55,0.05),0_6px_16px_rgba(20,28,55,0.05)] ring-2",
        items.length === 0 ? "ring-border" : hasUrgent ? "ring-[hsl(var(--danger)/0.6)]" : "ring-[hsl(var(--primary)/0.75)]",
      )}
    >
      <div className="flex items-center gap-1.5 text-[12px] font-medium">
        <Bell className={cn("h-3.5 w-3.5", accent)} />
        <span className={accent}>直近1週間の予定</span>
        {items.length > 0 && <span className="ml-auto text-[11px] text-muted-foreground">{items.length}件</span>}
      </div>
      <div className="mt-1.5 space-y-1">
        {items.map((x) => {
          const d = dueToDate(x.date);
          return (
            <div key={x.ev.id} className="flex items-center gap-2.5 text-[12.5px]">
              <span className={cn("w-14 shrink-0 font-medium", x.urgent ? "text-danger" : "text-primary")}>
                {d ? `${d.getMonth() + 1}/${d.getDate()}(${WD_JP[d.getDay()]})` : "未定"}
              </span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{x.ev.company || x.ev.title}</span>
                <span className="text-muted-foreground">・{x.ev.title || "イベント"}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventBody({ events }: { events: EventItem[] }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-4">
      <CompanionComment variant="events" />
      <div className="mt-3">
        <EventsBanner events={events} />
      </div>
      <div className="mt-3">
        <ControlsBarStatic sortLabel="申込締切順" />
      </div>
      <div className="mt-3 space-y-2.5">
        {events.map((ev) => (
          <EventCard key={ev.id} ev={ev} compact onOpen={() => {}} />
        ))}
      </div>
    </div>
  );
}

const FLOWERS = [26, 22, 34, 30, 24, 36, 27];
const FLOWER_OP = [1, 0.82, 0.72, 0.95, 0.78, 1, 0.74];

// 歩数に応じた花の本数(progress-view と同じ段階)
function flowerCount(total: number): number {
  if (total <= 0) return 0;
  if (total <= 9) return 3;
  if (total <= 24) return 5;
  if (total <= 44) return 7;
  return 9;
}

// 本数だけ咲かせる。歩数が増えて本数が増えると、新しい花が一輪ずつ咲く(.flow)。
function FlowerField({ count }: { count: number }) {
  if (count === 0) {
    return (
      <div className="flex h-[60px] items-end justify-center">
        <Sprout className="text-success" size={40} />
      </div>
    );
  }
  return (
    <div className="flex h-[60px] items-end justify-center gap-0.5">
      {Array.from({ length: count }, (_, i) =>
        i % 3 === 1 ? (
          <Sprout key={i} className="flow text-success" size={Math.round(FLOWERS[i % FLOWERS.length] * 0.8)} />
        ) : (
          <Flower2
            key={i}
            className="flow text-primary"
            size={FLOWERS[i % FLOWERS.length]}
            style={{ opacity: FLOWER_OP[i % FLOWER_OP.length] }}
          />
        ),
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
  animated,
  started,
}: {
  icon: typeof FileText;
  value: number;
  label: string;
  animated: boolean;
  started: boolean;
}) {
  const n = useCountUp(value, animated, started);
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-[17px] w-[17px] text-primary" />
        <span className="text-2xl font-semibold">{n}</span>
      </div>
      <div className="mt-1 text-[12px] text-muted-foreground">{label}</div>
    </div>
  );
}

const BADGES = [
  { icon: Footprints, name: "はじめの一歩", hint: "計1", done: true },
  { icon: FileText, name: "ES職人", hint: "ES5", done: true },
  { icon: MessagesSquare, name: "場数の人", hint: "面接5", done: true },
  { icon: Users, name: "情報通", hint: "説明会5", done: true },
  { icon: Flame, name: "コツコツ", hint: "計20", done: true },
  { icon: Flower2, name: "満開", hint: "計45", done: false },
];

/** 進捗(積み上げ)の本体。animated で花が咲き・数字が増え・称号がポップ。 */
function ProgressBody({ animated = false, started = false }: { animated?: boolean; started?: boolean }) {
  const total = useCountUp(34, animated, started);
  const earned = BADGES.filter((b) => b.done).length;
  return (
    <div className="mx-auto max-w-3xl px-4 pt-4">
      <h1 className="mb-3 px-0.5 text-[15px] font-semibold">積み上げ</h1>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(20,28,55,0.05),0_6px_16px_rgba(20,28,55,0.05)]">
        <div className="px-4 pt-4">
          <div className="overflow-hidden rounded-xl bg-[hsl(var(--success)/0.1)] px-3 pt-3">
            <FlowerField count={flowerCount(total)} />
            <div className="h-2.5 rounded-t-md bg-[hsl(var(--success)/0.35)]" />
          </div>
          <div className="mt-3 flex items-end justify-center gap-1.5">
            <span className="text-[34px] font-semibold leading-none">{total}</span>
            <span className="pb-0.5 text-[13px] text-muted-foreground">歩、動いた</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 pt-1.5 text-[12.5px] text-muted-foreground">
            <Sprout className="h-3.5 w-3.5 text-success" />
            ここまで34回。ちゃんと積み上がってる
          </div>
          <div className="pt-1 text-center text-[11px] text-muted-foreground/70">8社・イベント9件と向き合ってる</div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 p-4">
          <Metric icon={FileText} value={12} label="ES提出" animated={animated} started={started} />
          <Metric icon={Users} value={9} label="説明会・イベント" animated={animated} started={started} />
          <Metric icon={ClipboardList} value={6} label="Webテスト" animated={animated} started={started} />
          <Metric icon={MessagesSquare} value={7} label="面接・GD" animated={animated} started={started} />
        </div>
        <div className="border-t px-4 py-4">
          <div className="mb-2.5 text-[12px] text-muted-foreground">
            称号（あつめた {earned}/{BADGES.length}）
          </div>
          <div className={cn("grid grid-cols-3 gap-2.5", animated && started && "bdg-go")}>
            {BADGES.map((b, i) => {
              const Icon = b.done ? b.icon : Lock;
              return (
                <div
                  key={b.name}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-center",
                    b.done ? "bg-[hsl(var(--primary)/0.1)] text-primary" : "bg-muted/60 text-muted-foreground/70",
                    b.done && animated && "bdg",
                  )}
                  style={b.done && animated ? { animationDelay: `${500 + i * 80}ms` } : undefined}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium leading-tight">{b.name}</span>
                  {!b.done && <span className="text-[9px] leading-none text-muted-foreground/60">{b.hint}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressScreen({ animated = false, started = false }: { animated?: boolean; started?: boolean }) {
  return (
    <Screen>
      <Header showAdd={false} />
      <div className="flex-1 overflow-hidden">
        <ProgressBody animated={animated} started={started} />
      </div>
      <NavBar active="progress" />
    </Screen>
  );
}

/**
 * ヘッダー・下タブは固定で、中身だけが左右にスワイプ。
 * パネルは下タブ順(進捗｜選考｜イベント)。選考を起点に、右で進捗・左でイベントへ。
 */
function SwipePhone({ apps, events }: { apps: Application[]; events: EventItem[] }) {
  return (
    <Screen>
      <Header plusClassName="plusswipe" />
      <div className="relative flex-1 overflow-hidden">
        <div className="swipe3 flex h-full" style={{ width: DESIGN_W * 3 }}>
          <div className="h-full overflow-hidden" style={{ width: DESIGN_W }}>
            <ProgressBody />
          </div>
          <div className="h-full overflow-hidden" style={{ width: DESIGN_W }}>
            <SelectionBody apps={apps} />
          </div>
          <div className="h-full overflow-hidden" style={{ width: DESIGN_W }}>
            <EventBody events={events} />
          </div>
        </div>
      </div>
      <NavBar active="progress" className="navprog" />
      <NavBar active="selection" className="navsel" />
      <NavBar active="events" className="navevt" />
    </Screen>
  );
}

/* ============ スマホ枠(実寸を transform scale で縮小) ============ */

function Phone({
  w = 248,
  theme,
  className = "",
  designW = DESIGN_W,
  children,
}: {
  w?: number;
  theme?: string;
  className?: string;
  designW?: number;
  children: React.ReactNode;
}) {
  const inner = w - 12; // border(6px×2)
  const scale = inner / DESIGN_W;
  const innerH = Math.round(DESIGN_H * scale);
  return (
    <div
      data-theme={theme}
      className={cn(
        "shrink-0 rounded-[2.1rem] border-[6px] border-foreground/85 bg-foreground/85 shadow-[0_20px_48px_-16px_rgba(20,28,55,0.5)]",
        className,
      )}
      style={{ width: w }}
    >
      <div className="relative overflow-hidden rounded-[1.55rem] bg-background" style={{ width: inner, height: innerH }}>
        <div
          style={{ width: designW, height: DESIGN_H, transformOrigin: "top left", transform: `scale(${scale})` }}
        >
          {children}
        </div>
        {/* ノッチ */}
        <div className="absolute left-1/2 top-2 z-10 h-1 w-12 -translate-x-1/2 rounded-full bg-foreground/15" />
      </div>
    </div>
  );
}

function Cta({ label }: { label: string }) {
  return (
    <a
      href="/"
      className="inline-flex items-center justify-center rounded-2xl bg-primary px-8 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-[0_8px_24px_hsl(var(--primary)/0.35)] transition-transform active:scale-95"
    >
      {label}
    </a>
  );
}

function SectionHead({ kicker, title, body }: { kicker: string; title: React.ReactNode; body: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md text-center">
      <span className="text-[12px] font-semibold tracking-wide text-primary">{kicker}</span>
      <h2 className="mt-2 text-[23px] font-bold leading-snug tracking-tight">{title}</h2>
      <p className="mx-auto mt-2.5 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

export function Landing() {
  const rootRef = useRef<HTMLElement | null>(null);
  const progRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [apps, setApps] = useState<Application[]>([]);
  const [flows, setFlows] = useState<Application[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [progAnim, setProgAnim] = useState(false);

  useEffect(() => {
    const now = new Date();
    setApps(listApps(now));
    setFlows(flowApps(now));
    setEvents(listEvents(now));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = rootRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            if (e.target === progRef.current) setProgAnim(true);
            io.unobserve(e.target);
          }
        }
      },
      { root, threshold: 0.18 },
    );
    root?.querySelectorAll("[data-reveal], .fan").forEach((el) => io.observe(el));
    if (progRef.current) io.observe(progRef.current);
    return () => io.disconnect();
  }, [mounted]);

  const fade = mounted ? "lp-fade show" : "lp-fade";

  return (
    <main ref={rootRef} className="lp-root">
      <style dangerouslySetInnerHTML={{ __html: LP_CSS }} />

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden px-5 pb-16 pt-16 text-center">
        <div className="aurora" style={{ width: 300, height: 300, top: -70, left: -90, background: "hsl(var(--primary))" }} />
        <div className="aurora" style={{ width: 250, height: 250, top: 160, right: -100, background: "hsl(var(--success))" }} />
        <div className="relative">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_24px_hsl(var(--primary)/0.35)]">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="mx-auto mt-6 max-w-md text-[29px] font-bold leading-[1.25] tracking-tight">
            就活の「次にやること」が、
            <br />
            毎朝ひと目で。
          </h1>
          <p className="mx-auto mt-3.5 max-w-xs text-[13.5px] leading-relaxed text-muted-foreground">
            本選考もインターンも、ES・Webテスト・面接・説明会も。バラバラの締切をひとつにまとめて、今日動くことだけを前に出す。
          </p>
          <div className="mt-7">
            <Cta label="無料で試す（登録不要）" />
          </div>
          <div className="mt-12 flex justify-center">
            <div className={cn("lp-float", fade)} data-reveal>
              <Phone>{mounted && <SelectionScreen apps={apps} cascade />}</Phone>
            </div>
          </div>
          <div className="mx-auto mt-8 max-w-xs">
            <p className="text-[15px] font-bold leading-snug">締切が近い順に、自動でトップへ。</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
              企業が増えても、締切が近いものは赤で強調。毎朝ひらけば「今日やること」がそのまま分かる。探さない・思い出さない・抜けない。
            </p>
          </div>
        </div>
      </section>

      {/* ===== 悩み → 解決 ===== */}
      <section className="bg-muted/30 px-5 py-16" data-reveal>
        <SectionHead
          kicker="就活あるある"
          title={<>こういうの、思ったことない？</>}
          body={<>管理がぐちゃぐちゃになる前に。よくある悩みを、ぜんぶ先回りして解決する。</>}
        />
        <div className="mx-auto mt-9 max-w-md space-y-6">
          {[
            { worry: "「あの企業の締切、いつだっけ…」", fix: "締切が近い順に自動でトップ。今日やることが毎朝ひと目で。" },
            { worry: "「気づいたら、提出期限すぎてた」", fix: "締切の前日・〇日前にプッシュ通知でリマインド。" },
            { worry: "「同じようなガクチカ、毎回ゼロから書いてる」", fix: "ESを企業ごとに保存して使い回し。文字数も自動カウント。" },
            { worry: "「今どの企業が、どこまで進んでるか分からない」", fix: "段階バーで「いまどこ」が一目。並行で受ける選考もそのまま。" },
            { worry: "「結果が出なくて、何も進んでない気がする…」", fix: "動いたぶん花畑が育つ。折れずに、続けられる。" },
          ].map((p, i) => (
            <div
              key={i}
              className="stg"
              style={{ transition: "opacity .5s ease, transform .6s cubic-bezier(.22,1,.36,1)", transitionDelay: `${i * 90}ms` }}
            >
              <div className="flex">
                <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-card px-4 py-2.5 text-[13.5px] leading-relaxed text-foreground/75 ring-1 ring-border">
                  {p.worry}
                </div>
              </div>
              <div className="mt-2 flex items-start gap-2 pl-3">
                <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <p className="text-[13.5px] font-medium leading-relaxed">{p.fix}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-11 max-w-md text-center">
          <p className="text-[16px] font-bold">それ、ぜんぶ就活Hubひとつで。</p>
          <div className="mt-4">
            <Cta label="無料で試す（登録不要）" />
          </div>
        </div>
      </section>

      {/* ===== 段階＞タスク ===== */}
      <section className="px-5 py-16" data-reveal>
        <SectionHead
          kicker="正確に管理"
          title={<>選考の「いま、どこ」が、ひと目で。</>}
          body={
            <>
              書類 → 一次 → 最終。進むほどに、いまどの段階で、次に何をやるかが分かる。並行で受ける選考も、提出して結果を待つ間も、状況そのままに整理できる。
            </>
          }
        />
        <div className="mx-auto mt-9 max-w-[340px]">
          <div className={cn("space-y-2.5 rounded-2xl bg-muted/40 p-4", fade)} data-theme="indigo">
            {mounted && flows.map((a) => <ApplicationCard key={a.id} app={a} onOpen={() => {}} />)}
          </div>
          <p className="mt-3 text-center text-[12px] text-muted-foreground">
            進行中・結果待ち・内定・不合格。通過した段階は緑、いまの段階はグレーで「どこまで来たか」が分かる。
          </p>
        </div>
      </section>

      {/* ===== スワイプ / イベント ===== */}
      <section className="bg-muted/40 px-5 py-16" data-reveal>
        <SectionHead
          kicker="一望できる"
          title={<>進捗・選考・イベントを、スワイプで。</>}
          body={<>横スワイプでページを行き来。説明会やOB訪問の申込締切も、選考と同じ場所でまとめて管理できる。</>}
        />
        <div className="mt-10 flex justify-center">
          <div className={fade}>
            <Phone w={236}>{mounted && <SwipePhone apps={apps} events={events} />}</Phone>
          </div>
        </div>
      </section>

      {/* ===== 通知 ===== */}
      <section className="px-5 py-16" data-reveal>
        <SectionHead
          kicker="忘れない"
          title={<>締切も予定も、プッシュ通知で。</>}
          body={
            <>
              ホーム画面に追加すれば、設定した時刻にスマホへ。毎朝のまとめも、締切の前日・〇日前のリマインドも選べる。提出忘れ・予約忘れを防ぐ。
            </>
          }
        />
        <div className="mx-auto mt-9 max-w-[320px] space-y-3">
          {[
            { tag: "毎朝まとめ", title: "就活Hub｜直近の予定", lines: ["6/21 土｜あおば食品・Webテスト", "6/24 水｜就活フェスタ・説明会"] },
            { tag: "前日リマインド", title: "就活Hub｜前日通知", lines: ["6/21 土｜あおば食品・Webテスト"] },
            { tag: "3日前リマインド", title: "就活Hub｜3日前通知", lines: ["6/24 水｜さくらネット・ES提出"] },
          ].map((n, i) => (
            <div key={n.title}>
              <div className="mb-1 ml-1 text-[11px] font-medium text-primary">{n.tag}</div>
              <div
                className="notifrise rounded-2xl border bg-card p-3.5 text-left shadow-[0_14px_34px_-10px_rgba(20,28,55,0.45)]"
                style={{ transitionDelay: `${i * 160}ms` }}
              >
                <div className="flex items-center gap-2 text-[12.5px] font-medium">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <GraduationCap className="h-3.5 w-3.5" />
                  </span>
                  {n.title}
                  <span className="ml-auto text-[10.5px] text-muted-foreground">now</span>
                </div>
                <div className="mt-2 space-y-1 text-[13px]">
                  {n.lines.map((l) => (
                    <div key={l}>{l}</div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 進捗(メンタル) ===== */}
      <section className="bg-muted/40 px-5 py-16" data-reveal>
        <SectionHead
          kicker="折れない"
          title={<>努力が、ちゃんと見える。</>}
          body={
            <>
              合格の数じゃなく、ESを何枚出して、説明会に何回行って、面接を何回受けたか。動いたぶん花畑が育つ。結果が出ない時期も、積み上げてきた自分が見える。
            </>
          }
        />
        <div className="mt-10 flex justify-center">
          <div ref={progRef} className={fade}>
            <Phone w={236}>{mounted && <ProgressScreen animated started={progAnim} />}</Phone>
          </div>
        </div>
      </section>

      {/* ===== テーマ展開 ===== */}
      <section className="overflow-hidden px-5 py-16 text-center" data-reveal>
        <SectionHead
          kicker="自分らしく"
          title={<>毎日ひらくものだから、好きな色で。</>}
          body={<>標準・藍鼠・水浅葱・茜・墨…和の12色。ライトもダークも。同じUIが、まるごと着替える。</>}
        />
        <div className="fan mt-4">
          <div className="fan-card" data-p="l2">
            <Phone w={150} theme="kohaku">{mounted && <SelectionScreen apps={apps} />}</Phone>
          </div>
          <div className="fan-card" data-p="l1">
            <Phone w={150} theme="mizuasagi">{mounted && <SelectionScreen apps={apps} />}</Phone>
          </div>
          <div className="fan-card" data-p="r1">
            <Phone w={150} theme="akane">{mounted && <SelectionScreen apps={apps} />}</Phone>
          </div>
          <div className="fan-card" data-p="r2">
            <Phone w={150} theme="sumi">{mounted && <SelectionScreen apps={apps} />}</Phone>
          </div>
          <div className="fan-card" data-p="c">
            <Phone w={168} theme="indigo">{mounted && <SelectionScreen apps={apps} />}</Phone>
          </div>
        </div>
      </section>

      {/* ===== 安心ポイント ===== */}
      <section className="bg-muted/40 px-5 py-16" data-reveal>
        <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
          {[
            { icon: Sparkles, t: "登録不要ですぐ", d: "メールも不要。開いたその場で試せる" },
            { icon: UserPlus, t: "あとで同期", d: "登録すればデータごと全端末で共有" },
            { icon: CloudOff, t: "オフラインOK", d: "電波がなくても開ける・書ける(PWA)" },
            { icon: Palette, t: "12色テーマ", d: "和の配色＋ライト/ダーク" },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <f.icon className="h-[22px] w-[22px] text-primary" />
              <div className="mt-2.5 text-[14px] font-semibold">{f.t}</div>
              <div className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="px-5 py-20 text-center" data-reveal>
        <h2 className="text-[24px] font-bold tracking-tight">今日から、迷わない就活を。</h2>
        <p className="mx-auto mt-3 max-w-xs text-[13.5px] text-muted-foreground">
          登録なしですぐ試せる。気に入ったらアカウント登録で、どの端末からでも。完全無料。
        </p>
        <div className="mt-8">
          <Cta label="まずは試す（登録不要）" />
        </div>
        <div className="mt-14 flex items-center justify-center gap-2 text-muted-foreground">
          <GraduationCap className="h-4 w-4" />
          <span className="text-[12px] font-medium">就活Hub</span>
        </div>
      </section>
    </main>
  );
}
