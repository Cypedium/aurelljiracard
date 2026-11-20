import { isAxiosError } from "axios";
import { toast } from "sonner";

// The backend's { message } if there is one, otherwise the fallback (network error, unknown error)
export const apiErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

// 503 = the feature is switched off or Aurello is in read-only mode (server-java)
export const isServiceUnavailable = (error: unknown): boolean =>
  isAxiosError(error) && error.response?.status === 503;

// 409 = conflict, e.g. an issue key that already exists
export const isConflictError = (error: unknown): boolean =>
  isAxiosError(error) && error.response?.status === 409;

// Logs only the message: an axios error contains the request (the Authorization header, sometimes tokens in the body)
export const logError = (context: string, error: unknown) =>
  console.error(`${context}:`, error instanceof Error ? error.message : String(error));

// A failed call: log the message and show the backend's { message } (otherwise the fallback) in a toast.
// toastId: repeated errors (e.g. background fetches) replace each other instead of stacking up
export const reportError = (context: string, error: unknown, fallback: string, toastId?: string) => {
  logError(context, error);
  toast.error(apiErrorMessage(error, fallback), toastId ? { id: toastId } : undefined);
};
