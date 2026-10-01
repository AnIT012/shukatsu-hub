import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 開発専用の偽クラウド(lib/fake-supabase.ts)。本番ビルドでは常に false
const useFake =
  process.env.NODE_ENV === "development" &&
  !(url && anon) &&
  typeof window !== "undefined" &&
  (() => {
    try {
      return localStorage.getItem("shukatsu-dashboard:fakecloud") === "1";
    } catch {
      return false;
    }
  })();

/** 環境変数が両方そろっていればクラウド(Supabase)モード、無ければローカル(localStorage)モード */
export const isSupabaseConfigured = Boolean(url && anon) || useFake;

export const supabase: SupabaseClient | null = useFake
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require("./fake-supabase").createFakeSupabase() as SupabaseClient)
  : isSupabaseConfigured
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
