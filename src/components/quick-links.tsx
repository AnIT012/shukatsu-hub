"use client";

import { ExternalLink, Globe, Plus, Trash2 } from "lucide-react";
import type { QuickLink } from "@/lib/types";
import { newId } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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

/** ヘッダーから開く、よく使うサイトのランチャー(ボトムシート)。 */
export function QuickLinksLauncher({
  open,
  onOpenChange,
  links,
  onManage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: QuickLink[];
  onManage: () => void;
}) {
  const usable = links.filter((l) => l.url.trim());
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <SheetContent
        side="bottom"
        className="max-h-[80vh] overflow-y-auto rounded-t-2xl px-5 pb-7 pt-4 scrollbar-thin"
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <SheetTitle className="text-base">よく使うサイト</SheetTitle>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onManage();
            }}
            className="text-[13px] font-medium text-primary"
          >
            編集
          </button>
        </div>

        {usable.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed px-4 py-8 text-center">
            <Globe className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-[13px] text-muted-foreground">
              外資就活・ワンキャリアなど、よく開くサイトを登録しておくと、ここからすぐ飛べます。
            </p>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onManage();
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              サイトを登録
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {usable.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => openLink(l.url)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-3 text-left transition-colors hover:bg-muted/50 active:scale-[0.99]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                  <Globe className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-foreground">
                    {l.label.trim() || l.url}
                  </span>
                  {l.label.trim() && (
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {normalizeUrl(l.url).replace(/^https?:\/\//, "")}
                    </span>
                  )}
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** 設定のサブページで使う、よく使うサイトの編集(追加/名前・URL/削除)。 */
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
        名前とURLを登録すると、ホーム右上のアイコンからワンタップで開けます。
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
