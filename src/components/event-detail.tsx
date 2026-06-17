"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ExternalLink,
  Link2,
  MapPin,
  Pencil,
  Pin,
  Plus,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import type { EventItem, EventStatus, VenueMode } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { focusOf } from "@/lib/next-action";
import { formatDue, joinDue, relativeLabel, splitDue, urgencyOf } from "@/lib/date";
import { cn, safeHref } from "@/lib/utils";

const VENUE_OPTIONS: { value: VenueMode; label: string }[] = [
  { value: "", label: "未設定" },
  { value: "online", label: "オンライン" },
  { value: "onsite", label: "対面" },
];

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: "todo", label: "未参加" },
  { value: "attended", label: "参加済" },
  { value: "declined", label: "辞退" },
];

export function EventDetail({
  eventId,
  onOpenChange,
  onDeleted,
}: {
  eventId: string | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (name: string) => void;
}) {
  const { events } = useStore();
  const ev = events.find((e) => e.id === eventId) ?? null;
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; axis: "" | "x" | "y" }>({
    x: 0,
    y: 0,
    axis: "",
  });
  const widthRef = useRef(0);

  useEffect(() => {
    if (eventId) {
      setDragX(0);
      setDragging(false);
    }
  }, [eventId]);

  return (
    <Sheet open={!!eventId} onOpenChange={(o) => !o && onOpenChange(false)}>
      <SheetContent
        side="right"
        onTouchStart={(e) => {
          start.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            axis: "",
          };
          widthRef.current = e.currentTarget.getBoundingClientRect().width;
        }}
        onTouchMove={(e) => {
          const dx = e.touches[0].clientX - start.current.x;
          const dy = e.touches[0].clientY - start.current.y;
          if (!start.current.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
            start.current.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
          }
          if (start.current.axis === "x") {
            if (!dragging) setDragging(true);
            setDragX(Math.max(0, dx));
          }
        }}
        onTouchEnd={() => {
          if (start.current.axis === "x") {
            setDragging(false);
            const threshold = Math.min(120, widthRef.current * 0.33);
            if (dragX > threshold) {
              setDragX(widthRef.current || 420);
              window.setTimeout(() => onOpenChange(false), 220);
            } else {
              setDragX(0);
            }
          }
          start.current.axis = "";
        }}
        style={{
          transform: dragX ? `translateX(${dragX}px)` : undefined,
          transition: dragging ? "none" : "transform 0.22s ease-out",
        }}
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 scrollbar-thin sm:max-w-md"
      >
        {ev ? (
          <EventDetailBody
            ev={ev}
            onClose={() => onOpenChange(false)}
            onDeleted={onDeleted}
          />
        ) : (
          <SheetTitle className="sr-only">イベント詳細</SheetTitle>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InfoBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success";
}) {
  const cls =
    tone === "success"
      ? "bg-[hsl(var(--success)/0.14)] text-success ring-[hsl(var(--success)/0.4)]"
      : "bg-secondary text-foreground ring-[hsl(var(--muted-foreground)/0.32)]";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium ring-1 ring-inset",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function EventDetailBody({
  ev,
  onClose,
  onDeleted,
}: {
  ev: EventItem;
  onClose: () => void;
  onDeleted: (name: string) => void;
}) {
  const {
    updateEvent,
    deleteEvent,
    addEventLink,
    updateEventLink,
    deleteEventLink,
  } = useStore();
  const [editBasic, setEditBasic] = useState(false);
  const [editSchedule, setEditSchedule] = useState(false);
  const [editLinks, setEditLinks] = useState(false);
  const [editMemo, setEditMemo] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pinnedCount = ev.links.filter((l) => l.pin).length;

  const apply = splitDue(ev.applyBy);
  const held = splitDue(ev.heldAt);
  const f = focusOf(ev.applyBy, ev.heldAt, ev.applyDone);
  const u = ev.status === "todo" && f.date ? urgencyOf(f.date) : "none";
  const urgent = u === "overdue" || u === "soon" || u === "near";
  const venueLabel =
    ev.venueMode === "online"
      ? "オンライン"
      : ev.venueMode === "onsite"
        ? `対面${ev.venuePlace ? ` · ${ev.venuePlace}` : ""}`
        : "";

  return (
    <>
      <SheetTitle className="sr-only">
        {ev.title || ev.company || "イベント"} の詳細
      </SheetTitle>
      <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-card px-3 py-2.5">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 text-sm font-medium text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          戻る
        </button>
      </div>

      <div className="px-4 py-4">
        {/* イベント名・企業名(タップで基本情報を編集) */}
        {!editBasic && (
          <button
            type="button"
            onClick={() => setEditBasic(true)}
            className="group block text-left"
          >
            <h2 className="text-lg font-semibold leading-tight">
              {ev.title || "(イベント名未設定)"}
              <Pencil className="ml-1.5 inline h-3.5 w-3.5 align-baseline text-muted-foreground/50" />
            </h2>
            {ev.company && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {ev.company}
              </p>
            )}
          </button>
        )}

        {/* 基本情報: バッジ表示 / ✎編集(イベント名・企業名もここで編集) */}
        {editBasic ? (
          <div className="mt-3 space-y-2 rounded-xl border-2 border-[hsl(var(--primary)/0.35)] bg-card p-3">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Pencil className="h-4 w-4 text-primary" />
              基本情報を編集
            </div>
            <div>
              <div className="mb-1 text-[11px] text-muted-foreground">
                イベント名
              </div>
              <Input
                autoFocus
                value={ev.title}
                onChange={(e) => updateEvent(ev.id, { title: e.target.value })}
                placeholder="イベント名"
                className="h-9 text-sm font-medium"
              />
            </div>
            <div>
              <div className="mb-1 text-[11px] text-muted-foreground">企業名</div>
              <Input
                value={ev.company}
                onChange={(e) => updateEvent(ev.id, { company: e.target.value })}
                placeholder="企業名"
                className="h-9 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <div className="w-[44%]">
                <div className="mb-1 text-[11px] text-muted-foreground">形式</div>
                <Select
                  value={ev.venueMode || "none"}
                  onValueChange={(v) =>
                    updateEvent(ev.id, {
                      venueMode: (v === "none" ? "" : v) as VenueMode,
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <MapPin className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VENUE_OPTIONS.map((o) => (
                      <SelectItem
                        key={o.value || "none"}
                        value={o.value || "none"}
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <div className="mb-1 text-[11px] text-muted-foreground">
                  会場
                </div>
                <Input
                  value={ev.venuePlace}
                  onChange={(e) =>
                    updateEvent(ev.id, { venuePlace: e.target.value })
                  }
                  placeholder="例: 東京・大手町"
                  disabled={ev.venueMode !== "onsite"}
                  className="h-9 w-full text-sm"
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setEditBasic(false);
                toast.success("保存しました");
              }}
            >
              <Check className="h-4 w-4" />
              保存
            </Button>
          </div>
        ) : (
          venueLabel && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <InfoBadge>
                <MapPin className="h-3 w-3" />
                {venueLabel}
              </InfoBadge>
            </div>
          )
        )}

        {/* 状態(タップで即設定。編集に入らず切り替えられる) */}
        {!editBasic && (
          <div className="mt-3 flex gap-1.5">
            {STATUS_OPTIONS.map((o) => {
              const active = ev.status === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => updateEvent(ev.id, { status: o.value })}
                  className={cn(
                    "flex-1 rounded-lg border py-2 text-[13px] font-medium transition-colors",
                    !active
                      ? "border-input text-muted-foreground hover:bg-muted"
                      : o.value === "attended"
                        ? "border-[hsl(var(--success)/0.45)] bg-[hsl(var(--success)/0.12)] text-success"
                        : o.value === "declined"
                          ? "border-input bg-muted text-foreground"
                          : "border-primary bg-accent text-accent-foreground",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        )}

        {/* 注目日バナー */}
        {f.date && (
          <div
            className={cn(
              "mt-4 rounded-xl px-4 py-3 ring-1",
              urgent
                ? "bg-[hsl(var(--danger)/0.07)] ring-[hsl(var(--danger)/0.25)]"
                : "bg-accent ring-transparent",
            )}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {f.kind === "held" ? "開催" : "申込締切"}
            </div>
            <div
              className={cn(
                "mt-0.5 flex items-center gap-1.5 text-base font-bold leading-tight",
                urgent ? "text-danger" : "text-foreground",
              )}
            >
              {formatDue(f.date)}
              <span className="text-sm font-medium opacity-60">
                · {relativeLabel(f.date)}
              </span>
            </div>
          </div>
        )}

        {/* 日程(普段は表示・✎タップで編集) */}
        <Section
          title="日程"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (editSchedule) toast.success("保存しました");
                setEditSchedule((v) => !v);
              }}
            >
              {editSchedule ? (
                <>
                  <Check className="h-4 w-4" />
                  完了
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4" />
                  編集
                </>
              )}
            </Button>
          }
        >
          {editSchedule ? (
            <div className="space-y-3 rounded-lg border bg-muted/40 p-2.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    申込締切
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateEvent(ev.id, { applyDone: !ev.applyDone })
                    }
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                      ev.applyDone
                        ? "border-[hsl(var(--success)/0.4)] bg-[hsl(var(--success)/0.1)] text-success"
                        : "border-input text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {ev.applyDone && <Check className="h-3 w-3" />}
                    {ev.applyDone ? "申込済み" : "申込した"}
                  </button>
                </div>
                <DateRow
                  date={apply.date}
                  time={apply.time}
                  onDate={(d) =>
                    updateEvent(ev.id, { applyBy: joinDue(d, apply.time) })
                  }
                  onTime={(t) =>
                    updateEvent(ev.id, { applyBy: joinDue(apply.date, t) })
                  }
                  onClearDate={() => updateEvent(ev.id, { applyBy: null })}
                  onClearTime={() =>
                    updateEvent(ev.id, { applyBy: joinDue(apply.date, "") })
                  }
                  clearLabel="申込締切"
                />
              </div>
              <div className="space-y-1.5 border-t pt-2.5">
                <span className="text-[11px] font-medium text-muted-foreground">
                  開催日時
                </span>
                <DateRow
                  date={held.date}
                  time={held.time}
                  onDate={(d) =>
                    updateEvent(ev.id, { heldAt: joinDue(d, held.time) })
                  }
                  onTime={(t) =>
                    updateEvent(ev.id, { heldAt: joinDue(held.date, t) })
                  }
                  onClearDate={() => updateEvent(ev.id, { heldAt: null })}
                  onClearTime={() =>
                    updateEvent(ev.id, { heldAt: joinDue(held.date, "") })
                  }
                  clearLabel="開催日"
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditSchedule(true)}
              className="block w-full space-y-2 rounded-lg border bg-card p-3 text-left text-[13px]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">申込締切</span>
                <span
                  className={cn(
                    "text-right",
                    ev.applyDone && "text-muted-foreground line-through",
                  )}
                >
                  {ev.applyBy ? formatDue(ev.applyBy) : "未設定"}
                  {ev.applyBy && ev.applyDone ? "・申込済" : ""}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t pt-2">
                <span className="text-muted-foreground">開催日時</span>
                <span className="text-right">
                  {ev.heldAt ? formatDue(ev.heldAt) : "未設定"}
                </span>
              </div>
            </button>
          )}
        </Section>

        {/* 関連リンク(予約ページ等): 飛ぶボタン表示 / ✎編集(選考と同じ) */}
        <Section
          icon={<Link2 className="h-4 w-4" />}
          title="関連リンク"
          action={
            <div className="flex items-center gap-1">
              {ev.links.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (editLinks) toast.success("保存しました");
                    setEditLinks((v) => !v);
                  }}
                >
                  {editLinks ? (
                    <>
                      <Check className="h-4 w-4" />
                      完了
                    </>
                  ) : (
                    <>
                      <Pencil className="h-4 w-4" />
                      編集
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  addEventLink(ev.id);
                  setEditLinks(true);
                }}
              >
                <Plus className="h-4 w-4" />
                追加
              </Button>
            </div>
          }
        >
          {ev.links.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              予約ページ・マイページ等のURLを登録できます。
            </p>
          ) : editLinks ? (
            <div className="space-y-2">
              {ev.links.map((link) => (
                <div key={link.id} className="flex items-center gap-2">
                  <Input
                    value={link.label}
                    onChange={(e) =>
                      updateEventLink(ev.id, link.id, { label: e.target.value })
                    }
                    placeholder="ラベル"
                    className="h-9 w-[34%] text-sm"
                  />
                  <Input
                    value={link.url}
                    onChange={(e) =>
                      updateEventLink(ev.id, link.id, { url: e.target.value })
                    }
                    placeholder="https://..."
                    className="h-9 flex-1 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9 shrink-0 transition-all",
                      link.pin
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-input text-muted-foreground hover:bg-accent",
                    )}
                    disabled={!link.pin && pinnedCount >= 2}
                    title={
                      link.pin
                        ? "ピン留め中（カードに表示）・タップで解除"
                        : pinnedCount >= 2
                          ? "ピンは最大2つまで"
                          : "カードにピン留め"
                    }
                    onClick={() =>
                      updateEventLink(ev.id, link.id, { pin: !link.pin })
                    }
                  >
                    <Pin
                      key={link.pin ? "on" : "off"}
                      className={cn(
                        "h-4 w-4",
                        link.pin && "animate-evo-drop fill-current",
                      )}
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-danger"
                    onClick={() => deleteEventLink(ev.id, link.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ev.links.map((link) => (
                <a
                  key={link.id}
                  href={safeHref(link.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-[13px] font-medium text-primary",
                    !link.url && "pointer-events-none opacity-40",
                  )}
                >
                  {link.pin && <Pin className="h-3.5 w-3.5" />}
                  <span className="max-w-[12rem] truncate">
                    {link.label || "リンク"}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                </a>
              ))}
            </div>
          )}
        </Section>

        {/* メモ */}
        <Section
          title="メモ"
          icon={<StickyNote className="h-4 w-4" />}
          action={
            ev.memo && !editMemo ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditMemo(true)}
              >
                <Pencil className="h-4 w-4" />
                編集
              </Button>
            ) : null
          }
        >
          {ev.memo && !editMemo ? (
            <button
              type="button"
              onClick={() => setEditMemo(true)}
              className="w-full whitespace-pre-wrap rounded-lg border bg-card p-3 text-left text-[13px] leading-relaxed"
            >
              {ev.memo}
            </button>
          ) : (
            <div className="space-y-2">
              <Textarea
                value={ev.memo}
                onChange={(e) => updateEvent(ev.id, { memo: e.target.value })}
                placeholder="持ち物・服装・逆質問など自由に。"
                className="min-h-[80px] resize-y leading-relaxed"
              />
              {ev.memo && (
                <Button
                  className="w-full"
                  onClick={() => {
                    setEditMemo(false);
                    toast.success("保存しました");
                  }}
                >
                  <Check className="h-4 w-4" />
                  保存
                </Button>
              )}
            </div>
          )}
        </Section>

        <div className="mt-4 border-t pt-4">
          {confirmDelete ? (
            <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--danger)/0.3)] bg-[hsl(var(--danger)/0.06)] p-3">
              <span className="flex-1 text-sm">削除しますか？</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                やめる
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  const name = ev.title || ev.company || "イベント";
                  deleteEvent(ev.id);
                  onDeleted(name);
                }}
              >
                削除する
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-danger"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
              このイベントを削除
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function DateRow({
  date,
  time,
  onDate,
  onTime,
  onClearDate,
  onClearTime,
  clearLabel,
}: {
  date: string;
  time: string;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
  onClearDate: () => void;
  onClearTime: () => void;
  clearLabel: string;
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => onDate(e.target.value)}
          className="h-10 min-w-0 flex-1 px-2.5 text-[16px] sm:text-sm"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-muted-foreground"
          disabled={!date}
          title={`${clearLabel}をクリア`}
          onClick={onClearDate}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="time"
          value={time}
          disabled={!date}
          onChange={(e) => onTime(e.target.value)}
          className="h-10 min-w-0 flex-1 px-2.5 text-[16px] sm:text-sm"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-muted-foreground"
          disabled={!time}
          title="時刻をクリア"
          onClick={onClearTime}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}

function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[15px] font-semibold text-foreground [&_svg]:text-muted-foreground">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}
