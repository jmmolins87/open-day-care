/**
 * Framework-free bridge between data fetching and the global loader UI.
 *
 * Why a module-level bridge? Query helpers in `utils/supabase/queries.ts`
 * are plain async functions (no React hooks allowed), and Server Components
 * render without a loader provider. This module holds the currently mounted
 * loader handlers (registered by `LoaderProvider`) so any code can report
 * backend activity without importing React.
 *
 * On the server, or when no provider is mounted, there are no handlers and
 * every helper below degrades to a plain pass-through — never throws, never
 * leaves a loader stuck.
 *
 * Pairing rule: every `show` is always followed by `hide` in a `finally`
 * path, including errors, rejections and synchronous throws. The provider
 * additionally clamps its internal refcount at 0, so an unpaired `hide`
 * is a harmless no-op.
 */

interface GlobalLoaderHandlers {
  show: (message?: string) => void;
  hide: () => void;
}

let handlers: GlobalLoaderHandlers | null = null;

/** Called once by `LoaderProvider` on mount, cleared on unmount. */
export function setGlobalLoaderHandlers(
  next: GlobalLoaderHandlers | null,
): void {
  handlers = next;
}

/**
 * Runs `task` while the global loader is shown.
 * The loader hides when the task settles — success, error or abort.
 *
 * Accepts promise-returning thunks AND Supabase query builders (thenables):
 * `withGlobalLoader(() => supabase.from("children").select())`.
 */
export function withGlobalLoader<T>(
  task: () => T | PromiseLike<T>,
  message?: string,
): Promise<Awaited<T>> {
  handlers?.show(message);
  let result: T | PromiseLike<T>;
  try {
    result = task();
  } catch (error) {
    handlers?.hide();
    throw error;
  }
  return Promise.resolve(result).then(
    (value) => {
      handlers?.hide();
      return value as Awaited<T>;
    },
    (error) => {
      handlers?.hide();
      throw error;
    },
  );
}

/**
 * Tracks an already-started promise (fetch, Supabase query, …).
 * Prefer `withGlobalLoader` for new code so `show` runs before the work
 * starts; use this when you only have the promise in hand.
 */
export function trackPromise<T>(
  promise: T | PromiseLike<T>,
  message?: string,
): Promise<Awaited<T>> {
  return withGlobalLoader(() => promise, message);
}

/** `fetch` wrapper that shows the global loader until the response arrives. */
export function fetchWithLoader(
  input: RequestInfo | URL,
  init?: RequestInit,
  message?: string,
): Promise<Response> {
  return withGlobalLoader(() => fetch(input, init), message);
}
