"use client";

import { Children, useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// 動きは全体で1つの緩急 cubic-bezier(.2,.8,.2,1) と 280ms に揃える。
// Tailwind はクラス名を文字列のまま拾うので、緩急はクラスに直書きする。
const DURATION = 280;
/** 初回の行の段差(1行あたり)と、段差を付ける行数の上限 */
const STAGGER = 30;
const STAGGER_CAP = 8;
const INTRO_MS = STAGGER * STAGGER_CAP + 260 + 60;

function reducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * 高さを 0 ⇄ 中身 に動かす入れ物(grid-template-rows: 0fr ⇄ 1fr)。
 * 開く: 中身を出してから伸ばす。閉じる: 縮めきってから中身を外す。
 * 動いている間と閉じている間だけ overflow を切る(開ききったら影や枠を切らない)。
 * 閉じている間は支援技術からも隠し、フォーカスも入らない(aria-hidden + inert)。
 */
export function Collapse({
  open,
  animate = true,
  className,
  children,
}: {
  open: boolean;
  /** false の間は動かさずに切り替える(保存値を読み込んだ直後など) */
  animate?: boolean;
  /** 中身側の入れ物に足すクラス(影や枠をはみ出させる余白など) */
  className?: string;
  children: React.ReactNode;
}) {
  // settled=false の間は「動いている」。前回の open と比べて描画中に切り替える(1フレームも中身をはみ出させない)
  const [s, setS] = useState({ open, settled: true });
  if (s.open !== open) {
    setS({ open, settled: !animate || reducedMotion() });
  }

  useEffect(() => {
    if (s.settled) return;
    const t = window.setTimeout(
      () => setS((p) => (p.open === s.open ? { ...p, settled: true } : p)),
      DURATION + 40,
    );
    return () => window.clearTimeout(t);
  }, [s]);

  const innerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (innerRef.current) innerRef.current.inert = !open;
  }, [open]);

  const showChildren = open || !s.settled;
  const clip = !open || !s.settled;

  return (
    <div
      aria-hidden={open ? undefined : true}
      className={cn(
        "grid",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        animate &&
          "transition-[grid-template-rows] duration-[280ms] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none",
      )}
    >
      <div ref={innerRef} className={cn("min-h-0", clip && "overflow-hidden", className)}>
        {showChildren && children}
      </div>
    </div>
  );
}

/**
 * 一覧のグループ。小さな見出し(名前＋件数)の下に白いパネル1枚、
 * その中に行を罫線で区切って並べる(1件1枚のカードにしない)。
 * collapsible のグループは見出し1行に畳めて、開閉は端末に覚えておく。
 */
export function ListGroup({
  id,
  title,
  count,
  collapsible = false,
  defaultOpen = true,
  children,
}: {
  /** 開閉を覚えるためのキー */
  id: string;
  title: string;
  count: number;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const key = `shukatsu-dashboard:group-open:${id}`;
  const [open, setOpen] = useState(defaultOpen);
  // 保存値を読み込むまでは動かさない(開いた瞬間に勝手に開閉が走らないように)
  const [ready, setReady] = useState(false);
  // 最初に出た時だけ、行を少しずつずらして浮かせる(並べ替えや再描画では動かさない)
  const [intro, setIntro] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setIntro(false), INTRO_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    let raf2 = 0;
    if (collapsible) {
      try {
        const v = localStorage.getItem(key);
        if (v === "1" || v === "0") setOpen(v === "1");
      } catch {
        // ignore
      }
    }
    // 読み込んだ状態が一度描かれてから動きを有効にする
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [collapsible, key]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(key, next ? "1" : "0");
    } catch {
      // ignore
    }
  };

  const header = (
    <>
      <span>{title}</span>
      <span className="tabular-nums text-muted-foreground/70">{count}</span>
      {collapsible && (
        <ChevronRight
          className={cn(
            "ml-auto h-4 w-4 text-muted-foreground/60",
            ready &&
              "transition-transform duration-[280ms] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none",
            open && "rotate-90",
          )}
        />
      )}
    </>
  );

  const panel = (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border elevate-sm">
      {Children.map(children, (child, i) => (
        // 区切り線は日付の列を除いた本文の列(x=78)から引く。列の始点をそろえる
        <div
          className={cn(
            "relative",
            i > 0 &&
              "before:absolute before:left-[78px] before:right-0 before:top-0 before:h-px before:bg-border",
            intro && "motion-safe:animate-row-in",
          )}
          style={
            intro
              ? { animationDelay: `${Math.min(i, STAGGER_CAP) * STAGGER}ms` }
              : undefined
          }
        >
          {child}
        </div>
      ))}
    </div>
  );

  return (
    <section>
      {collapsible ? (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="mb-1.5 flex w-full items-center gap-1.5 px-1 py-1 text-left text-[12.5px] font-semibold text-muted-foreground transition-opacity duration-150 active:opacity-60"
        >
          {header}
        </button>
      ) : (
        <h2 className="mb-1.5 flex items-center gap-1.5 px-1 py-1 text-[12.5px] font-semibold text-muted-foreground">
          {header}
        </h2>
      )}
      {collapsible ? (
        // 動いている間は overflow を切るので、枠(ring)と影の分だけ外へ余白を取って相殺する(見た目の位置は同じ)
        <Collapse open={open} animate={ready} className="-mx-1 -mb-1 -mt-px px-1 pb-1 pt-px">
          {panel}
        </Collapse>
      ) : (
        panel
      )}
    </section>
  );
}
