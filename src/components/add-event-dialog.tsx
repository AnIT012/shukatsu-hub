"use client";

import { useEffect, useState } from "react";
import type { VenueMode } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const VENUE_OPTIONS: { value: VenueMode; label: string }[] = [
  { value: "", label: "未設定" },
  { value: "online", label: "オンライン" },
  { value: "onsite", label: "対面" },
];

export function AddEventDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string, name: string) => void;
}) {
  const { addEvent, updateEvent } = useStore();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [venueMode, setVenueMode] = useState<VenueMode>("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setCompany("");
      setVenueMode("");
    }
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const c = company.trim();
    if (!t && !c) return;
    const id = addEvent({ company: c, title: t });
    if (venueMode) updateEvent(id, { venueMode });
    onOpenChange(false);
    onCreated(id, t || c);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-1">
          <DialogTitle className="text-base">説明会・イベントを追加</DialogTitle>
          <DialogDescription className="text-xs">
            まずは名前だけでもOK。申込締切・開催日は追加後に登録できます。
          </DialogDescription>
        </div>
        <form onSubmit={submit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="add-ev-title">
              イベント名 <span className="text-danger">*</span>
            </Label>
            <Input
              id="add-ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 会社説明会・1day仕事体験"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-ev-company">企業名</Label>
            <Input
              id="add-ev-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="例: 株式会社サンプル"
            />
          </div>
          <div className="space-y-1.5">
            <Label>形式</Label>
            <Select
              value={venueMode || "none"}
              onValueChange={(v) =>
                setVenueMode((v === "none" ? "" : v) as VenueMode)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VENUE_OPTIONS.map((o) => (
                  <SelectItem key={o.value || "none"} value={o.value || "none"}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() && !company.trim()}
            >
              追加して編集
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
