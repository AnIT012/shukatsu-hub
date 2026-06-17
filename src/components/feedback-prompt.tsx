"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { submitRating } from "@/lib/feedback";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FeedbackPrompt({
  open,
  userId,
  onClose,
}: {
  open: boolean;
  userId: string;
  onClose: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (stars === 0) {
      toast.info("星をタップして評価してください");
      return;
    }
    setSending(true);
    const ok = await submitRating(userId, stars, message);
    setSending(false);
    if (ok) toast.success("ありがとうございます！参考にします🙏");
    else toast.error("送信に失敗しました");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogTitle className="text-center text-base">
          就活Hub、使ってみていかがですか？
        </DialogTitle>
        <DialogDescription className="text-center text-xs">
          満足度を教えていただけると嬉しいです（コメントは任意）
        </DialogDescription>

        <div className="flex justify-center gap-1.5 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              aria-label={`${n}つ星`}
              className="transition-transform active:scale-90"
            >
              <Star
                className={cn(
                  "h-9 w-9 transition-colors",
                  n <= stars
                    ? "fill-primary text-primary"
                    : "text-muted-foreground/35",
                )}
              />
            </button>
          ))}
        </div>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="あれば教えてください（要望・感想・不具合など）"
          className="min-h-[72px] resize-y"
        />

        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            あとで
          </Button>
          <Button type="button" onClick={submit} disabled={sending}>
            送信
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
