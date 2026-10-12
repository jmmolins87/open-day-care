"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MotionConfig } from "framer-motion";
import {
  setGlobalLoaderHandlers,
  withGlobalLoader,
} from "@/utils/loader/global-tracker";

export type LoaderVariant = "spinner" | "dots" | "bar";
export type LoaderSize = "sm" | "md" | "lg";

export interface GlobalLoaderState {
  isVisible: boolean;
  message?: string;
}

export interface InlineLoaderState {
  isVisible: boolean;
  variant: LoaderVariant;
  size: LoaderSize;
  message?: string;
}

interface LoaderContextValue {
  globalState: GlobalLoaderState;
  showGlobal: (message?: string) => void;
  hideGlobal: () => void;
  inlineStates: Map<string, InlineLoaderState>;
  showInline: (id: string, options?: Partial<InlineLoaderState>) => void;
  hideInline: (id: string) => void;
  getInlineState: (id: string) => InlineLoaderState | undefined;
}

const LoaderContext = createContext<LoaderContextValue | null>(null);

const DEFAULT_INLINE_STATE: InlineLoaderState = {
  isVisible: false,
  variant: "spinner",
  size: "md",
};

function createInlineState(
  overrides?: Partial<InlineLoaderState>,
): InlineLoaderState {
  return { ...DEFAULT_INLINE_STATE, ...overrides, isVisible: true };
}

// Timing per docs/discusiones/01-loader-design-spec.md:
// 200ms show delay (no flash on fast requests), 400ms minimum visible
// (no flicker on bursts). Exit transitions are 150ms (see Loader.tsx).
const SHOW_DELAY_MS = 200;
const MIN_VISIBLE_MS = 400;
const INLINE_SHOW_DELAY_MS = 150;
const INLINE_HIDE_DELAY_MS = 150;

type Timeout = ReturnType<typeof setTimeout>;

export function LoaderProvider({ children }: { children: ReactNode }) {
  // Real React state: every update re-renders consumers, never stale.
  const [globalState, setGlobalState] = useState<GlobalLoaderState>({
    isVisible: false,
  });
  const [inlineStates, setInlineStates] = useState<
    Map<string, InlineLoaderState>
  >(() => new Map());

  // Refcount survives re-renders and pairs concurrent requests:
  // visible while pendingCount > 0, hidden only when it reaches 0.
  const pendingCountRef = useRef(0);
  const visibleRef = useRef(false);
  const visibleSinceRef = useRef(0);
  const pendingMessageRef = useRef<string | undefined>(undefined);
  const showTimerRef = useRef<Timeout | null>(null);
  const hideTimerRef = useRef<Timeout | null>(null);
  const inlineTimersRef = useRef<
    Map<string, { show?: Timeout; hide?: Timeout }>
  >(new Map());

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showGlobal = useCallback(
    (message?: string) => {
      pendingCountRef.current += 1;
      if (message !== undefined) {
        pendingMessageRef.current = message;
      }
      // A new request cancels a pending hide: no flicker on bursts.
      clearHideTimer();

      if (visibleRef.current) {
        if (message !== undefined) {
          setGlobalState((prev) =>
            prev.message === message ? prev : { ...prev, message },
          );
        }
        return;
      }
      if (showTimerRef.current) return;

      showTimerRef.current = setTimeout(() => {
        showTimerRef.current = null;
        visibleRef.current = true;
        visibleSinceRef.current = Date.now();
        setGlobalState({
          isVisible: true,
          message: pendingMessageRef.current,
        });
      }, SHOW_DELAY_MS);
    },
    [clearHideTimer],
  );

  const hideGlobal = useCallback(() => {
    // Clamp at 0: an unpaired hide (double finally, unmounted caller)
    // must never drive the count negative and stick the loader on.
    pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
    if (pendingCountRef.current > 0) return;

    // Response arrived before the show delay: never became visible.
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
      pendingMessageRef.current = undefined;
      return;
    }

    if (!visibleRef.current || hideTimerRef.current) return;

    const elapsed = Date.now() - visibleSinceRef.current;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      // A request may have started while waiting: stay visible.
      if (pendingCountRef.current > 0) return;
      visibleRef.current = false;
      pendingMessageRef.current = undefined;
      setGlobalState({ isVisible: false, message: undefined });
    }, wait);
  }, []);

  const showInline = useCallback((id: string, options?: Partial<InlineLoaderState>) => {
    const timers = inlineTimersRef.current.get(id);
    if (timers?.hide) {
      clearTimeout(timers.hide);
      timers.hide = undefined;
    }
    if (timers?.show) return;

    const showTimer: Timeout = setTimeout(() => {
      inlineTimersRef.current.delete(id);
      setInlineStates((prev) => {
        const next = new Map(prev);
        next.set(id, createInlineState(options));
        return next;
      });
    }, INLINE_SHOW_DELAY_MS);
    inlineTimersRef.current.set(id, { ...timers, show: showTimer });
  }, []);

  const hideInline = useCallback((id: string) => {
    const timers = inlineTimersRef.current.get(id);
    if (timers?.show) {
      clearTimeout(timers.show);
      inlineTimersRef.current.delete(id);
      return;
    }
    if (timers?.hide) return;

    const hideTimer: Timeout = setTimeout(() => {
      inlineTimersRef.current.delete(id);
      setInlineStates((prev) => {
        const current = prev.get(id);
        if (!current?.isVisible) return prev;
        const next = new Map(prev);
        next.set(id, { ...current, isVisible: false });
        return next;
      });
    }, INLINE_HIDE_DELAY_MS);
    inlineTimersRef.current.set(id, { ...timers, hide: hideTimer });
  }, []);

  const getInlineState = useCallback(
    (id: string) => inlineStates.get(id),
    [inlineStates],
  );

  // Bridge for hook-free code (utils/supabase/queries.ts, fetch wrappers):
  // register stable callbacks once, unregister + reset on unmount.
  useEffect(() => {
    setGlobalLoaderHandlers({ show: showGlobal, hide: hideGlobal });
    const inlineTimers = inlineTimersRef.current;
    return () => {
      setGlobalLoaderHandlers(null);
      pendingCountRef.current = 0;
      visibleRef.current = false;
      pendingMessageRef.current = undefined;
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      inlineTimers.forEach(({ show, hide }) => {
        if (show) clearTimeout(show);
        if (hide) clearTimeout(hide);
      });
      inlineTimers.clear();
    };
  }, [showGlobal, hideGlobal]);

  const value = useMemo<LoaderContextValue>(
    () => ({
      globalState,
      showGlobal,
      hideGlobal,
      inlineStates,
      showInline,
      hideInline,
      getInlineState,
    }),
    [
      globalState,
      showGlobal,
      hideGlobal,
      inlineStates,
      showInline,
      hideInline,
      getInlineState,
    ],
  );

  return (
    <MotionConfig reducedMotion="user">
      <LoaderContext.Provider value={value}>
        {children}
      </LoaderContext.Provider>
    </MotionConfig>
  );
}

export function useLoaderContext() {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error("useLoaderContext must be used within a LoaderProvider");
  }
  return context;
}

export interface UseGlobalLoaderReturn {
  isVisible: boolean;
  message?: string;
  show: (message?: string) => void;
  hide: () => void;
  /** Runs `task` with the loader shown until it settles (try/finally semantics). */
  run: <T>(task: () => T | PromiseLike<T>, message?: string) => Promise<Awaited<T>>;
}

/**
 * Simple global-loader hook for Client Components.
 * For Server Actions, bridge `pending` from `useActionState`:
 *
 *   const { show, hide } = useGlobalLoader();
 *   useEffect(() => {
 *     if (!pending) return;
 *     show("Saving…");
 *     return () => hide();
 *   }, [pending, show, hide]);
 */
export function useGlobalLoader(): UseGlobalLoaderReturn {
  const { globalState, showGlobal, hideGlobal } = useLoaderContext();
  const run = useCallback(
    <T,>(task: () => T | PromiseLike<T>, message?: string) =>
      withGlobalLoader(task, message),
    [],
  );
  return useMemo(
    () => ({
      isVisible: globalState.isVisible,
      message: globalState.message,
      show: showGlobal,
      hide: hideGlobal,
      run,
    }),
    [globalState, showGlobal, hideGlobal, run],
  );
}
