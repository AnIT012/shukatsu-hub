import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SwRegister } from "@/components/sw-register";
import { LAUNCH_SCRIPT } from "@/components/launch-screen";

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

// iPhone/iPad(iPadOS の Mac 偽装も含む)だけ viewport に maximum-scale=1 を足す。
// iOS は指で広げる拡大ではこれを無視するので、拡大できなくなる人は出ない。止まるのは入力欄の自動拡大だけ。
// meta が後から出てくる場合に備え、DOMContentLoaded でもう一度当てる。
const IOS_NO_FOCUS_ZOOM = `(function(){try{
var ios=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
if(!ios)return;
function f(){var m=document.querySelector('meta[name=viewport]');if(m&&!/maximum-scale/.test(m.content))m.content+=', maximum-scale=1';}
f();document.addEventListener('DOMContentLoaded',f);
}catch(e){}})();`;

export const viewport: Viewport = {
  // 地ならし#5: 上部バーの色は上端fixed/sticky(=ヘッダー card)の色から導かれる。
  // 紙の地に合わせる(白のままだと status bar だけ浮く)。地の色は globals の html/body で別途指定済み。
  // 上端=ヘッダー(card)の色。ブルー(標準)の card = hsl(214 60% 99.6%)
  themeColor: "#fdfeff",
  width: "device-width",
  initialScale: 1,
  // ⚠ 地ならし#1: maximumScale/userScalable はここでは付けない(Android では指の拡大まで奪う)。
  //    入力欄focus時の拡大は globals の16px下限(文字サイズ設定の zoom も割り戻す)で潰し、
  //    iOS だけ head の IOS_NO_FOCUS_ZOOM で maximum-scale=1 を足す(iOS は指の拡大ではこれを無視する)。
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* 起動の台本(テーマを先に当て、起動の膜をいつ退かせるかを決める)。描画より前に走らせる */}
        <script dangerouslySetInnerHTML={{ __html: LAUNCH_SCRIPT }} />
        {/* 既定のフォント(端正ゴシック)は最初の1枚目から出したいので、先に読み込む。
            id は store の applyFont と同じ(二重に読み込まない) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          id="gf-zenKaku"
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap"
        />
        {/* iOS で入力欄に触れた時の自動拡大を止める(上の viewport のコメント) */}
        <script dangerouslySetInnerHTML={{ __html: IOS_NO_FOCUS_ZOOM }} />
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
