"use client";

import { useAuth } from "@/lib/auth";
import { LoginScreen } from "@/components/login-screen";
import { AppLoader } from "@/components/app-loader";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, mode, user } = useAuth();

  if (!ready) {
    return <AppLoader />;
  }

  if (mode === "cloud" && !user) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
