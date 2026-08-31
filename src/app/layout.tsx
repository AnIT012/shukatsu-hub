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
  // 地ならし#5: 上部バーの色は上端fixed/sticky(=ヘッダー card)の色から導かれる。
  // 紙の地に合わせる(白のままだと status bar だけ浮く)。地の色は globals の html/body で別途指定済み。
  themeColor: "#f2f0e9",
  width: "device-width",
  initialScale: 1,
  // ⚠ 地ならし#1: maximumScale/userScalable は付けない(拡大を奪う)。
  //    入力欄focus時の拡大は globals の16px下限で潰している。
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* 地ならし#7: standalone(ホーム画面から起動)かどうかの旗を、描画前に root へ立てる。
            後から判定すると画面が1回ちらつく。書き方はこの1本だけ(増やすと install 導線が壊れる)。 */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{document.documentElement.dataset.standalone=String(matchMedia('(display-mode: standalone)').matches||navigator.standalone===true)}catch(e){}",
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        <div className="grain" aria-hidden />
        <SwRegister />
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
