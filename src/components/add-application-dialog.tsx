"use client";

import { useEffect, useState } from "react";
import type { Priority, SelectionType } from "@/lib/types";
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
import { PRIORITY_OPTIONS, SELECTION_TYPE_OPTIONS } from "@/lib/constants";

export function AddApplicationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string, name: string) => void;
}) {
  const { addApplication } = useStore();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [selectionType, setSelectionType] = useState<SelectionType>("main");

  useEffect(() => {
    if (open) {
      setCompany("");
      setRole("");
      setPriority("medium");
      setSelectionType("main");
    }
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = company.trim();
    if (!name) return;
    const id = addApplication({ company: name, role, priority, selectionType });
    onOpenChange(false);
    onCreated(id, name);
  };

  return (
    <AddDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="企業を追加"
      description="まずは企業名だけでもOK。選考ステップは追加後に登録できます。"
      onSubmit={submit}
      submitDisabled={!company.trim()}
    >
      <AddTextField
        id="add-company"
        label="企業名"
        required
        value={company}
        onChange={setCompany}
        placeholder="例: 株式会社サンプル"
      />
      <AddTextField
        id="add-role"
        label="職種 / コース名"
        value={role}
        onChange={setRole}
        placeholder="例: 総合職サマーインターン"
      />
      <div className="flex gap-2">
        <AddField label="選考種別">
          <Select
            value={selectionType}
            onValueChange={(v) => setSelectionType(v as SelectionType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SELECTION_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AddField>
        <AddField label="優先度">
          <Select
            value={priority}
            onValueChange={(v) => setPriority(v as Priority)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AddField>
      </div>
    </AddDialogShell>
  );
}
