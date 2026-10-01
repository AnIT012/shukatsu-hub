-- 就活Hub: ESや選考の中身を端末で暗号化して置くための列(エンドツーエンド暗号化)。
-- Supabase の SQL エディタに貼って1回実行する(何回流してもOK)。
--
-- vault 列には「パスワードで包んだデータ鍵」と「暗号文」だけが入る。サーバーでは読めない。
-- 既存の RLS(user_data.sql)は行単位なので、この列にもそのまま効く(本人の行だけ読める/書ける)。
--
-- 順番: (1) この SQL → (2) notify 関数を再デプロイ → (3) アプリを本番へ。
-- (1) が無いうちは、アプリは列が無いことに気づいて従来どおり平文で動く(壊れない)。

alter table public.user_data add column if not exists vault jsonb;

-- 確認: vault 列があれば1行返る
--   select column_name, data_type from information_schema.columns
--   where table_name = 'user_data' and column_name = 'vault';
