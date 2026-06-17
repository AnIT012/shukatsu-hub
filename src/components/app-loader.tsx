import { ListChecks } from "lucide-react";

/** アプリ全体の読み込み中表示(認証待ち・データ読込で共通。新しいブランドアニメに統一) */
export function AppLoader() {
  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center gap-5">
      <div className="animate-app-pulse flex h-16 w-16 items-center justify-center rounded-[18px] bg-primary text-primary-foreground shadow-[0_8px_24px_hsl(var(--primary)/0.3)]">
        <ListChecks className="h-8 w-8" />
      </div>
      <div className="flex gap-1.5">
        <span className="animate-app-bounce h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="animate-app-bounce h-1.5 w-1.5 rounded-full bg-primary [animation-delay:0.15s]" />
        <span className="animate-app-bounce h-1.5 w-1.5 rounded-full bg-primary [animation-delay:0.3s]" />
      </div>
    </div>
  );
}
