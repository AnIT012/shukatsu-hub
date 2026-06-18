"use client";

import { useMemo } from "react";
import {
  ClipboardList,
  FileText,
  Flower2,
  Leaf,
  MessagesSquare,
  Sprout,
  Users,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { effortSummary } from "@/lib/next-action";
import { progressPhrase } from "@/components/companion-comment";

// 努力(歩数)で花畑が育つ。花＝テーマ色(primary)の濃淡 / 葉＝緑。
// 0=芽だけ / 1〜9=数輪 / 10〜24=そこそこ / 25〜44=にぎやか / 45〜=満開
function flowerCount(total: number): number {
  if (total <= 0) return 0;
  if (total <= 9) return 3;
  if (total <= 24) return 5;
  if (total <= 44) return 7;
  return 9;
}

const SIZES = [26, 34, 22, 30, 24, 36, 21, 32, 27];
const OPACITIES = [1, 0.85, 0.7, 0.95, 0.78, 1, 0.72, 0.9, 0.82];

function FlowerField({ total }: { total: number }) {
  const count = flowerCount(total);
  if (count === 0) {
    return (
      <div className="flex h-[64px] items-end justify-center">
        <Sprout className="text-success" size={40} />
      </div>
    );
  }
  return (
    <div className="flex h-[64px] items-end justify-center gap-0.5">
      {Array.from({ length: count }, (_, i) => {
        const size = SIZES[i % SIZES.length];
        // 3つに1つは緑の葉、それ以外はテーマ色の花
        if (i % 3 === 1) {
          return (
            <Sprout key={i} className="text-success" size={Math.round(size * 0.8)} />
          );
        }
        return (
          <Flower2
            key={i}
            className="text-primary"
            size={size}
            style={{ opacity: OPACITIES[i % OPACITIES.length] }}
          />
        );
      })}
    </div>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-2xl font-semibold text-foreground">{value}</span>
      </div>
      <div className="mt-1 text-[12px] text-muted-foreground">{label}</div>
    </div>
  );
}

export function ProgressView() {
  const { applications, events } = useStore();
  const effort = useMemo(() => effortSummary(applications), [applications]);
  const attended = useMemo(
    () => events.filter((e) => e.status === "attended").length,
    [events],
  );
  const total = effort.docs + effort.webtest + effort.interview + attended;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <h1 className="mb-3 px-0.5 text-[15px] font-semibold">積み上げ</h1>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(20,28,55,0.05),0_6px_16px_rgba(20,28,55,0.05)]">
        {/* 花畑ヒーロー(テーマ色の薄背景) */}
        <div className="bg-[hsl(var(--primary)/0.06)] px-4 pt-5">
          <FlowerField total={total} />
          <div className="mt-3 flex items-end justify-center gap-1.5">
            <span className="text-[34px] font-semibold leading-none">{total}</span>
            <span className="pb-0.5 text-[13px] text-muted-foreground">
              歩、動いた
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5 pb-4 pt-1.5 text-[12.5px] text-muted-foreground">
            <Leaf className="h-3.5 w-3.5 text-success" />
            {progressPhrase(total)}
          </div>
        </div>

        {/* 指標(積み上げ) */}
        <div className="grid grid-cols-2 gap-2.5 p-4">
          <Metric
            icon={<FileText className="h-[17px] w-[17px]" />}
            value={effort.docs}
            label="ES提出"
          />
          <Metric
            icon={<Users className="h-[17px] w-[17px]" />}
            value={attended}
            label="説明会・イベント"
          />
          <Metric
            icon={<ClipboardList className="h-[17px] w-[17px]" />}
            value={effort.webtest}
            label="Webテスト"
          />
          <Metric
            icon={<MessagesSquare className="h-[17px] w-[17px]" />}
            value={effort.interview}
            label="面接・GD"
          />
        </div>
      </div>
    </div>
  );
}
