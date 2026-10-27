import { isAxiosError } from "axios";

// Backendens { message } om det finns, annars fallback (nätverksfel, okänt fel)
export const apiErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};
