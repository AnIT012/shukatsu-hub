"use client";

import { ChevronRight, Leaf } from "lucide-react";

// メイン上部の伴走コメント。進捗には依存しない（数字は出さない）。
// 選考とイベントで別プール（被らせない）。日替わりで回す。
// 「のぞく/見てみよ」等ページ遷移を誤解させる文言は入れない（タップで進捗ページへ飛ぶため）。
const SELECTION_PHRASES = [
  "おかえり。今日も一緒にやろ",
  "来てくれてうれしい",
  "あせらなくていい、ここにいるよ",
  "ひと息ついてからで大丈夫",
  "きみのペースでいい",
  "見てるからね、ちゃんと",
  "今日のきみも、よくやってる",
  "無理しすぎないでね",
  "大丈夫、ちゃんと進んでる",
  "比べなくていい、きみはきみ",
  "疲れたら休んでいい",
  "一歩でも、立派な一歩",
  "今日も来た、それで十分",
  "ちょっとずつでいいんだよ",
  "きみの努力、知ってるよ",
  "うまくいかない日も、悪くない",
  "深呼吸、いこっか",
  "今日のきみに、おつかれさま",
];

const EVENTS_PHRASES = [
  "知るって、力になる",
  "動いたぶん、視野が広がる",
  "今日もよく動いてる",
  "外に出るの、えらいよ",
  "ひとつ知れば、ひとつ進む",
  "焦らず、ひとつずつ",
  "きみの好奇心、いいね",
  "世界は思ったより広い",
  "今日の一歩、ちゃんと残る",
  "無理なく、いこう",
  "興味の数だけ、道がある",
  "休む日があってもいい",
  "きみの行動、見てるよ",
  "一歩ぶん、前に進んでる",
  "出会いは、どこにでもある",
];

/** 日替わりインデックス(同じ日は固定) */
function dayIndex(len: number): number {
  return Math.floor(Date.now() / 86_400_000) % Math.max(1, len);
}

/** メイン上部の一言。タップで進捗ページへ。背景はテーマ色の薄い版(テーマ追従)。 */
export function CompanionComment({
  variant,
  onClick,
}: {
  variant: "selection" | "events";
  onClick?: () => void;
}) {
  const pool = variant === "selection" ? SELECTION_PHRASES : EVENTS_PHRASES;
  const text = pool[dayIndex(pool.length)];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-xl bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-left text-[13px] text-foreground/80 transition-colors hover:bg-[hsl(var(--primary)/0.1)] active:scale-[0.99]"
    >
      <Leaf className="h-4 w-4 shrink-0 text-success" />
      <span className="flex-1">{text}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </button>
  );
}

// 進捗ページ用: 活動量(歩数)で変わる、数字入りの伴走文。
const PROGRESS_TIERS: { max: number; lines: ((n: number) => string)[] }[] = [
  {
    max: 0,
    lines: [() => "ここから一緒に始めよう", () => "今日が1歩目"],
  },
  {
    max: 5,
    lines: [(n) => `もう${n}回うごいた、いいスタート`, () => "踏み出せてる"],
  },
  {
    max: 15,
    lines: [
      (n) => `ここまで${n}回。ちゃんと積み上がってる`,
      () => "場数になってきたね",
    ],
  },
  {
    max: 30,
    lines: [(n) => `${n}回も動いた、本当にすごい`, () => "よく回してる"],
  },
  {
    max: Infinity,
    lines: [
      (n) => `${n}回。ここまで来た自分を誇っていい`,
      () => "十分動いた、あとは待つだけ",
    ],
  },
];

export function progressPhrase(total: number): string {
  const tier = PROGRESS_TIERS.find((t) => total <= t.max) ?? PROGRESS_TIERS[0];
  const line = tier.lines[dayIndex(tier.lines.length)];
  return line(total);
}
