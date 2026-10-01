import { AuthProvider } from "@/lib/auth";
import { AuthGate } from "@/components/auth-gate";
import { StoreProvider } from "@/lib/store";
import { Dashboard } from "@/components/dashboard";
import { LaunchScreen } from "@/components/launch-screen";

export default function Page() {
  return (
    <>
      {/* 起動の膜(アプリ本体の / だけ)。HTMLに焼くので最初の1枚目から出る */}
      <LaunchScreen />
      <AuthProvider>
        <AuthGate>
          <StoreProvider>
            <Dashboard />
          </StoreProvider>
        </AuthGate>
      </AuthProvider>
    </>
  );
}
