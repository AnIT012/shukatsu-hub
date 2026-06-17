# 就活Hub

毎朝開いて「**次に何をすべきか・次の締切はいつか**」が一目でわかる、就活の進捗管理 PWA。
選考フローを **段階 ＞ タスク** で整理し、説明会・イベントもまとめて管理できる。スマホでアプリのように使える（ホーム追加・オフライン対応・プッシュ通知）。

> 本選考もインターンも、ESもWebテストも面接も。「いま動くべきこと」だけが前に出る設計。

---

## 主な機能

### 選考フロー（段階 ＞ タスク）
- **段階**（書類選考・一次面接 …）の中に **タスク**（ES提出・Webテスト・面接 …）を持つ2層モデル
- タスクは 〇 をタップで **未 ⇄ やった** を切り替えるだけ。段階ごとに **通過 / 不合格 / 辞退** を選ぶ
- **並行対応**：ES＋Webテストなど同時に進む選考を1つの段階にまとめられる
- 一覧カードの進捗バーは状態を色で表現（緑＝通過 / 黄＝やった待ち / 灰＝未 / 赤＝不合格）
- 「次にやること」は締切順で主役表示。締切／実施日を自動で出し分け

### 説明会・イベント
- 申込締切・開催日・形式・複数リンク・メモを管理
- 未参加 / 参加済 / 辞退 をワンタップ。開催日が過ぎたら自動で完了扱い

### 体験
- 下タブ **[選考][イベント][設定]** ＋スワイプ切替（アイコンが選択で進化）
- **直近 / 次の予定**を常設の固定枠で表示（今週内は赤・先はテーマ色）
- テーマ12色（和カラー）＋フォント選択、ライト/ダーク対応
- 操作に合わせた控えめなマイクロアニメーション

### データと同期
- **クラウド同期**（Supabase Auth ＋ Postgres、1ユーザー1行の JSON）
- **オフライン対応**：オフラインでも編集→端末に保存→オンライン復帰で自動同期（楽観的更新・競合は新しい方を採用＋警告）
- **Web Push 通知**：締切・予定のリマインド（毎朝まとめ / 指定日数前）
- JSON エクスポート / インポートでバックアップ・端末移行

---

## セットアップ

```bash
npm install
cp .env.local.example .env.local   # Supabase を使う場合は値を設定
npm run dev                         # http://localhost:3000
```

- **ローカルのみ**で使う場合：環境変数なしでも起動でき、データはブラウザの `localStorage` に保存される
- **クラウド同期 / 通知**を使う場合：Supabase の設定が必要（→ [`SETUP-CLOUD.md`](./SETUP-CLOUD.md)）
  - `supabase/feedback.sql` … フィードバック用テーブル（SQL エディタで1回実行）
  - `supabase/functions/notify` … 通知配信の Edge Function（毎朝 pg_cron で起動）

```bash
npm run build   # 本番ビルド
npm start        # 本番起動
```

---

## 技術スタック

- **Next.js 14**（App Router）/ **React 18** / **TypeScript**
- **Tailwind CSS**（shadcn/ui スタイル）/ lucide-react / sonner（トースト）
- **Supabase**：Auth ／ Postgres（RLS）／ Edge Functions（Deno）／ pg_cron
- **PWA**：Service Worker（アプリシェルのキャッシュ＝オフライン起動）＋ Web Manifest
- **Web Push**（VAPID）

---

## アーキテクチャ（要点）

データ型は [`src/lib/types.ts`](./src/lib/types.ts) を参照。

```
Application（1社）
 ├─ stages: SelectionStage[]      段階(>タスク)。新モデル
 │   └─ tasks: SelectionTask[]    並行なら複数
 ├─ steps:  SelectionStep[]       旧モデル(移行ソースとして保持＝バックアップ)
 ├─ esEntries / links / memo …
EventItem（説明会・イベント）
```

- **次のアクション / 進捗 / 状況分類**：[`src/lib/next-action.ts`](./src/lib/next-action.ts)
- **データ正規化と移行**：[`src/lib/io.ts`](./src/lib/io.ts)
  - 読み込み時に旧 `steps[]` から `stages[]` を自動生成（**旧データは消さず保持**）。全体結果は段階から導出
  - 旧イベントの単一 URL は複数リンクへ移行
- **保存 / 同期 / オフライン**：[`src/lib/store.tsx`](./src/lib/store.tsx)（端末キャッシュを真実として dirty 管理、復帰時に flush / pull）
- **移行通告**：[`src/components/version-notice.tsx`](./src/components/version-notice.tsx)（旧データ検出で1回だけ案内＋スナップショット退避）

### 安全性
- ユーザー入力 URL は `http(s)` のみ許可（`safeHref` で `javascript:` 等を無効化）
- Supabase は RLS で user_id ごとにデータを分離。クライアントには VAPID 公開鍵のみ
- 破壊的操作（全削除・移行前に戻す）は確認ダイアログ必須

---

就活、がんばろう。
