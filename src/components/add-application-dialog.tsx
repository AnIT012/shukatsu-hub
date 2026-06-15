"use client";

import { useEffect, useRef, useState } from "react";
import type { Priority } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
import { PRIORITY_OPTIONS } from "@/lib/constants";

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCompany("");
      setRole("");
      setPriority("medium");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = company.trim();
    if (!name) return;
    const id = addApplication({ company: name, role, priority });
    onOpenChange(false);
    onCreated(id, name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>企業を追加</DialogTitle>
          <DialogDescription>
            まずは企業名だけでもOK。選考ステップは追加後に登録できます。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="add-company">
              企業名 <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="add-company"
              ref={inputRef}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="例: 株式会社サンプル"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-role">職種 / コース名</Label>
            <Input
              id="add-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="例: 総合職サマーインターン"
            />
          </div>
          <div className="space-y-1.5">
            <Label>優先度</Label>
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
                    優先度 {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={!company.trim()}>
              追加して編集
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
