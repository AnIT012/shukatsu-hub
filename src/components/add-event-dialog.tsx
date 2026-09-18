"use client";

import { useEffect, useState } from "react";
import type { VenueMode } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AddDialogShell,
  AddField,
  AddTextField,
} from "@/components/add-dialog-shell";

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
    <AddDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="説明会・イベントを追加"
      description="まずは名前だけでもOK。申込締切・開催日は追加後に登録できます。"
      onSubmit={submit}
      submitDisabled={!title.trim() && !company.trim()}
    >
      <AddTextField
        id="add-ev-title"
        label="イベント名"
        required
        value={title}
        onChange={setTitle}
        placeholder="例: 会社説明会・1day仕事体験"
      />
      <AddTextField
        id="add-ev-company"
        label="企業名"
        value={company}
        onChange={setCompany}
        placeholder="例: 株式会社サンプル"
      />
      <AddField label="形式">
        <Select
          value={venueMode || "none"}
          onValueChange={(v) => setVenueMode((v === "none" ? "" : v) as VenueMode)}
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
      </AddField>
    </AddDialogShell>
  );
}
