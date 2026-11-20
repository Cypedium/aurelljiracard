// "Sign in with Google" via Google Identity Services. The client id is public (the same as GOOGLE_CLIENT_ID
// in server-java) and baked in at build time; empty = the Google buttons are not shown
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
export const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
// Google's button is at most 400 px wide
export const GOOGLE_BUTTON_MAX_WIDTH = 400;
export const GOOGLE_BUTTON_FALLBACK_WIDTH = 300;
export const GOOGLE_LOAD_ERROR_TOAST_ID = "google-script";

export type GoogleButtonText = "signin_with" | "continue_with" | "signup_with";

// Only the parts of google.accounts.id that are used
type GoogleIdentity = {
  initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
  renderButton: (
    parent: HTMLElement,
    options: { theme: "outline"; size: "large"; text: GoogleButtonText; shape: "rectangular"; width: number },
  ) => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentity } };
  }
}

// The script loads once, the first time a Google button is shown
let loading: Promise<GoogleIdentity> | null = null;

export const loadGoogleIdentity = (): Promise<GoogleIdentity> => {
  const loaded = window.google?.accounts?.id;
  if (loaded) return Promise.resolve(loaded);
  loading ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      const id = window.google?.accounts?.id;
      if (id) resolve(id);
      else reject(new Error("Google sign-in script has no accounts.id"));
    };
    script.onerror = () => {
      loading = null; // the next button tries again
      script.remove();
      reject(new Error("Could not load the Google sign-in script"));
    };
    document.head.appendChild(script);
  });
  return loading;
};

export const googleButtonWidth = (containerWidth: number): number =>
  Math.min(containerWidth || GOOGLE_BUTTON_FALLBACK_WIDTH, GOOGLE_BUTTON_MAX_WIDTH);
