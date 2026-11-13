import axios from "axios";
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

// Response interceptor: förnyar ett utgånget accessToken, med kö för samtidiga requests
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

const handleResponseError = async (error: any) => {
    const originalRequest = error.config;

    // AccessToken expired → 401. Inte för /auth/*: där betyder 401 t.ex. fel lösenord
    const isAuthRequest = originalRequest?.url?.startsWith("/auth/");
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        window.location.href = ROUTES.login;
        return Promise.reject(error);
      }

      // Om refresh redan pågår → vänta i kön
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });

        const newAccessToken = res.data.accessToken;
        const newRefreshToken = res.data.refreshToken;

        // Båda tokens byts (refresh-tokens är engångs)
        saveTokens(newAccessToken, newRefreshToken);

        // Uppdatera default header
        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);

        // Kör om originalrequesten
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);

      } catch (refreshError) {
        // Bara meddelandet: axios-felet innehåller requesten, med refresh-tokenet
        logError("Refresh token failed", refreshError);

        processQueue(refreshError, null);

        // Tokens ogiltiga → logga ut (även användarnamnet)
        clearSession();
        window.location.href = ROUTES.login;

        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
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
