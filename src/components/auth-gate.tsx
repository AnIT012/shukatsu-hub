"use client";

import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { LoginScreen } from "@/components/login-screen";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, mode, user } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        読み込み中…
      </div>
    );
  }

  if (mode === "cloud" && !user) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
