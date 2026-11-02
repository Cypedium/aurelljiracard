export const LOADING_TOAST_ID = "loading-data";
export const LOADING_TOAST_TEXT = "Loading data, please wait…";
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
