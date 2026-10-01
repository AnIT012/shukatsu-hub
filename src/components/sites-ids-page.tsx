"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, Eye, EyeOff, ShieldCheck } from "lucide-react";
import type { Application, QuickLink, RelatedLink } from "@/lib/types";
import { situationOf } from "@/lib/next-action";
import { cn, safeHref } from "@/lib/utils";
import { ListGroup } from "@/components/list-group";
import { QuickLinksPage } from "@/components/quick-links";

/**
 * 応募先のリンクから「マイページ」を1つ選ぶ。
 * ラベルにマイページを含む物を優先し、無ければ最初のピン留めリンク。開けないURLは数えない。
 */
function mypageLinkOf(app: Application): RelatedLink | null {
  const usable = app.links.filter((l) => safeHref(l.url) !== "#");
  return (
    usable.find((l) => /マイページ|my\s?page/i.test(l.label)) ??
    usable.find((l) => l.pin) ??
    null
  );
}

/** "https://example.com/path" → "example.com" */
function hostOf(url: string): string {
  return safeHref(url)
    .replace(/^https?:\/\//i, "")
    .replace(/[/?#].*$/, "");
}

const isEnded = (a: Application) => {
  const s = situationOf(a);
  return s === "rejected" || s === "declined";
};

/**
 * 下タブ「サイト・ID」の画面。
 * 上=各社のマイページとログインID(応募先から集めるだけ。ここでは編集しない) /
 * 下=よく使うサイト(この画面で開く・足す・直す)。パスワードは扱わない。
 */
export function SitesIdsPage({
  visible,
  applications,
  onOpenApp,
  links,
  onLinksChange,
  editSignal,
}: {
  /** この画面が前に出ているか。外れたら、見せていたIDを伏せ字に戻す */
  visible: boolean;
  applications: Application[];
  /** 行の本体を押した時、その企業の詳細を開く */
  onOpenApp: (id: string) => void;
  links: QuickLink[];
  onLinksChange: (next: QuickLink[]) => void;
  /** 値が変わるたびに、よく使うサイトの編集モードを開く(ヘッダーの＋から足した時など) */
  editSignal: number;
}) {
  const { active, ended, dupCompanies } = useMemo(() => {
    const rows = applications
      .filter((a) => (a.loginId?.trim() ?? "") !== "" || mypageLinkOf(a))
      .sort((x, y) => x.company.localeCompare(y.company, "ja"));
    const count = new Map<string, number>();
    for (const a of applications) {
      const c = a.company.trim();
      if (c) count.set(c, (count.get(c) ?? 0) + 1);
    }
    return {
      active: rows.filter((a) => !isEnded(a)),
      ended: rows.filter(isEnded),
      dupCompanies: new Set(
        [...count.entries()].filter(([, n]) => n >= 2).map(([c]) => c),
      ),
    };
  }, [applications]);

  const row = (app: Application) => (
    <MypageRow
      key={app.id}
      app={app}
      showRole={dupCompanies.has(app.company.trim())}
      visible={visible}
      onOpen={() => onOpenApp(app.id)}
    />
  );

  return (
    <div className="space-y-5">
      {active.length === 0 && ended.length === 0 ? (
        <section>
          <h2 className="mb-1.5 flex items-center gap-1.5 px-1 py-1 text-[12.5px] font-semibold text-muted-foreground">
            各社のマイページ
          </h2>
          <div className="rounded-xl border border-dashed px-4 py-5 text-center text-[13px] leading-relaxed text-muted-foreground">
            企業の詳細で ID やマイページを入れると、ここにまとまります。
          </div>
        </section>
      ) : (
        <>
          {active.length > 0 && (
            <ListGroup
              id="sites-mypages"
              title="各社のマイページ"
              count={active.length}
              dividerClassName="before:left-[62px]"
            >
              {active.map(row)}
            </ListGroup>
          )}
          {ended.length > 0 && (
            <ListGroup
              id="sites-mypages-ended"
              title="選考終了"
              count={ended.length}
              collapsible
              defaultOpen={false}
              dividerClassName="before:left-[62px]"
            >
              {ended.map(row)}
            </ListGroup>
          )}
        </>
      )}

      <QuickLinksPage
        links={links}
        onChange={onLinksChange}
        editSignal={editSignal}
      />

      <p className="flex items-start gap-1.5 px-1 text-[12px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-[3px] h-3.5 w-3.5 shrink-0" />
        <span>
          パスワードは保存しません。ログインは端末のパスワード管理（iCloud
          キーチェーンや Google パスワードマネージャー）にお任せください。
        </span>
      </p>
    </div>
  );
}

/** 1社1行。本体=企業の詳細を開く / 右=IDのコピーとマイページを開く */
function MypageRow({
  app,
  showRole,
  visible,
  onOpen,
}: {
  app: Application;
  showRole: boolean;
  visible: boolean;
  onOpen: () => void;
}) {
  const [copied, setCopied] = useState(false);
  // IDは常に伏せ字。目のアイコンで、この画面にいる間だけ見せられる(離れたら戻る)
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!visible) setRevealed(false);
  }, [visible]);
  const id = app.loginId?.trim() ?? "";
  const hidden = !revealed;
  const link = mypageLinkOf(app);
  const name = app.company.trim() || "（企業名なし）";
  const initial = Array.from(name)[0] ?? "";

  const copy = () => {
    // 伏せ字で表示していても、コピーするのは本物のID
    navigator.clipboard
      ?.writeText(id)
      .then(() => {
        toast.success("IDをコピーしました");
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1300);
      })
      .catch(() => toast.error("コピーできませんでした"));
  };

  return (
    <div className="flex items-center gap-0.5 pr-2">
      {/* 中に目のボタンを置くので、行の本体は button ではなく role=button の div */}
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-3 pl-3.5 pr-1 text-left transition-colors active:bg-muted/60"
      >
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-[15px] font-semibold text-primary"
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-foreground">
            {name}
            {showRole && app.role.trim() && (
              <span className="ml-1.5 text-[12.5px] font-normal text-muted-foreground">
                {app.role.trim()}
              </span>
            )}
          </span>
          {id ? (
            <span className="mt-0.5 flex min-w-0 items-baseline gap-1.5 text-[12.5px] text-muted-foreground">
              <span className="shrink-0 text-[11px] font-medium">ID</span>
              <span className="truncate font-mono tabular-nums tracking-wide text-foreground/80">
                {hidden ? "••••••" : id}
              </span>
              {(
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRevealed((v) => !v);
                  }}
                  aria-label={hidden ? "IDを表示" : "IDを隠す"}
                  title={hidden ? "IDを表示" : "IDを隠す"}
                  className="-my-1 flex shrink-0 items-center self-center rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground active:scale-95"
                >
                  {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
              )}
            </span>
          ) : (
            link && (
              <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                {hostOf(link.url)}
              </span>
            )
          )}
        </span>
      </div>

      {/* コピーと開くは列を固定する(片方しか無い行でも、もう片方の位置をずらさない) */}
      {!id && <span aria-hidden className="h-9 w-9 shrink-0" />}
      {id && (
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "コピーしました" : `${name}のIDをコピー`}
          title="IDをコピー"
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95",
            copied
              ? "bg-[hsl(var(--success)/0.12)] text-success"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {copied ? (
            <Check className="animate-evo-flip h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      )}
      {!link && <span aria-hidden className="h-9 w-9 shrink-0" />}
      {link && (
        <a
          href={safeHref(link.url)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${name}のマイページを開く`}
          title={link.label.trim() || "マイページを開く"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}
