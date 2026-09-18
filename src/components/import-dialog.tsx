"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ClipboardPaste,
  FileUp,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { parseImport, readFile } from "@/lib/io";
import { AI_IMPORT_PROMPT } from "@/lib/ai-import";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Source = "paste" | "file";
type Mode = "merge" | "replace";

export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { mergeImport, restoreFromRaw, applications, events } = useStore();
  const [source, setSource] = useState<Source>("paste");
  const [mode, setMode] = useState<Mode>("merge");
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 右からスライド + 右スワイプで戻る(設定サブページと同じ作法)
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number; axis: "" | "x" | "y" }>({
    x: 0,
    y: 0,
    axis: "",
  });
  const widthRef = useRef(0);

  const hasData = applications.length + events.length > 0;

  useEffect(() => {
    if (open) {
      setSource("paste");
      setMode("merge");
      setText("");
      setCopied(false);
      setDragX(0);
      setDragging(false);
    }
  }, [open]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_IMPORT_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      toast.success("AI用の指示をコピーしました", {
        description: "ChatGPTなどに貼り、自分のメモと一緒に送ってね",
      });
    } catch {
      toast.error("コピーできませんでした");
    }
  };

  const pasteClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (!t.trim()) {
        toast.info("クリップボードが空でした");
        return;
      }
      setText(t);
      toast.success("貼り付けました");
    } catch {
      toast.error("貼り付けできませんでした", {
        description: "入力欄を長押しして貼り付けてください",
      });
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const t = await readFile(file);
      setText(t);
      setSource("paste");
      toast.success("ファイルを読み込みました", {
        description: "内容を確認して「取り込む」を押してください",
      });
    } catch {
      toast.error("ファイルを読み込めませんでした");
    }
  };

  const doImport = () => {
    if (!text.trim()) {
      toast.info("JSONを貼り付けるか、ファイルを選んでください");
      return;
    }
    setBusy(true);
    try {
      const { applications: apps, events: evs } = parseImport(text);
      if (apps.length + evs.length === 0) {
        toast.info("取り込めるデータがありませんでした");
        return;
      }
      if (mode === "replace") {
        if (
          hasData &&
          !window.confirm(
            `今の 選考${applications.length}・予定${events.length} を、取り込む 選考${apps.length}・予定${evs.length} で置き換えます。よろしいですか？`,
          )
        )
          return;
        if (!restoreFromRaw(text)) {
          toast.error("取り込みに失敗しました");
          return;
        }
      } else {
        mergeImport(apps, evs);
      }
      const parts = [
        apps.length ? `選考${apps.length}` : "",
        evs.length ? `予定${evs.length}` : "",
      ].filter(Boolean);
      toast.success(
        `${parts.join("・")}を${mode === "replace" ? "置き換えました" : "追加しました"}`,
      );
      onOpenChange(false);
    } catch (err) {
      toast.error("取り込みに失敗しました", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <SheetContent
        side="right"
        onTouchStart={(e) => {
          startRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            axis: "",
          };
          widthRef.current = e.currentTarget.getBoundingClientRect().width;
        }}
        onTouchMove={(e) => {
          const dx = e.touches[0].clientX - startRef.current.x;
          const dy = e.touches[0].clientY - startRef.current.y;
          if (!startRef.current.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
            startRef.current.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
          }
          if (startRef.current.axis === "x") {
            if (!dragging) setDragging(true);
            setDragX(Math.max(0, dx));
          }
        }}
        onTouchEnd={() => {
          if (startRef.current.axis === "x") {
            setDragging(false);
            const threshold = Math.min(120, widthRef.current * 0.33);
            if (dragX > threshold) {
              setDragX(widthRef.current || 420);
              window.setTimeout(() => onOpenChange(false), 220);
            } else {
              setDragX(0);
            }
          }
          startRef.current.axis = "";
        }}
        style={{
          transform: dragX ? `translateX(${dragX}px)` : undefined,
          transition: dragging ? "none" : "transform 0.22s ease-out",
        }}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetTitle className="sr-only">取り込み</SheetTitle>
        <div className="sticky top-0 z-20 flex items-center border-b bg-card px-3 py-2.5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-1 text-sm font-medium text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold">
            取り込み
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8 pt-4 scrollbar-thin">
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          バックアップや、AIに整理してもらったJSONから選考・予定をまとめて取り込めます。
        </p>

        {/* AIに整理してもらう */}
        <div className="mt-4 rounded-2xl border border-primary/25 bg-accent/50 p-3.5">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            AIに整理してもらう
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
            下のボタンで「指示文」をコピーして、ChatGPTなどに自分のメモや募集要項と一緒に貼り付け。返ってきたJSONをこの下に貼れば取り込めます。
          </p>
          <button
            type="button"
            onClick={copyPrompt}
            className={cn(
              "mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-semibold transition-colors active:scale-[0.99]",
              copied
                ? "bg-success text-white"
                : "bg-primary text-primary-foreground hover:opacity-90",
            )}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                コピーしました
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                AI用の指示をコピー
              </>
            )}
          </button>
        </div>

        {/* 入力方法 */}
        <div className="mt-5">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            <SegBtn
              active={source === "paste"}
              onClick={() => setSource("paste")}
              icon={<ClipboardPaste className="h-3.5 w-3.5" />}
              label="貼り付け"
            />
            <SegBtn
              active={source === "file"}
              onClick={() => {
                setSource("file");
                fileRef.current?.click();
              }}
              icon={<FileUp className="h-3.5 w-3.5" />}
              label="ファイル"
            />
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={onPickFile}
          />

          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[12px] font-medium text-muted-foreground">
              JSONを貼り付け
            </span>
            <button
              type="button"
              onClick={pasteClipboard}
              className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              クリップボードから貼り付け
            </button>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='{ "applications": [ ... ], "events": [ ... ] }'
            className="mt-1.5 min-h-[120px] resize-y font-mono text-[12px] leading-relaxed"
          />
        </div>

        {/* 取り込み方 */}
        <div className="mt-4">
          <div className="mb-1.5 text-[12px] font-medium text-muted-foreground">
            取り込み方
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ModeBtn
              active={mode === "merge"}
              onClick={() => setMode("merge")}
              title="追加する"
              desc="今のデータに足す"
            />
            <ModeBtn
              active={mode === "replace"}
              onClick={() => setMode("replace")}
              title="置き換える"
              desc="今のを消して入れ直す"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={doImport}
          disabled={busy || !text.trim()}
          className="mt-5 w-full rounded-xl bg-primary py-3 text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-40"
        >
          取り込む
        </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SegBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ModeBtn({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition-colors",
        active
          ? "border-primary bg-accent"
          : "border-border hover:bg-muted/50",
      )}
    >
      <span className="text-[13px] font-semibold text-foreground">{title}</span>
      <span className="text-[11px] text-muted-foreground">{desc}</span>
    </button>
  );
}
