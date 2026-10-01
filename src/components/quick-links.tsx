"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, Globe, Pencil, Plus, Trash2 } from "lucide-react";
import type { QuickLink } from "@/lib/types";
import { newId } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** URLにスキームが無ければ https:// を補う。 */
export function normalizeUrl(url: string): string {
  const t = url.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function openLink(url: string) {
  const u = normalizeUrl(url);
  if (!u) return;
  window.open(u, "_blank", "noopener,noreferrer");
}

/**
 * 下タブ「サイト・ID」の2つ目の節。よく使う外部サイトを開く・足す・直すを、この節で完結させる。
 * 表示=押すと新しいタブで開く一覧 / 編集=その場で名前・URL・削除(別画面へ飛ばさない)。
 */
export function QuickLinksPage({
  links,
  onChange,
  editSignal,
}: {
  links: QuickLink[];
  onChange: (next: QuickLink[]) => void;
  /** 値が変わるたびに編集モードを開く(ヘッダーの＋から足した時など) */
  editSignal: number;
}) {
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (editSignal > 0) setEditing(true);
  }, [editSignal]);

  const usable = links.filter((l) => l.url.trim());
  const add = () => {
    onChange([...links, { id: newId(), label: "", url: "" }]);
    setEditing(true);
  };

  if (links.length === 0) {
    // 画面の2つ目の節なので、大きな空の状態にはしない(見出し＋1行＋小さな追加)
    return (
      <section>
        <h2 className="mb-1.5 flex items-center gap-1.5 px-1 py-1 text-[12.5px] font-semibold text-muted-foreground">
          よく使うサイト
        </h2>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-5 text-center">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            よく開くサイトを登録すると、押すだけで開けます。
          </p>
          <button
            type="button"
            onClick={add}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-card px-3.5 text-[13px] font-medium text-foreground transition-transform active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            サイトを追加
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-1.5 flex items-center gap-1.5 px-1">
        <h2 className="text-[12.5px] font-semibold text-muted-foreground">
          よく使うサイト{" "}
          <span className="tabular-nums text-muted-foreground/70">{usable.length}</span>
        </h2>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors active:scale-95",
            editing
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {editing ? (
            <>
              <Check className="h-3.5 w-3.5" />
              完了
            </>
          ) : (
            <>
              <Pencil className="h-3.5 w-3.5" />
              編集
            </>
          )}
        </button>
      </div>

      {editing ? (
        <QuickLinksManager links={links} onChange={onChange} />
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border elevate-sm">
          {usable.map((l, i) => (
            <button
              key={l.id}
              type="button"
              onClick={() => openLink(l.url)}
              className={cn(
                "relative flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors active:bg-muted/60",
                i > 0 &&
                  "before:absolute before:left-[62px] before:right-0 before:top-0 before:h-px before:bg-border",
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <Globe className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-foreground">
                  {l.label.trim() || normalizeUrl(l.url).replace(/^https?:\/\//, "")}
                </span>
                <span className="block truncate text-[12px] text-muted-foreground">
                  {normalizeUrl(l.url).replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </span>
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            </button>
          ))}
          {usable.length === 0 && (
            <p className="px-4 py-4 text-[13px] text-muted-foreground">
              URLが入っているサイトがありません。「編集」から入れてください。
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** サイト画面の編集モードで使う、よく使うサイトの編集(追加/名前・URL/削除)。 */
export function QuickLinksManager({
  links,
  onChange,
}: {
  links: QuickLink[];
  onChange: (next: QuickLink[]) => void;
}) {
  const update = (id: string, patch: Partial<QuickLink>) =>
    onChange(links.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const remove = (id: string) => onChange(links.filter((l) => l.id !== id));
  const add = () =>
    onChange([...links, { id: newId(), label: "", url: "" }]);

  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        名前とURLを入れると、一覧から押すだけで開けます。
      </p>

      {links.length === 0 ? (
        <div className="rounded-2xl border border-dashed px-4 py-8 text-center">
          <Globe className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-[13px] text-muted-foreground">
            まだ登録がありません
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {links.map((l, i) => (
            <div
              key={l.id}
              className="rounded-2xl border border-border bg-card p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium text-muted-foreground">
                  サイト{i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => remove(l.id)}
                  aria-label="このサイトを削除"
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-danger/5 hover:text-danger active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  削除
                </button>
              </div>
              <div className="space-y-2">
                <Input
                  value={l.label}
                  onChange={(e) => update(l.id, { label: e.target.value })}
                  placeholder="名前（例: 外資就活）"
                  className="h-9"
                />
                <Input
                  value={l.url}
                  onChange={(e) => update(l.id, { url: e.target.value })}
                  placeholder="URL（例: gaishishukatsu.com）"
                  inputMode="url"
                  className="h-9"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={add}
        className={cn(
          "flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 active:scale-[0.99]",
        )}
      >
        <Plus className="h-4 w-4" />
        サイトを追加
      </button>
    </div>
  );
}
