"use client";

import { CHANGELOG } from "@/lib/changelog";

function fmtDate(d: string): string {
  const [y, m, dd] = d.split("-");
  return `${y}年${Number(m)}月${Number(dd)}日`;
}

/** 設定 > 更新履歴 の中身。右スライドのサブページに埋め込む。 */
export function ChangelogBody() {
  return (
    <div className="space-y-5">
      {CHANGELOG.map((entry) => (
        <div key={entry.date}>
          <div className="mb-2 text-[12px] font-medium text-muted-foreground">
            {fmtDate(entry.date)}
          </div>
          <div className="space-y-2">
            {entry.items.map((it) => (
              <div
                key={it.title}
                className="flex items-start gap-2.5 rounded-lg bg-muted/50 p-2.5"
              >
                <it.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="text-[12.5px] font-medium">{it.title}</div>
                  <div className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
                    {it.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
