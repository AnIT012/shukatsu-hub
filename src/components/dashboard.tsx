"use client";

import { useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Check,
  Download,
  GraduationCap,
  Inbox,
  Loader2,
  LogOut,
  MoreVertical,
  Moon,
  Plus,
  SearchX,
  Sun,
  Upload,
} from "lucide-react";
import type { Filters, Priority, SortKey } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { getNextAction, hasThisWeekTask, thisWeekTaskCount } from "@/lib/next-action";
import { todayLabel, todayShortLabel } from "@/lib/date";
import { exportApplications, parseBackup, readFile } from "@/lib/io";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SummaryBar } from "@/components/summary-bar";
import { ControlsBar } from "@/components/controls-bar";
import { ApplicationCard } from "@/components/application-card";
import { ApplicationDetail } from "@/components/application-detail";
import { AddApplicationDialog } from "@/components/add-application-dialog";

const DEFAULT_FILTERS: Filters = {
  result: "all",
  priority: "all",
  onlyThisWeek: false,
  query: "",
};

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export function Dashboard() {
  const store = useStore();
  const { applications, loaded, replaceAll } = store;

  const [sort, setSort] = useState<SortKey>("deadline");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(
    () => ({
      total: applications.length,
      inProgress: applications.filter((a) => a.result === "in_progress").length,
      passed: applications.filter((a) => a.result === "passed").length,
      thisWeekTasks: applications.reduce((n, a) => n + thisWeekTaskCount(a), 0),
    }),
    [applications],
  );

  const visible = useMemo(() => {
    let list = applications.slice();
    if (filters.result !== "all")
      list = list.filter((a) => a.result === filters.result);
    if (filters.priority !== "all")
      list = list.filter((a) => a.priority === filters.priority);
    if (filters.onlyThisWeek) list = list.filter(hasThisWeekTask);
    const q = filters.query.trim().toLowerCase();
    if (q)
      list = list.filter(
        (a) =>
          a.company.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q),
      );

    const decorated = list.map((a) => ({ a, na: getNextAction(a) }));
    decorated.sort((x, y) => {
      if (sort === "priority") {
        return (
          PRIORITY_RANK[x.a.priority] - PRIORITY_RANK[y.a.priority] ||
          x.na.sortKey - y.na.sortKey
        );
      }
      if (sort === "name") {
        return x.a.company.localeCompare(y.a.company, "ja");
      }
      // deadline
      return (
        x.na.sortKey - y.na.sortKey ||
        x.a.company.localeCompare(y.a.company, "ja")
      );
    });
    return decorated.map((d) => d.a);
  }, [applications, filters, sort]);

  const handleExport = () => {
    if (applications.length === 0) {
      toast.info("エクスポートするデータがありません");
      return;
    }
    exportApplications(applications);
    toast.success("バックアップを書き出しました");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await readFile(file);
      const apps = parseBackup(text);
      if (
        applications.length > 0 &&
        !window.confirm(
          `現在の${applications.length}件を置き換えて ${apps.length}件 を読み込みます。\n先にエクスポートでのバックアップを推奨します。続けますか？`,
        )
      ) {
        return;
      }
      replaceAll(apps);
      toast.success(`${apps.length}社を読み込みました`);
    } catch (err) {
      toast.error("読み込みに失敗しました", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        読み込み中…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="hidden truncate text-base font-bold leading-tight sm:block">
              就活ダッシュボード
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              {todayLabel()}
            </p>
            <p className="text-sm font-semibold leading-tight sm:hidden">
              {todayShortLabel()}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <SaveIndicator />
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportFile}
            />
            <div className="hidden items-center gap-1.5 sm:flex">
              <AccountMenu />
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileRef.current?.click()}
                title="インポート(JSON)"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExport}
                title="エクスポート(JSON)"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <HeaderMenu
              onImport={() => fileRef.current?.click()}
              onExport={handleExport}
            />
            <Button onClick={() => setAddOpen(true)} className="ml-0.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">企業を追加</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        {applications.length === 0 ? (
          <EmptyState
            onAdd={() => setAddOpen(true)}
            onImport={() => fileRef.current?.click()}
          />
        ) : (
          <>
            <SummaryBar
              total={stats.total}
              inProgress={stats.inProgress}
              passed={stats.passed}
              thisWeekTasks={stats.thisWeekTasks}
              thisWeekActive={filters.onlyThisWeek}
              onToggleThisWeek={() =>
                setFilters((f) => ({ ...f, onlyThisWeek: !f.onlyThisWeek }))
              }
            />

            <ControlsBar
              sort={sort}
              onSortChange={setSort}
              filters={filters}
              onFiltersChange={setFilters}
            />

            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
                <SearchX className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  条件に一致する企業がありません
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                >
                  フィルターをリセット
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {visible.map((app) => (
                  <div key={app.id} className="animate-fade-in">
                    <ApplicationCard
                      app={app}
                      onOpen={() => setSelectedId(app.id)}
                    />
                  </div>
                ))}
              </div>
            )}

            <p className="pt-2 text-center text-xs text-muted-foreground">
              {visible.length} / {applications.length} 社を表示
            </p>
          </>
        )}
      </main>

      <AddApplicationDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(id, name) => {
          setSelectedId(id);
          toast.success(`「${name}」を追加しました`);
        }}
      />

      <ApplicationDetail
        appId={selectedId}
        onOpenChange={(o) => {
          if (!o) setSelectedId(null);
        }}
        onDeleted={(name) => {
          setSelectedId(null);
          toast.success(`「${name}」を削除しました`);
        }}
      />
    </div>
  );
}

function SaveIndicator() {
  const { saveState, lastSavedAt } = useStore();
  if (saveState === "saving") {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        保存中…
      </span>
    );
  }
  if (saveState === "saved") {
    const t = lastSavedAt ? new Date(lastSavedAt) : null;
    const hhmm = t
      ? `${t.getHours()}:${String(t.getMinutes()).padStart(2, "0")}`
      : "";
    return (
      <span className="hidden animate-fade-in items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 sm:flex">
        <Check className="h-3.5 w-3.5" />
        保存しました{hhmm && ` ${hhmm}`}
      </span>
    );
  }
  return null;
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title="テーマ切替"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function HeaderMenu({
  onImport,
  onExport,
}: {
  onImport: () => void;
  onExport: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const { mode, signOut } = useAuth();
  const isDark = resolvedTheme === "dark";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="sm:hidden" aria-label="メニュー">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>
          {isDark ? <Sun /> : <Moon />}
          {isDark ? "ライトモード" : "ダークモード"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImport}>
          <Upload />
          インポート（JSON）
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExport}>
          <Download />
          エクスポート（JSON）
        </DropdownMenuItem>
        {mode === "cloud" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await signOut();
                toast.success("ログアウトしました");
              }}
            >
              <LogOut />
              ログアウト
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountMenu() {
  const { mode, user, signOut } = useAuth();
  if (mode !== "cloud" || !user) return null;
  return (
    <div className="flex items-center gap-1">
      <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground md:inline">
        {user.email}
      </span>
      <Button
        variant="ghost"
        size="icon"
        title="ログアウト"
        onClick={async () => {
          await signOut();
          toast.success("ログアウトしました");
        }}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}

function EmptyState({
  onAdd,
  onImport,
}: {
  onAdd: () => void;
  onImport: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Inbox className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="mt-5 text-lg font-semibold">まだ企業が登録されていません</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        最初の企業を追加して、エントリー・ES・面接などの選考ステップと締切を登録しよう。毎朝ここを開けば「次にやること」が一目でわかる。
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4" />
          最初の企業を追加
        </Button>
        <Button variant="outline" onClick={onImport}>
          <Upload className="h-4 w-4" />
          JSONから復元
        </Button>
      </div>
    </div>
  );
}
