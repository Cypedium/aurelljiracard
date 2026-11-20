import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { logError } from "../utils/apiError";
import { clearSession, getAccessToken, getRefreshToken, saveTokens } from "../utils/session";
import {
  LOADING_TOAST_DELAY_MS,
  LOADING_TOAST_ID,
  createLoadingTracker,
  loadingToastText,
} from "../utils/loadingToast";
import { ROUTES } from "../utils/routes";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
});

// Långsam registrering/inloggning/utloggning (t.ex. cold start i produktion) visar en loading-toast
let loadingText = "";
const loadingTracker = createLoadingTracker(
  () => toast.loading(loadingText, { id: LOADING_TOAST_ID }),
  () => toast.dismiss(LOADING_TOAST_ID),
  LOADING_TOAST_DELAY_MS
);

// Request interceptor: lägger till accessToken automatiskt
api.interceptors.request.use(
  (config) => {
    const text = loadingToastText(config.url);
    if (text) {
      loadingText = text;
      loadingTracker.start();
    }
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 503 = en avstängd funktion eller read-only-läge (server-java): useFeatures hämtar om /feature
const serviceUnavailableListeners = new Set<() => void>();
export const onServiceUnavailable = (listener: () => void): (() => void) => {
  serviceUnavailableListeners.add(listener);
  return () => serviceUnavailableListeners.delete(listener);
};

// Pågående förnyelse: samtidiga 401:or väntar på samma, så refresh-tokenet (engångs) skickas bara en gång
let refreshing: Promise<string> | null = null;

const refreshAccessToken = (refreshToken: string): Promise<string> => {
  refreshing ??= axios
    // Direkt med axios: via api skulle en 401 här fångas av interceptorn igen
    .post<{ accessToken: string; refreshToken: string }>(`${API_URL}/auth/refresh`, { refreshToken })
    .then(({ data }) => {
      // Båda tokens byts (refresh-tokens är engångs)
      saveTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    })
    .catch((refreshError: unknown) => {
      // Bara meddelandet: axios-felet innehåller requesten, med refresh-tokenet
      logError("Refresh token failed", refreshError);
      // Tokens ogiltiga → logga ut (även användarnamnet)
      clearSession();
      window.location.href = ROUTES.login;
      throw refreshError;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
};

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

// Response interceptor: ett utgånget accessToken (401) förnyas och requesten körs om en gång
const handleResponseError = async (error: AxiosError) => {
  const originalRequest = error.config as RetriableRequest | undefined;
  const status = error.response?.status;

  // Själva felet visar anroparen som vanligt (backendens { message } i en toast)
  if (status === 503) serviceUnavailableListeners.forEach((listener) => listener());

  // Inte för /auth/*: där betyder 401 t.ex. fel lösenord
  const isAuthRequest = originalRequest?.url?.startsWith("/auth/");
  if (status !== 401 || !originalRequest || originalRequest._retry || isAuthRequest) throw error;
  originalRequest._retry = true;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    window.location.href = ROUTES.login;
    throw error;
  }

  const newAccessToken = await refreshAccessToken(refreshToken);
  originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
  return api(originalRequest);
};

api.interceptors.response.use(
  (response) => {
    if (loadingToastText(response.config.url)) loadingTracker.done();
    return response;
  },
  // done() först när ev. refresh + omkörning är klar, så toasten inte blinkar
  (error) =>
    handleResponseError(error).finally(() => {
      if (loadingToastText(error.config?.url)) loadingTracker.done();
    })
);

export default api;
