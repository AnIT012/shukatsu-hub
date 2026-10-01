"use client";

import { Children, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    if (!collapsible) return;
    try {
      const v = localStorage.getItem(key);
      if (v === "1" || v === "0") setOpen(v === "1");
    } catch {
      // ignore
    }
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
            "ml-auto h-4 w-4 text-muted-foreground/60 transition-transform duration-200",
            open && "rotate-90",
          )}
        />
      )}
    </>
  );

  return (
    <section>
      {collapsible ? (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="mb-1.5 flex w-full items-center gap-1.5 px-1 py-1 text-left text-[12.5px] font-semibold text-muted-foreground"
        >
          {header}
        </button>
      ) : (
        <h2 className="mb-1.5 flex items-center gap-1.5 px-1 py-1 text-[12.5px] font-semibold text-muted-foreground">
          {header}
        </h2>
      )}
      {(!collapsible || open) && (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border elevate-sm">
          {Children.map(children, (child, i) => (
            // 区切り線は日付の列を除いた本文の列(x=78)から引く。列の始点をそろえる
            <div
              className={cn(
                "relative",
                i > 0 &&
                  "before:absolute before:left-[78px] before:right-0 before:top-0 before:h-px before:bg-border",
              )}
            >
              {child}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
