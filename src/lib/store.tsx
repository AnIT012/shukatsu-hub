"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type {
  Application,
  ESEntry,
  EventItem,
  Priority,
  RelatedLink,
  ResultStatus,
  SelectionStep,
  SelectionType,
  Theme,
  FontChoice,
  NotifySettings,
} from "./types";
import {
  DEFAULT_NOTIFY,
  FONT_OPTIONS,
  LS_FONT_KEY,
  LS_KEY,
  LS_SEEDED_KEY,
  LS_THEME_KEY,
} from "./constants";
import { newId } from "./utils";
import { DATA_TABLE, supabase } from "./supabase";
import { normalizeApps, normalizeEvents } from "./io";
import { buildSampleApplications } from "./sample";
import { useAuth } from "./auth";

export type SaveState = "idle" | "saving" | "saved" | "offline";

interface NewApplicationInput {
  company: string;
  role: string;
  priority: Priority;
  selectionType: SelectionType;
  result?: ResultStatus;
}

type AppPatch = Partial<
  Pick<
    Application,
    | "company"
    | "role"
    | "priority"
    | "result"
    | "selectionType"
    | "venueMode"
    | "venuePlace"
    | "memo"
  >
>;

type EventPatch = Partial<Omit<EventItem, "id" | "createdAt" | "updatedAt">>;

interface StoreValue {
  loaded: boolean;
  applications: Application[];
  saveState: SaveState;
  lastSavedAt: number | null;
  theme: Theme;
  setTheme: (t: Theme) => void;
  font: FontChoice;
  setFont: (f: FontChoice) => void;
  notify: NotifySettings;
  setNotify: (patch: Partial<NotifySettings>) => void;
  pushSubscriptions: PushSubscriptionJSON[];
  addPushSubscription: (sub: PushSubscriptionJSON) => void;
  addApplication: (input: NewApplicationInput) => string;
  updateApplication: (id: string, patch: AppPatch) => void;
  deleteApplication: (id: string) => void;
  addStep: (appId: string, kind?: SelectionStep["kind"]) => string | undefined;
  addStepsBulk: (appId: string, kinds: SelectionStep["kind"][]) => void;
  /** 全ステップを kinds で作り直す(手付かず時のテンプレ上書き用) */
  replaceSteps: (appId: string, kinds: SelectionStep["kind"][]) => void;
  updateStep: (
    appId: string,
    stepId: string,
    patch: Partial<Omit<SelectionStep, "id">>,
  ) => void;
  deleteStep: (appId: string, stepId: string) => void;
  moveStep: (appId: string, stepId: string, dir: -1 | 1) => void;
  setStepOrder: (appId: string, orderedIds: string[]) => void;
  addLink: (appId: string) => string | undefined;
  updateLink: (
    appId: string,
    linkId: string,
    patch: Partial<Omit<RelatedLink, "id">>,
  ) => void;
  deleteLink: (appId: string, linkId: string) => void;
  addEsEntry: (appId: string) => string | undefined;
  updateEsEntry: (
    appId: string,
    entryId: string,
    patch: Partial<Omit<ESEntry, "id">>,
  ) => void;
  deleteEsEntry: (appId: string, entryId: string) => void;
  replaceAll: (apps: Application[]) => void;
  /** 全データ(選考+イベント)を空にする。設定の「全データ削除」用。 */
  clearAll: () => void;
  /** 新規(空)ユーザーにだけサンプルを投入。投入したら true。既存データは絶対に壊さない。 */
  seedSampleIfEmpty: () => boolean;
  // ---- 説明会・イベント ----
  events: EventItem[];
  addEvent: (input: { company: string; title: string }) => string;
  updateEvent: (id: string, patch: EventPatch) => void;
  deleteEvent: (id: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const nowISO = () => new Date().toISOString();

function applyFont(font: FontChoice) {
  if (typeof document === "undefined") return;
  const opt = FONT_OPTIONS.find((o) => o.value === font) ?? FONT_OPTIONS[0];
  // 選んだフォントだけ Google Fonts を動的読み込み(初期表示はシステムフォント)
  if (opt.googleHref) {
    const id = `gf-${opt.value}`;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = opt.googleHref;
      document.head.appendChild(link);
    }
  }
  document.documentElement.style.setProperty("--app-font", opt.stack);
}

function makeStep(kind: SelectionStep["kind"] = "es"): SelectionStep {
  return {
    id: newId(),
    kind,
    name: "",
    dueAt: null,
    dueDone: false,
    heldAt: null,
    status: "not_started",
    location: "",
    memo: "",
  };
}

interface LocalData {
  applications: Application[];
  events: EventItem[];
  notify: NotifySettings;
  pushSubscriptions: PushSubscriptionJSON[];
  /** この端末で最後に保存した時刻(ISO)。クラウドの updated_at と比較して新しい方を採用する */
  savedAt: string;
  /** まだクラウドへ送れていない編集があるか(オフライン編集の取りこぼし防止) */
  dirty: boolean;
  theme: Theme | null;
  font: FontChoice | null;
}

function readLocal(key: string): LocalData | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // 旧形式: 配列 or {applications} / 新形式: {applications, events}
    const apps = Array.isArray(parsed) ? parsed : parsed?.applications;
    if (!Array.isArray(apps)) return null;
    return {
      applications: normalizeApps(apps),
      events: normalizeEvents(parsed?.events), // 旧データは events 無し → []
      notify: { ...DEFAULT_NOTIFY, ...(parsed?.notify ?? {}) },
      pushSubscriptions: Array.isArray(parsed?.pushSubscriptions)
        ? parsed.pushSubscriptions
        : [],
      savedAt: typeof parsed?.savedAt === "string" ? parsed.savedAt : "",
      dirty: parsed?.dirty === true,
      theme: typeof parsed?.theme === "string" ? (parsed.theme as Theme) : null,
      font: typeof parsed?.font === "string" ? (parsed.font as FontChoice) : null,
    };
  } catch {
    return null;
  }
}

interface CachePayload {
  applications: Application[];
  events: EventItem[];
  notify: NotifySettings;
  pushSubscriptions: PushSubscriptionJSON[];
  theme: Theme;
  font: FontChoice;
  savedAt: string;
}

/** 端末キャッシュに保存。オフラインでも必ず成功させ、dirty で未送信を記録する。 */
function writeLocal(key: string, payload: CachePayload, dirty: boolean) {
  try {
    localStorage.setItem(key, JSON.stringify({ version: 1, dirty, ...payload }));
  } catch {
    // 容量超過等は無視(UI 表示には影響させない)
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { mode, user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [theme, setThemeState] = useState<Theme>("indigo");
  const [font, setFontState] = useState<FontChoice>("system");
  const [notify, setNotifyState] = useState<NotifySettings>(DEFAULT_NOTIFY);
  const [pushSubscriptions, setPushSubscriptions] = useState<
    PushSubscriptionJSON[]
  >([]);
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const seedTriedRef = useRef(false);

  const cacheKey = mode === "cloud" && user ? `${LS_KEY}:${user.id}` : LS_KEY;

  // ---- テーマ: 読み込み & 適用 & 保存 ----
  useEffect(() => {
    try {
      const t = localStorage.getItem(LS_THEME_KEY) as Theme | null;
      if (t) setThemeState(t);
      const f = localStorage.getItem(LS_FONT_KEY) as FontChoice | null;
      if (f) setFontState(f);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    applyFont(font);
  }, [font]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(LS_THEME_KEY, t);
    } catch {
      // ignore
    }
  }, []);

  const setFont = useCallback((f: FontChoice) => {
    setFontState(f);
    try {
      localStorage.setItem(LS_FONT_KEY, f);
    } catch {
      // ignore
    }
  }, []);

  const setNotify = useCallback((patch: Partial<NotifySettings>) => {
    setNotifyState((prev) => ({ ...prev, ...patch }));
  }, []);

  const addPushSubscription = useCallback((sub: PushSubscriptionJSON) => {
    setPushSubscriptions((prev) => {
      if (prev.some((s) => s.endpoint === sub.endpoint)) return prev;
      return [...prev, sub];
    });
  }, []);

  // ---- 未送信(dirty)の端末キャッシュをクラウドへ追従させる ----
  // 端末キャッシュを唯一の真実として読み、オンラインなら送信。成功で dirty を下ろす。
  // オフライン/失敗時は dirty を保ったまま saveState を "offline" にして、復帰時に再送する。
  const flushToCloud = useCallback(async (): Promise<boolean> => {
    if (mode !== "cloud" || !supabase || !user) return false;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSaveState("offline");
      return false;
    }
    const cached = readLocal(cacheKey);
    if (!cached || !cached.dirty) return false;
    try {
      const { error } = await supabase.from(DATA_TABLE).upsert({
        user_id: user.id,
        data: {
          applications: cached.applications,
          events: cached.events,
          notify: cached.notify,
          pushSubscriptions: cached.pushSubscriptions,
          ...(cached.theme ? { theme: cached.theme } : {}),
          ...(cached.font ? { font: cached.font } : {}),
        },
        updated_at: cached.savedAt || nowISO(),
      });
      if (error) throw error;
      // 送信済み → 同じ内容で dirty を下ろして記録
      writeLocal(
        cacheKey,
        {
          applications: cached.applications,
          events: cached.events,
          notify: cached.notify,
          pushSubscriptions: cached.pushSubscriptions,
          theme: cached.theme ?? "indigo",
          font: cached.font ?? "system",
          savedAt: cached.savedAt || nowISO(),
        },
        false,
      );
      dirtyRef.current = false;
      setSaveState("saved");
      setLastSavedAt(Date.now());
      return true;
    } catch {
      // ネット不調 → 未送信のまま。エラートーストは出さず(編集ごとに鳴ると煩い)、表示だけ「オフライン」
      setSaveState("offline");
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user?.id, cacheKey]);

  // ---- 初回ロード(モード別) ----
  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    seedTriedRef.current = false;
    setLoaded(false);

    (async () => {
      const cached = readLocal(cacheKey);
      if (cached && !cancelled) {
        setApplications(cached.applications);
        setEvents(cached.events);
        setNotifyState(cached.notify);
        setPushSubscriptions(cached.pushSubscriptions);
        if (cached.theme) setThemeState(cached.theme);
        if (cached.font) setFontState(cached.font);
      }

      if (mode === "local" || !supabase || !user) {
        if (!cancelled) setLoaded(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from(DATA_TABLE)
          .select("data, updated_at")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;

        const remote = data?.data;
        const remoteUpdatedAt: string =
          typeof data?.updated_at === "string" ? data.updated_at : "";

        // 端末に未送信(dirty)の編集があるなら「新しい方を採用」。
        // ローカルが新しければ表示を保持してクラウドを追従させる(リロード時の巻き戻し防止)。
        if (cached?.dirty) {
          const localNewer =
            !remoteUpdatedAt ||
            (!!cached.savedAt && cached.savedAt >= remoteUpdatedAt);
          if (localNewer) {
            dirtyRef.current = true;
            if (!cancelled) setLoaded(true);
            await flushToCloud();
            return;
          }
          // クラウドの方が新しい → 以降でクラウドを適用(ローカル編集は破棄)
        }

        if (Array.isArray(remote)) {
          // 旧形式(配列) → applications のみ。events は空で開始
          setApplications(normalizeApps(remote));
          setEvents([]);
        } else if (remote && typeof remote === "object") {
          const apps = normalizeApps((remote as any).applications);
          const evs = normalizeEvents((remote as any).events);
          const ntf = { ...DEFAULT_NOTIFY, ...((remote as any).notify ?? {}) };
          const subs = Array.isArray((remote as any).pushSubscriptions)
            ? (remote as any).pushSubscriptions
            : [];
          setApplications(apps);
          setEvents(evs);
          setNotifyState(ntf);
          setPushSubscriptions(subs);
          if ((remote as any).theme) setTheme((remote as any).theme);
          if ((remote as any).font) setFont((remote as any).font);
          // クラウドを正として採用 → 端末キャッシュを clean 同期(次回起動の判定基準を揃える)
          writeLocal(
            cacheKey,
            {
              applications: apps,
              events: evs,
              notify: ntf,
              pushSubscriptions: subs,
              theme: ((remote as any).theme as Theme) ?? cached?.theme ?? "indigo",
              font: ((remote as any).font as FontChoice) ?? cached?.font ?? "system",
              savedAt: remoteUpdatedAt || nowISO(),
            },
            false,
          );
        } else {
          // クラウドが空 → ローカルのキャッシュ/レガシーを移行
          const legacy = cached ?? readLocal(LS_KEY);
          if (legacy && legacy.applications.length > 0) {
            setApplications(legacy.applications);
            setEvents(legacy.events);
            await supabase.from(DATA_TABLE).upsert({
              user_id: user.id,
              data: {
                applications: legacy.applications,
                events: legacy.events,
              },
              updated_at: nowISO(),
            });
          } else {
            setApplications([]);
            setEvents([]);
          }
        }
      } catch (e) {
        toast.error("クラウドからの読み込みに失敗しました", {
          description: e instanceof Error ? e.message : undefined,
        });
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user?.id]);

  // ---- 変更を 600ms デバウンスで保存 ----
  useEffect(() => {
    if (!loaded) return;
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    dirtyRef.current = true;
    setSaveState("saving");
    const isCloud = mode === "cloud" && !!supabase && !!user;
    const payload: CachePayload = {
      applications,
      events,
      notify,
      pushSubscriptions,
      theme,
      font,
      savedAt: nowISO(),
    };
    const t = window.setTimeout(() => {
      // (1) まず端末に保存。オフラインでも必ず成功させ「見た目の編集」を確定させる。
      //     クラウド利用時は dirty=true で記録し、送信できるまで未送信として残す。
      writeLocal(cacheKey, payload, isCloud);
      if (!isCloud) {
        // ローカルモードは端末保存で完結
        dirtyRef.current = false;
        setSaveState("saved");
        setLastSavedAt(Date.now());
        return;
      }
      // (2) クラウドへ追従。失敗(オフライン)時は dirty のまま → 復帰時に自動再送。
      void flushToCloud();
    }, 600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    applications,
    events,
    notify,
    pushSubscriptions,
    theme,
    font,
    loaded,
    mode,
    user?.id,
    cacheKey,
    flushToCloud,
  ]);

  // ---- 復帰時の同期: 未送信があれば送信(flush)、無ければ他端末の更新を取り込む(pull) ----
  useEffect(() => {
    if (mode !== "cloud" || !supabase || !user) return;
    const sync = async () => {
      if (document.visibilityState === "hidden") return;
      // 未送信のローカル編集があるなら、まず送信して追いつかせる(pull で上書きしない)
      if (dirtyRef.current) {
        await flushToCloud();
        return;
      }
      const { data, error } = await supabase!
        .from(DATA_TABLE)
        .select("data")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !data) return;
      const remote = data.data;
      hydratedRef.current = false;
      if (Array.isArray(remote)) {
        setApplications(normalizeApps(remote));
        setEvents([]);
      } else if (remote && typeof remote === "object") {
        setApplications(normalizeApps((remote as any).applications));
        setEvents(normalizeEvents((remote as any).events));
        setNotifyState({
          ...DEFAULT_NOTIFY,
          ...((remote as any).notify ?? {}),
        });
        setPushSubscriptions(
          Array.isArray((remote as any).pushSubscriptions)
            ? (remote as any).pushSubscriptions
            : [],
        );
        if ((remote as any).theme) setTheme((remote as any).theme);
        if ((remote as any).font) setFont((remote as any).font);
      }
    };
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("online", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("online", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user?.id, flushToCloud]);

  const mutateApp = useCallback(
    (id: string, fn: (app: Application) => Application) => {
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...fn(a), updatedAt: nowISO() } : a)),
      );
    },
    [],
  );

  const addApplication = useCallback((input: NewApplicationInput) => {
    const id = newId();
    const ts = nowISO();
    const app: Application = {
      id,
      company: input.company.trim(),
      role: input.role.trim(),
      priority: input.priority,
      result: input.result ?? "in_progress",
      selectionType: input.selectionType,
      venueMode: "",
      venuePlace: "",
      links: [],
      esEntries: [],
      memo: "",
      steps: [],
      createdAt: ts,
      updatedAt: ts,
    };
    setApplications((prev) => [app, ...prev]);
    return id;
  }, []);

  const updateApplication = useCallback<StoreValue["updateApplication"]>(
    (id, patch) => mutateApp(id, (a) => ({ ...a, ...patch })),
    [mutateApp],
  );

  const deleteApplication = useCallback((id: string) => {
    setApplications((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addStep = useCallback<StoreValue["addStep"]>(
    (appId, kind = "es") => {
      const step = makeStep(kind);
      mutateApp(appId, (a) => ({ ...a, steps: [...a.steps, step] }));
      return step.id;
    },
    [mutateApp],
  );

  const addStepsBulk = useCallback<StoreValue["addStepsBulk"]>(
    (appId, kinds) =>
      mutateApp(appId, (a) => ({
        ...a,
        steps: [...a.steps, ...kinds.map((k) => makeStep(k))],
      })),
    [mutateApp],
  );

  const replaceSteps = useCallback<StoreValue["replaceSteps"]>(
    (appId, kinds) =>
      mutateApp(appId, (a) => ({
        ...a,
        steps: kinds.map((k) => makeStep(k)),
      })),
    [mutateApp],
  );

  const updateStep = useCallback<StoreValue["updateStep"]>(
    (appId, stepId, patch) =>
      mutateApp(appId, (a) => ({
        ...a,
        steps: a.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
      })),
    [mutateApp],
  );

  const deleteStep = useCallback<StoreValue["deleteStep"]>(
    (appId, stepId) =>
      mutateApp(appId, (a) => ({
        ...a,
        steps: a.steps.filter((s) => s.id !== stepId),
      })),
    [mutateApp],
  );

  const moveStep = useCallback<StoreValue["moveStep"]>(
    (appId, stepId, dir) =>
      mutateApp(appId, (a) => {
        const idx = a.steps.findIndex((s) => s.id === stepId);
        const next = idx + dir;
        if (idx < 0 || next < 0 || next >= a.steps.length) return a;
        const steps = [...a.steps];
        [steps[idx], steps[next]] = [steps[next], steps[idx]];
        return { ...a, steps };
      }),
    [mutateApp],
  );

  const setStepOrder = useCallback<StoreValue["setStepOrder"]>(
    (appId, orderedIds) =>
      mutateApp(appId, (a) => {
        const byId = new Map(a.steps.map((s) => [s.id, s]));
        const steps = orderedIds
          .map((id) => byId.get(id))
          .filter((s): s is SelectionStep => !!s);
        // 取りこぼし防止
        for (const s of a.steps) if (!orderedIds.includes(s.id)) steps.push(s);
        return { ...a, steps };
      }),
    [mutateApp],
  );

  const addLink = useCallback<StoreValue["addLink"]>(
    (appId) => {
      const link: RelatedLink = { id: newId(), label: "", url: "" };
      mutateApp(appId, (a) => ({ ...a, links: [...a.links, link] }));
      return link.id;
    },
    [mutateApp],
  );

  const updateLink = useCallback<StoreValue["updateLink"]>(
    (appId, linkId, patch) =>
      mutateApp(appId, (a) => ({
        ...a,
        links: a.links.map((l) => (l.id === linkId ? { ...l, ...patch } : l)),
      })),
    [mutateApp],
  );

  const deleteLink = useCallback<StoreValue["deleteLink"]>(
    (appId, linkId) =>
      mutateApp(appId, (a) => ({
        ...a,
        links: a.links.filter((l) => l.id !== linkId),
      })),
    [mutateApp],
  );

  const addEsEntry = useCallback<StoreValue["addEsEntry"]>(
    (appId) => {
      const entry: ESEntry = {
        id: newId(),
        question: "",
        answer: "",
        charLimit: null,
      };
      mutateApp(appId, (a) => ({ ...a, esEntries: [...a.esEntries, entry] }));
      return entry.id;
    },
    [mutateApp],
  );

  const updateEsEntry = useCallback<StoreValue["updateEsEntry"]>(
    (appId, entryId, patch) =>
      mutateApp(appId, (a) => ({
        ...a,
        esEntries: a.esEntries.map((e) =>
          e.id === entryId ? { ...e, ...patch } : e,
        ),
      })),
    [mutateApp],
  );

  const deleteEsEntry = useCallback<StoreValue["deleteEsEntry"]>(
    (appId, entryId) =>
      mutateApp(appId, (a) => ({
        ...a,
        esEntries: a.esEntries.filter((e) => e.id !== entryId),
      })),
    [mutateApp],
  );

  const replaceAll = useCallback((apps: Application[]) => {
    setApplications(apps);
  }, []);

  const clearAll = useCallback(() => {
    setApplications([]);
    setEvents([]);
  }, []);

  const mutateEvent = useCallback(
    (id: string, fn: (e: EventItem) => EventItem) => {
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...fn(e), updatedAt: nowISO() } : e)),
      );
    },
    [],
  );

  const addEvent = useCallback<StoreValue["addEvent"]>((input) => {
    const id = newId();
    const ts = nowISO();
    const ev: EventItem = {
      id,
      company: input.company.trim(),
      title: input.title.trim(),
      venueMode: "",
      venuePlace: "",
      applyBy: null,
      applyDone: false,
      heldAt: null,
      url: "",
      memo: "",
      status: "todo",
      createdAt: ts,
      updatedAt: ts,
    };
    setEvents((prev) => [ev, ...prev]);
    return id;
  }, []);

  const updateEvent = useCallback<StoreValue["updateEvent"]>(
    (id, patch) => mutateEvent(id, (e) => ({ ...e, ...patch })),
    [mutateEvent],
  );

  const deleteEvent = useCallback<StoreValue["deleteEvent"]>((id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const seedSampleIfEmpty = useCallback((): boolean => {
    // (1) クラウド取得完了まで投入しない
    if (!loaded) return false;
    // 同一マウントでの二重発火を防ぐ
    if (seedTriedRef.current) return false;
    // (2) シード済みフラグ(ユーザー別に分離)があればスキップ=全削除後も再湧きしない
    const seededKey =
      mode === "cloud" && user ? `${LS_SEEDED_KEY}:${user.id}` : LS_SEEDED_KEY;
    let already = false;
    try {
      already = !!localStorage.getItem(seededKey);
    } catch {
      // ignore
    }
    if (already) return false;
    seedTriedRef.current = true;
    try {
      localStorage.setItem(seededKey, "1");
    } catch {
      // ignore
    }
    // (3) 関数形で prev.length を再判定 → 既存データがあれば絶対に上書きしない最終防御
    let didSeed = false;
    setApplications((prev) => {
      if (prev.length > 0) return prev;
      didSeed = true;
      return buildSampleApplications();
    });
    return didSeed;
  }, [loaded, mode, user?.id]);

  const value: StoreValue = {
    loaded,
    applications,
    saveState,
    lastSavedAt,
    theme,
    setTheme,
    font,
    setFont,
    notify,
    setNotify,
    pushSubscriptions,
    addPushSubscription,
    addApplication,
    updateApplication,
    deleteApplication,
    addStep,
    addStepsBulk,
    replaceSteps,
    updateStep,
    deleteStep,
    moveStep,
    setStepOrder,
    addLink,
    updateLink,
    deleteLink,
    addEsEntry,
    updateEsEntry,
    deleteEsEntry,
    replaceAll,
    clearAll,
    seedSampleIfEmpty,
    events,
    addEvent,
    updateEvent,
    deleteEvent,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore は StoreProvider の中で使ってください");
  return ctx;
}
