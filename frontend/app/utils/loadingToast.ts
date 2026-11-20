export const LOADING_TOAST_ID = "loading-data";
// Only registration, login and logout show the loading toast; data that loads shows skeletons
const LOADING_TOAST_TEXTS: Record<string, string> = {
  "/auth/register": "Creating account, please wait…",
  "/auth/login": "Logging in, please wait…",
  "/auth/google": "Logging in, please wait…",
  "/auth/logout": "Logging out, please wait…",
};
export const loadingToastText = (url?: string): string | null => (url && LOADING_TOAST_TEXTS[url]) || null;
// Shown only if the call takes a while, e.g. when Fly wakes a stopped machine (cold start)
export const LOADING_TOAST_DELAY_MS = 800;

export type LoadingTracker = { start: () => void; done: () => void };

// Counts calls in progress: show() after delayMs if any is still running, hide() when all are done
export function createLoadingTracker(show: () => void, hide: () => void, delayMs: number): LoadingTracker {
  let pending = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let shown = false;

  return {
    start() {
      pending++;
      if (pending === 1 && !shown) {
        timer = setTimeout(() => {
          timer = null;
          shown = true;
          show();
        }, delayMs);
      }
    },
    done() {
      pending = Math.max(0, pending - 1);
      if (pending > 0) return;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (shown) {
        shown = false;
        hide();
      }
    },
  };
}
