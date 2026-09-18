"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * 追加ポップアップの共通ガワ。企業/イベントで見た目を必ず揃えるための土台。
 * 中身(フィールド)は children で渡す。フッターは常に「キャンセル / 追加して編集」。
 */
export function AddDialogShell({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  submitDisabled,
  submitLabel = "追加して編集",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onSubmit: (e: React.FormEvent) => void;
  submitDisabled?: boolean;
  submitLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-1">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </div>
        <form onSubmit={onSubmit} className="space-y-3.5">
          {children}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={submitDisabled}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** ラベル + 1行入力。追加ダイアログのテキスト項目はこれで揃える。 */
export function AddTextField({
  id,
  label,
  required,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-danger"> *</span>}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

/** ラベル + 任意の入力(Select等)を縦に並べる枠。 */
export function AddField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
