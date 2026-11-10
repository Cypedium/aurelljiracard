export const LOADING_TOAST_ID = "loading-data";
// Bara registrering, inloggning och utloggning visar loading-toasten; data som laddas visar skeletons
const LOADING_TOAST_TEXTS: Record<string, string> = {
  "/auth/register": "Creating account, please wait…",
  "/auth/login": "Logging in, please wait…",
  "/auth/google": "Logging in, please wait…",
  "/auth/logout": "Logging out, please wait…",
};
export const loadingToastText = (url?: string): string | null => (url && LOADING_TOAST_TEXTS[url]) || null;
// Visas bara om anropet dröjer, t.ex. när Fly väcker en stoppad maskin (cold start)
export const LOADING_TOAST_DELAY_MS = 800;

export type LoadingTracker = { start: () => void; done: () => void };

// Räknar pågående anrop: show() efter delayMs om något fortfarande pågår, hide() när alla är klara
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
