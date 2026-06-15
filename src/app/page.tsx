import { AuthProvider } from "@/lib/auth";
import { AuthGate } from "@/components/auth-gate";
import { StoreProvider } from "@/lib/store";
import { Dashboard } from "@/components/dashboard";

export default function Page() {
  return (
    <AuthProvider>
      <AuthGate>
        <StoreProvider>
          <Dashboard />
        </StoreProvider>
      </AuthGate>
    </AuthProvider>
  );
}
