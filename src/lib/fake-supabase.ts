// 開発専用: 本物の Supabase の代わりに、ブラウザの localStorage に「クラウド」を作る偽物。
// 同期・暗号化の流れを、本番のアカウントを作らずに localhost で踏むためのもの。
//
// 有効にする: localhost で localStorage に shukatsu-dashboard:fakecloud = "1"(Supabase 未設定の時だけ)。
// 「vault 列がまだ無いサーバー」を真似る: shukatsu-dashboard:fakecloud-novault = "1"。
// クラウドの中身(=サーバーが見える物)は shukatsu-dashboard:fakecloud-db に平文の JSON で置く。
// 本番ビルドでは使われない(supabase.ts が NODE_ENV で切る)。

const DB_KEY = "shukatsu-dashboard:fakecloud-db";
const USERS_KEY = "shukatsu-dashboard:fakecloud-users";
const SESSION_KEY = "shukatsu-dashboard:fakecloud-session";
const NOVAULT_KEY = "shukatsu-dashboard:fakecloud-novault";

type Row = Record<string, any>;
const read = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};
const write = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

let listeners: ((ev: string, session: any) => void)[] = [];
const sessionOf = () => read<any>(SESSION_KEY, null);
const emit = (ev: string) => {
  const s = sessionOf();
  for (const l of listeners) setTimeout(() => l(ev, s), 0);
};

function table(name: string) {
  const all = () => read<Record<string, Row[]>>(DB_KEY, {});
  const rows = () => all()[name] ?? [];
  const save = (r: Row[]) => write(DB_KEY, { ...all(), [name]: r });
  const pick = (r: Row, cols: string) => {
    const out: Row = {};
    for (const c of cols.split(",").map((s) => s.trim())) out[c] = r[c] ?? null;
    return out;
  };
  const colErr = (cols: string) =>
    /vault/.test(cols) && localStorage.getItem(NOVAULT_KEY) === "1"
      ? { message: 'column user_data.vault does not exist', code: "42703" }
      : null;
  const me = () => sessionOf()?.user?.id;

  return {
    select(cols: string) {
      const filters: [string, any][] = [];
      const q = {
        eq(c: string, v: any) {
          filters.push([c, v]);
          return q;
        },
        async maybeSingle() {
          const err = colErr(cols);
          if (err) return { data: null, error: err };
          const r = rows().find((x) => x.user_id === me() && filters.every(([c, v]) => x[c] === v));
          return { data: r ? pick(r, cols) : null, error: null };
        },
      };
      return q;
    },
    update(fields: Row) {
      const filters: [string, any][] = [];
      const q = {
        eq(c: string, v: any) {
          filters.push([c, v]);
          return q;
        },
        async select(cols: string) {
          if ("vault" in fields && localStorage.getItem(NOVAULT_KEY) === "1") {
            return { data: null, error: { message: "column vault does not exist" } };
          }
          const rs = rows();
          const hit: Row[] = [];
          for (const x of rs) {
            if (x.user_id === me() && filters.every(([c, v]) => x[c] === v)) {
              Object.assign(x, fields);
              hit.push(pick(x, cols));
            }
          }
          save(rs);
          return { data: hit, error: null };
        },
      };
      return q;
    },
    upsert(obj: Row) {
      return {
        async select(cols: string) {
          if ("vault" in obj && localStorage.getItem(NOVAULT_KEY) === "1") {
            return { data: null, error: { message: "column vault does not exist" } };
          }
          const rs = rows().filter((x) => x.user_id !== obj.user_id);
          const prev = rows().find((x) => x.user_id === obj.user_id) ?? {};
          const r = { ...prev, ...obj };
          rs.push(r);
          save(rs);
          return { data: [pick(r, cols)], error: null };
        },
      };
    },
    async insert(obj: Row) {
      save([...rows(), obj]);
      return { error: null };
    },
  };
}

export function createFakeSupabase(): any {
  return {
    from: table,
    auth: {
      async getSession() {
        return { data: { session: sessionOf() } };
      },
      onAuthStateChange(cb: (ev: string, s: any) => void) {
        listeners.push(cb);
        return { data: { subscription: { unsubscribe: () => (listeners = listeners.filter((l) => l !== cb)) } } };
      },
      async signUp({ email, password }: { email: string; password: string }) {
        const users = read<Row[]>(USERS_KEY, []);
        if (users.some((u) => u.email === email)) return { error: { message: "User already registered" } };
        const user = { id: `fake-${Math.random().toString(36).slice(2, 10)}`, email };
        write(USERS_KEY, [...users, { ...user, password }]);
        write(SESSION_KEY, { user });
        emit("SIGNED_IN");
        return { data: { user }, error: null };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const u = read<Row[]>(USERS_KEY, []).find((x) => x.email === email);
        if (!u || u.password !== password) return { error: { message: "Invalid login credentials" } };
        write(SESSION_KEY, { user: { id: u.id, email: u.email } });
        emit("SIGNED_IN");
        return { data: {}, error: null };
      },
      async signOut() {
        localStorage.removeItem(SESSION_KEY);
        emit("SIGNED_OUT");
        return { error: null };
      },
    },
  };
}
