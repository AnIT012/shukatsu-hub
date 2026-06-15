import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** 環境変数が両方そろっていればクラウド(Supabase)モード、無ければローカル(localStorage)モード */
export const isSupabaseConfigured = Boolean(url && anon);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** クラウド側でユーザーごとに全データ(Application[])を1行のjsonbで保持するテーブル */
export const DATA_TABLE = "user_data";
