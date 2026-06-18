"use client";

import { Sprout } from "lucide-react";

// 伴走コメント。急かさない・「もっと」を言わない・存在を認める。
// 活動量で3段階、各段3〜4フレーズを日替わり(日付 % フレーズ数)で出す。
const PHRASES: Record<"calm" | "moving" | "lots", string[]> = {
  // 静: まだ動きが少ない/久しぶり
  calm: [
    "おかえり。また一緒にやろ。",
    "今日も来てくれてうれしい。",
    "あせらなくていい、ここにいるよ。",
    "ひと息ついて、ゆっくりで大丈夫。",
  ],
  // 動: 積み上がってきている
  moving: [
    "ちゃんと積み上がってるよ。",
    "一歩ずつ進んでる、見てるからね。",
    "いい流れ。その調子。",
    "コツコツが効いてる。",
  ],
  // 多: たくさん動いた
  lots: [
    "これだけ動いた、お疲れさま。",
    "よくやったね、十分だよ。",
    "ここまで来た自分をほめていい。",
    "たくさん動いた日。ゆっくり休も。",
  ],
};

/** score = 積み上げ総数(やったタスク＋参加イベント)。0=静 / 1〜5=動 / 6+=多 */
export function CompanionComment({ score }: { score: number }) {
  const level = score >= 6 ? "lots" : score >= 1 ? "moving" : "calm";
  const phrases = PHRASES[level];
  // 日付ベースで日替わり(同じ日は固定)
  const day = Math.floor(Date.now() / 86_400_000);
  const text = phrases[day % phrases.length];

  return (
    <div className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-[13px] text-foreground/80">
      <Sprout className="h-4 w-4 shrink-0 text-success" />
      <span>{text}</span>
    </div>
  );
}
