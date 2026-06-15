# クラウド同期（Supabase）＋ 公開（Vercel）セットアップ

彼女と君がそれぞれのアカウントで、スマホ・PCどこからでも同じデータを使えるようにする手順。所要 15〜20分。

> 設定しなければアプリは自動で「ローカルモード」（その端末の localStorage だけ）で動くので、急がなくてもOK。

---

## 1. Supabase プロジェクトを作る（無料）

1. https://supabase.com にサインアップ → **New project**。
2. 名前・DBパスワード（自動でOK）・リージョンは **Northeast Asia (Tokyo)** を選んで作成。
3. 1〜2分で起動する。

## 2. データ用テーブルを作る

左メニュー **SQL Editor** → 下のSQLを貼って **Run**。

```sql
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

-- 自分の行だけ読み書きできる（他人のデータは見えない）
create policy "own_select" on public.user_data
  for select using (auth.uid() = user_id);
create policy "own_insert" on public.user_data
  for insert with check (auth.uid() = user_id);
create policy "own_update" on public.user_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## 3. ログインを「メール確認なし」にする（任意・おすすめ）

左メニュー **Authentication → Sign In / Providers → Email** を開き、
**「Confirm email」をオフ** にして保存。
→ 新規登録してすぐログインできる（確認メールを待たなくて済む）。

## 4. APIキーを取得して .env.local に入れる

左メニュー **Project Settings → API**:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** キー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

`.env.local.example` を `.env.local` にコピーして値を貼る:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...（長い文字列）
```

`npm run dev` を再起動 → ログイン画面が出れば成功。
（anon キーは公開しても安全な鍵。行レベルセキュリティ(RLS)で各自のデータは守られる。）

---

## 5. Vercel で公開する（無料・どこからでもアクセス）

1. https://vercel.com に GitHub でサインアップ。
2. このフォルダを GitHub にプッシュ（または `npx vercel` でローカルから直接デプロイ）。
3. プロジェクトをインポートし、**Environment Variables** に手順4の2つの値を登録。
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy → `https://〇〇.vercel.app` が発行される。

### Supabase 側に本番URLを許可
**Authentication → URL Configuration** の **Site URL / Redirect URLs** に
Vercelの本番URL（`https://〇〇.vercel.app`）を追加。

---

## 6. 彼女の使い方

1. 発行された Vercel のURLをスマホで開く。
2. 自分のメール＋パスワードで **新規登録**（君とは別アカウント＝データも別々）。
3. スマホのブラウザメニューから **「ホーム画面に追加」** すれば、アプリのように起動できる。
4. PCでも同じURL＋同じログインで開けば、データは同期される。

## 補足

- データは編集のたびに自動でクラウド保存（ヘッダーに「保存しました」）。
- アプリを開く／タブに戻るたびに最新を取得（他端末の変更が反映）。
- 同じ瞬間に2端末で別々に編集した場合は「最後に保存した方」が優先（1人運用なら基本問題なし）。
- バックアップは引き続きヘッダーの ↓（JSONエクスポート）でも取れる。
