import { isAxiosError } from "axios";
import { toast } from "sonner";

// Backendens { message } om det finns, annars fallback (nätverksfel, okänt fel)
export const apiErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

// 409 = konflikt, t.ex. ett issue key som redan finns
export const isConflictError = (error: unknown): boolean =>
  isAxiosError(error) && error.response?.status === 409;

// Loggar bara meddelandet: ett axios-fel innehåller requesten (Authorization-headern, ibland tokens i body)
export const logError = (context: string, error: unknown) =>
  console.error(`${context}:`, error instanceof Error ? error.message : String(error));

// Misslyckat anrop: logga meddelandet och visa backendens { message } (annars fallback) i en toast.
// toastId: upprepade fel (t.ex. bakgrundshämtningar) ersätter varandra i stället för att staplas
export const reportError = (context: string, error: unknown, fallback: string, toastId?: string) => {
  logError(context, error);
  toast.error(apiErrorMessage(error, fallback), toastId ? { id: toastId } : undefined);
};
