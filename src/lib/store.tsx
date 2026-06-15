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
  Priority,
  RelatedLink,
  ResultStatus,
  SelectionStep,
} from "./types";
import { LS_KEY } from "./constants";
import { newId } from "./utils";
import { DATA_TABLE, supabase } from "./supabase";
import { useAuth } from "./auth";

export type SaveState = "idle" | "saving" | "saved";

interface NewApplicationInput {
  company: string;
  role: string;
  priority: Priority;
  result?: ResultStatus;
}

interface StoreValue {
  loaded: boolean;
  applications: Application[];
  saveState: SaveState;
  lastSavedAt: number | null;
  addApplication: (input: NewApplicationInput) => string;
  updateApplication: (
    id: string,
    patch: Partial<
      Pick<Application, "company" | "role" | "priority" | "result" | "memo">
    >,
  ) => void;
  deleteApplication: (id: string) => void;
  addStep: (appId: string) => string | undefined;
  updateStep: (
    appId: string,
    stepId: string,
    patch: Partial<Omit<SelectionStep, "id">>,
  ) => void;
  deleteStep: (appId: string, stepId: string) => void;
  moveStep: (appId: string, stepId: string, dir: -1 | 1) => void;
  addLink: (appId: string) => string | undefined;
  updateLink: (
    appId: string,
    linkId: string,
    patch: Partial<Omit<RelatedLink, "id">>,
  ) => void;
  deleteLink: (appId: string, linkId: string) => void;
  replaceAll: (apps: Application[]) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const nowISO = () => new Date().toISOString();

function makeStep(): SelectionStep {
  return {
    id: newId(),
    kind: "es",
    name: "",
    dueAt: null,
    status: "not_started",
    memo: "",
  };
}

function readLocal(key: string): Application[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const apps = Array.isArray(parsed) ? parsed : parsed?.applications;
    return Array.isArray(apps) ? (apps as Application[]) : null;
  } catch {
    return null;
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { mode, user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);

  const cacheKey =
    mode === "cloud" && user ? `${LS_KEY}:${user.id}` : LS_KEY;

  // ---- 初回ロード(モード別) ----
  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    setLoaded(false);

    (async () => {
      const cached = readLocal(cacheKey);
      if (cached && !cancelled) setApplications(cached);

      if (mode === "local" || !supabase || !user) {
        if (!cancelled) setLoaded(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from(DATA_TABLE)
          .select("data")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;

        if (data && Array.isArray(data.data)) {
          setApplications(data.data as Application[]);
        } else {
          // クラウドに未保存: 旧ローカルデータがあれば引き継いで移行
          const legacy = cached ?? readLocal(LS_KEY);
          if (legacy && legacy.length > 0) {
            setApplications(legacy);
            await supabase
              .from(DATA_TABLE)
              .upsert({ user_id: user.id, data: legacy, updated_at: nowISO() });
          } else {
            setApplications([]);
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

  // ---- 変更を 600ms デバウンスで保存(ローカルキャッシュ + クラウド) ----
  useEffect(() => {
    if (!loaded) return;
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    dirtyRef.current = true;
    setSaveState("saving");
    const t = window.setTimeout(async () => {
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ version: 1, savedAt: nowISO(), applications }),
        );
        if (mode === "cloud" && supabase && user) {
          const { error } = await supabase
            .from(DATA_TABLE)
            .upsert({ user_id: user.id, data: applications, updated_at: nowISO() });
          if (error) throw error;
        }
        dirtyRef.current = false;
        setSaveState("saved");
        setLastSavedAt(Date.now());
      } catch (e) {
        setSaveState("idle");
        toast.error("保存に失敗しました", {
          description: e instanceof Error ? e.message : undefined,
        });
      }
    }, 600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applications, loaded, mode, user?.id]);

  // ---- 他端末の更新を取り込む(クラウドのみ・未保存編集中は上書きしない) ----
  useEffect(() => {
    if (mode !== "cloud" || !supabase || !user) return;
    const pull = async () => {
      if (document.visibilityState !== "visible") return;
      if (dirtyRef.current) return;
      const { data, error } = await supabase!
        .from(DATA_TABLE)
        .select("data")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !data || !Array.isArray(data.data)) return;
      hydratedRef.current = false; // 外部由来の反映は保存ループにしない
      setApplications(data.data as Application[]);
    };
    document.addEventListener("visibilitychange", pull);
    window.addEventListener("focus", pull);
    return () => {
      document.removeEventListener("visibilitychange", pull);
      window.removeEventListener("focus", pull);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user?.id]);

  // ---- 1社単位の不変更新ヘルパ ----
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
      links: [],
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
    (appId) => {
      const step = makeStep();
      mutateApp(appId, (a) => ({ ...a, steps: [...a.steps, step] }));
      return step.id;
    },
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

  const replaceAll = useCallback((apps: Application[]) => {
    setApplications(apps);
  }, []);

  const value: StoreValue = {
    loaded,
    applications,
    saveState,
    lastSavedAt,
    addApplication,
    updateApplication,
    deleteApplication,
    addStep,
    updateStep,
    deleteStep,
    moveStep,
    addLink,
    updateLink,
    deleteLink,
    replaceAll,
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
