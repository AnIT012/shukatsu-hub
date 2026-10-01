"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Info, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TourStep {
  /** ハイライト対象の data-tour 値。無ければ中央表示 */
  tour?: string;
  title: string;
  body: string;
  /** このステップで企業詳細を開く必要があるか */
  openDetail?: boolean;
}

/** 対象とくり抜きの間 */
const PAD = 8;
/** くり抜きの角丸 */
const RADIUS = 14;
/** くり抜きとカードの間（矢印ぶんを含む） */
const GAP = 14;
/** 画面端からの余白 */
const MARGIN = 16;
const CARD_MAX = 340;
const DIM = "rgba(10,14,28,0.6)";
const EASE = "cubic-bezier(.2,.8,.2,1)";
const MOVE_MS = 380;
const ENTER_MS = 220;
const LEAVE_MS = 120;
const SLIDE_PX = 6;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * 画面に出している状態。
 * - enter: ステップが切り替わって最初の計測（カードは入り直す）
 * - settle: 同じステップの再計測（くり抜きもカードも滑らかに寄せる）
 * - track: スクロール・リサイズへの追従（遅れないよう即時）
 */
interface View {
  index: number;
  box: Box | null;
  mode: "enter" | "settle" | "track";
  vw: number;
  vh: number;
}

/**
 * 画面の物差し。文字サイズ設定は html に zoom を当てているので、getBoundingClientRect の数字と
 * この膜(position: fixed)の CSS の数字は尺度がずれる(90%だとくり抜きが上へずれた)。
 * どちらの尺度で返すかはブラウザで違うので、画面いっぱいの見えない箱を置いて、その場で比を測る。
 *  k  … getBoundingClientRect の 1 が、膜の CSS で何pxか
 *  vw/vh … 膜の CSS で測った画面の幅と高さ
 */
function measureScale(): { k: number; vw: number; vh: number } {
  try {
    const p = document.createElement("div");
    p.style.cssText =
      "position:fixed;left:0;top:0;width:100%;height:100%;visibility:hidden;pointer-events:none";
    document.body.appendChild(p);
    const r = p.getBoundingClientRect();
    const vw = p.offsetWidth || window.innerWidth;
    const vh = p.offsetHeight || window.innerHeight;
    p.remove();
    const k = r.width > 0 ? vw / r.width : 1;
    return { k, vw, vh };
  } catch {
    return { k: 1, vw: window.innerWidth, vh: window.innerHeight };
  }
}

function sameBox(a: Box | null, b: Box | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), Math.max(min, max));
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function Tutorial({
  steps,
  index,
  onNext,
  onBack,
  onClose,
}: {
  steps: TourStep[];
  index: number;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const [view, setView] = useState<View | null>(null);
  const [shown, setShown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cardH, setCardH] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const hadViewRef = useRef(false);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const step = steps[index];
  const tour = step?.tour;
  const openDetail = !!step?.openDetail;
  const hasStep = !!step;

  // 暗幕のフェードイン
  useEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, []);

  // Escape で閉じる（暗幕のタップでは閉じない）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 対象を探して画面内へ寄せ、測る
  useEffect(() => {
    if (!hasStep) return;
    let cancelled = false;
    let committed = false;
    let showRaf = 0;
    let moveRaf = 0;
    const timers: number[] = [];
    setShown(false);

    const find = () =>
      tour
        ? document.querySelector<HTMLElement>(`[data-tour="${tour}"]`)
        : null;

    const read = (): Box | null => {
      const el = find();
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return null;
      // 膜の CSS の尺度に直す(文字サイズ設定の zoom ぶん)
      const { k } = measureScale();
      return { top: r.top * k, left: r.left * k, width: r.width * k, height: r.height * k };
    };

    const commit = (mode: View["mode"]) => {
      if (cancelled) return;
      const box = read();
      const { vw, vh } = measureScale();
      const first = !committed;
      setView((prev) => {
        if (
          !first &&
          prev &&
          prev.index === index &&
          prev.vw === vw &&
          prev.vh === vh &&
          sameBox(prev.box, box)
        ) {
          return prev;
        }
        return { index, box, mode: first ? "enter" : mode, vw, vh };
      });
      if (first) {
        committed = true;
        hadViewRef.current = true;
        // 新しい位置で一度描いてから入場させる
        showRaf = requestAnimationFrame(() => {
          showRaf = requestAnimationFrame(() => {
            if (!cancelled) setShown(true);
          });
        });
      }
    };

    /** 画面外なら中央へ寄せる。寄せたら true */
    const reveal = () => {
      const el = find();
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const { k, vh } = measureScale();
      if (r.top * k >= 72 && r.bottom * k <= vh - 72) return false;
      el.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: reducedRef.current ? "auto" : "smooth",
      });
      return true;
    };

    // 詳細を開くステップは、シートが開ききるのを待ってから測る
    const base = openDetail ? 430 : hadViewRef.current ? 80 : 20;
    const settleAt = openDetail ? 780 : 320;
    timers.push(
      window.setTimeout(() => {
        if (cancelled) return;
        const scrolled = reveal();
        const firstAt =
          scrolled && !reducedRef.current ? 360 : openDetail ? 0 : 60;
        timers.push(window.setTimeout(() => commit("enter"), firstAt));
        timers.push(
          window.setTimeout(
            () => commit("settle"),
            Math.max(settleAt - base, firstAt + 300),
          ),
        );
      }, base),
    );

    const onMove = () => {
      if (!committed || moveRaf) return;
      moveRaf = requestAnimationFrame(() => {
        moveRaf = 0;
        commit("track");
      });
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    // 詳細シートが滑り込み終わった・開閉が終わった時にも測り直す(端末が遅いと settle の時点でまだ動いている)
    document.addEventListener("animationend", onMove, true);
    document.addEventListener("transitionend", onMove, true);

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      cancelAnimationFrame(showRaf);
      cancelAnimationFrame(moveRaf);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
      document.removeEventListener("animationend", onMove, true);
      document.removeEventListener("transitionend", onMove, true);
    };
  }, [index, tour, openDetail, hasStep]);

  // カードの高さ（上に置くときの位置決めに使う）。描画前に測り直す
  useLayoutEffect(() => {
    const h = cardRef.current?.offsetHeight ?? 0;
    if (h && Math.abs(h - cardH) > 0.5) setCardH(h);
  });

  // 入場したら主ボタンへフォーカス
  useEffect(() => {
    if (shown) primaryRef.current?.focus({ preventScroll: true });
  }, [shown, view?.index]);

  if (!step) return null;

  const vw = view?.vw ?? (typeof window === "undefined" ? 0 : measureScale().vw);
  const vh = view?.vh ?? (typeof window === "undefined" ? 0 : measureScale().vh);
  const box = view?.box ?? null;
  const dIndex = view ? Math.min(view.index, steps.length - 1) : index;
  const dStep = steps[dIndex] ?? step;
  const isFirst = dIndex === 0;
  const isLast = dIndex === steps.length - 1;
  const mode = view?.mode ?? "enter";

  // ── くり抜き ──
  const hole = box
    ? {
        top: box.top - PAD,
        left: box.left - PAD,
        width: box.width + PAD * 2,
        height: box.height + PAD * 2,
      }
    : { top: vh / 2, left: vw / 2, width: 0, height: 0 };
  const holeMove =
    reduced || mode === "track"
      ? "none"
      : ["top", "left", "width", "height"]
          .map((p) => `${p} ${MOVE_MS}ms ${EASE}`)
          .join(", ");

  // ── カードの位置 ──
  const cardW = Math.max(0, Math.min(CARD_MAX, vw - MARGIN * 2));
  const h = cardH || 180;
  let placement: "below" | "above" | "center" = "center";
  let cardTop = (vh - h) / 2;
  let cardLeft = (vw - cardW) / 2;
  let caretX = 0;
  let caret = false;
  if (box) {
    const holeBottom = hole.top + hole.height;
    const spaceBelow = vh - holeBottom - GAP - MARGIN;
    const spaceAbove = hole.top - GAP - MARGIN;
    placement =
      spaceBelow >= h
        ? "below"
        : spaceAbove >= h
          ? "above"
          : spaceBelow >= spaceAbove
            ? "below"
            : "above";
    const ideal = placement === "below" ? holeBottom + GAP : hole.top - GAP - h;
    cardTop = clamp(ideal, MARGIN, vh - MARGIN - h);
    // 収まらず対象に重なったときは矢印を出さない
    caret = Math.abs(cardTop - ideal) < 1;
    const cx = box.left + box.width / 2;
    cardLeft = clamp(cx - cardW / 2, MARGIN, vw - MARGIN - cardW);
    caretX = clamp(cx - cardLeft, 22, cardW - 22);
  }

  const offset = placement === "below" ? -SLIDE_PX : SLIDE_PX;
  const cardTransition = [
    `opacity ${shown ? ENTER_MS : LEAVE_MS}ms ease-out`,
    `transform ${ENTER_MS}ms ${EASE}`,
    ...(shown && mode === "settle" && !reduced
      ? [`top ${MOVE_MS}ms ${EASE}`, `left ${MOVE_MS}ms ${EASE}`]
      : []),
  ].join(", ");

  const centered = !box;
  const Icon = isFirst ? Sparkles : isLast ? Check : Info;

  const dots = (
    <div
      role="img"
      aria-label={`${dIndex + 1} / ${steps.length}`}
      className={cn("flex items-center gap-1.5", centered && "justify-center")}
    >
      {steps.map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none",
            i === dIndex
              ? "w-4 bg-primary"
              : i < dIndex
                ? "w-1.5 bg-primary/40"
                : "w-1.5 bg-muted-foreground/25",
          )}
        />
      ))}
    </div>
  );

  const closeButton = (
    <button
      type="button"
      aria-label="スキップ"
      onClick={onClose}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        centered ? "absolute right-3 top-3" : "-mr-2 -mt-1.5",
      )}
    >
      <X className="h-4 w-4" strokeWidth={2} />
    </button>
  );

  const footer = (
    <div className="mt-5 flex items-center justify-between gap-3">
      {isFirst ? (
        <span aria-hidden />
      ) : (
        <Button
          variant="ghost"
          onClick={onBack}
          className="-ml-2 h-10 px-3 text-muted-foreground hover:text-foreground"
        >
          戻る
        </Button>
      )}
      <Button
        ref={primaryRef}
        onClick={isLast ? onClose : onNext}
        className="h-10 rounded-full px-5"
      >
        {isLast ? "はじめる" : "次へ"}
      </Button>
    </div>
  );

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[60]"
      style={{
        opacity: mounted ? 1 : 0,
        transition: reduced ? "none" : "opacity 240ms ease-out",
      }}
    >
      {/* 暗幕とくり抜き（対象が無いときは中央で 0 まで縮めて全面を覆う） */}
      <div
        aria-hidden
        className="pointer-events-none fixed"
        style={{
          ...hole,
          borderRadius: RADIUS,
          boxShadow: `0 0 0 9999px ${DIM}`,
          transition: holeMove,
        }}
      />
      {/* 対象の縁 */}
      <div
        aria-hidden
        className="pointer-events-none fixed"
        style={{
          ...hole,
          borderRadius: RADIUS,
          boxShadow:
            "0 0 0 2px hsl(var(--primary) / 0.85), 0 0 0 7px hsl(var(--primary) / 0.16)",
          opacity: box ? 1 : 0,
          transition: [
            holeMove,
            `opacity ${reduced ? 0 : 200}ms ease-out`,
          ]
            .filter((t) => t !== "none")
            .join(", "),
        }}
      />

      {view && (
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-body"
          className={cn(
            "fixed z-[61] rounded-2xl bg-card shadow-2xl",
            centered ? "px-6 pb-5 pt-7 text-center" : "p-5 pt-4",
            !shown && "pointer-events-none",
          )}
          style={{
            top: cardTop,
            left: cardLeft,
            width: cardW,
            opacity: shown ? 1 : 0,
            transform:
              shown || reduced ? "translateY(0)" : `translateY(${offset}px)`,
            transition: cardTransition,
          }}
        >
          {caret && (
            <span
              aria-hidden
              className="absolute h-3 w-3 rotate-45 rounded-[3px] bg-card"
              style={{
                left: caretX - 6,
                ...(placement === "below" ? { top: -5 } : { bottom: -5 }),
              }}
            />
          )}

          {centered ? (
            <>
              {closeButton}
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
                style={{
                  boxShadow: "0 8px 20px -8px hsl(var(--primary) / 0.7)",
                }}
              >
                <Icon className="h-6 w-6" strokeWidth={2} />
              </div>
              <h2
                id="tour-title"
                className="mt-4 text-lg font-bold text-foreground"
              >
                {dStep.title}
              </h2>
              <p
                id="tour-body"
                className="mt-2 text-sm leading-relaxed text-muted-foreground"
              >
                {dStep.body}
              </p>
              <div className="mt-5">{dots}</div>
              {footer}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                {dots}
                {closeButton}
              </div>
              <h2
                id="tour-title"
                className="mt-2 text-base font-semibold text-foreground"
              >
                {dStep.title}
              </h2>
              <p
                id="tour-body"
                className="mt-1.5 text-sm leading-relaxed text-muted-foreground"
              >
                {dStep.body}
              </p>
              {footer}
            </>
          )}
        </div>
      )}
    </div>
  );
}
