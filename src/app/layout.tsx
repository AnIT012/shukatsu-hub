import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SwRegister } from "@/components/sw-register";

const SITE_URL = "https://shukatsu-dashboard-sable.vercel.app";
const OG_TITLE = "就活Hub — 就活の「次にやること」が、毎朝ひと目で。";
const OG_DESC =
  "ES・Webテスト・面接・説明会をひとつに。締切が近い順に自動で並ぶ就活・インターン管理アプリ。登録不要で試せる。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "就活Hub",
  description: "次に何をすべきか・次の締切が一目でわかる、就活インターン進捗管理ツール",
  appleWebApp: {
    capable: true,
    title: "就活Hub",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "就活Hub",
    title: OG_TITLE,
    description: OG_DESC,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESC,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="antialiased">
        {children}
        <SwRegister />
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
