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

// Slow registration/login/logout (e.g. a cold start in production) shows a loading toast
let loadingText = "";
const loadingTracker = createLoadingTracker(
  () => toast.loading(loadingText, { id: LOADING_TOAST_ID }),
  () => toast.dismiss(LOADING_TOAST_ID),
  LOADING_TOAST_DELAY_MS
);

// Request interceptor: adds the accessToken automatically
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

// 503 = a switched-off feature or read-only mode (server-java): useFeatures fetches /feature again
const serviceUnavailableListeners = new Set<() => void>();
export const onServiceUnavailable = (listener: () => void): (() => void) => {
  serviceUnavailableListeners.add(listener);
  return () => serviceUnavailableListeners.delete(listener);
};

// The refresh in progress: concurrent 401s wait for the same one, so the (single-use) refresh token is sent only once
let refreshing: Promise<string> | null = null;

const refreshAccessToken = (refreshToken: string): Promise<string> => {
  refreshing ??= axios
    // Straight through axios: through api, a 401 here would be caught by the interceptor again
    .post<{ accessToken: string; refreshToken: string }>(`${API_URL}/auth/refresh`, { refreshToken })
    .then(({ data }) => {
      // Both tokens are replaced (refresh tokens are single-use)
      saveTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    })
    .catch((refreshError: unknown) => {
      // Only the message: the axios error contains the request, with the refresh token
      logError("Refresh token failed", refreshError);
      // Invalid tokens → log out (the username too)
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

// Response interceptor: an expired accessToken (401) is refreshed and the request is retried once
const handleResponseError = async (error: AxiosError) => {
  const originalRequest = error.config as RetriableRequest | undefined;
  const status = error.response?.status;

  // The error itself is shown by the caller as usual (the backend's { message } in a toast)
  if (status === 503) serviceUnavailableListeners.forEach((listener) => listener());

  // Not for /auth/*: there a 401 means e.g. a wrong password
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
  // done() only once any refresh + retry is finished, so the toast doesn't flicker
  (error) =>
    handleResponseError(error).finally(() => {
      if (loadingToastText(error.config?.url)) loadingTracker.done();
    })
);

export default api;
