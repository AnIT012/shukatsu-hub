-- 就活Hub フィードバック/満足度テーブル
-- Supabase の SQL エディタで1回実行する。

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  type text not null default 'rating',   -- 'rating'(満足度) | 'feedback'(要望/不具合等)
  stars int,                              -- 満足度 1-5 (type=rating)
  kind text,                             -- 種類 (type=feedback)
  message text,                          -- 任意コメント / 本文
  created_at timestamptz default now()
);

alter table public.feedback enable row level security;

-- ログインユーザーは「自分の user_id で投稿」だけ可能
create policy "feedback_insert_own"
  on public.feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 閲覧ポリシーは作らない = 一般ユーザーは読めない。
-- 管理者(あなた)は Supabase ダッシュボード / service role で全件見られる。

-- 集計の例:
--   select round(avg(stars),2) as 平均満足度, count(*) as 件数
--   from public.feedback where type='rating';
--   select stars, count(*) from public.feedback where type='rating' group by stars order by stars;
--   select created_at, kind, message from public.feedback where type='feedback' order by created_at desc;
