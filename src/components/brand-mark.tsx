// 就活Hub のマーク(鞄＋今週の7つの点＋金のチェック)。起動の膜とログイン画面で同じ絵を使う。
// 色はテーマの primary。クラス名(lm-*)は globals.css の「起動」の節が持つ(起動の時だけ組み上がる動きが付く)。

const CELLS = [0, 1, 2, 3, 4, 5, 6];

export function BrandMark({ size = 96, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={["launch-mark", className].filter(Boolean).join(" ")}
      viewBox="0 0 96 96"
      width={size}
      height={size}
      aria-hidden
    >
      <rect className="lm-tile" x="0" y="0" width="96" height="96" rx="26" />
      <path
        className="lm-handle"
        d="M36 30 v-4.5 a6.5 6.5 0 0 1 6.5 -6.5 h11 a6.5 6.5 0 0 1 6.5 6.5 v4.5"
      />
      <rect className="lm-body" x="17" y="29" width="62" height="46" rx="10" />
      <rect className="lm-band" x="17" y="40" width="62" height="3.5" rx="1.75" />
      <g className="lm-cells">
        {CELLS.map((i) => (
          <circle
            key={i}
            className="lm-cell"
            cx={27 + i * 7}
            cy={56}
            r={i === 3 ? 3.6 : 2.4}
            style={{ ["--i" as string]: i }}
          />
        ))}
      </g>
      <path className="lm-check" d="M57 63 l7.5 7.5 l15 -18" pathLength={1} />
    </svg>
  );
}
