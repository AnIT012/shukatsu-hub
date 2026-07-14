import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "就活Hub — 就活の「次にやること」が、毎朝ひと目で。";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "linear-gradient(135deg, #4f46e5 0%, #6366f1 55%, #818cf8 100%)";

// Google Fonts から必要な文字だけのTTFを取得(日本語をOG画像に描くため)
async function loadFont(text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(
    text,
  )}`;
  const css = await (
    await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:6.0)" },
    })
  ).text();
  const m = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/);
  if (!m) throw new Error("font not found");
  return (await fetch(m[1])).arrayBuffer();
}

function badge() {
  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 18,
        background: "rgba(255,255,255,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 34,
        marginRight: 22,
      }}
    >
      H
    </div>
  );
}

export default async function Image() {
  const brand = "就活Hub";
  const tagline = "就活の「次にやること」が、毎朝ひと目で。";
  const sub = "ES・Webテスト・面接・説明会をひとつに。登録不要で試せる。";

  let font: ArrayBuffer | null = null;
  try {
    font = await loadFont(brand + tagline + sub);
  } catch {
    font = null;
  }

  // フォント取得に失敗しても画像は必ず出す(英語フォールバック)
  if (!font) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: 84,
            background: BG,
            color: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
            {badge()}
            <div style={{ fontSize: 40 }}>Shukatsu Hub</div>
          </div>
          <div style={{ fontSize: 66, lineHeight: 1.2 }}>
            Your job hunt, at a glance.
          </div>
        </div>
      ),
      { ...size },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 84,
          background: BG,
          color: "#ffffff",
          fontFamily: "NotoSansJP",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 30 }}>
          {badge()}
          <div style={{ fontSize: 40 }}>{brand}</div>
        </div>
        <div style={{ fontSize: 72, lineHeight: 1.24, letterSpacing: -1 }}>
          {tagline}
        </div>
        <div style={{ fontSize: 30, marginTop: 34, opacity: 0.92 }}>{sub}</div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "NotoSansJP", data: font, weight: 700, style: "normal" }],
    },
  );
}
