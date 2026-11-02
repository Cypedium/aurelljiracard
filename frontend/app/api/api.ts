import axios from "axios";
import { toast } from "sonner";
import {
  LOADING_TOAST_DELAY_MS,
  LOADING_TOAST_ID,
  LOADING_TOAST_TEXT,
  createLoadingTracker,
} from "../utils/loadingToast";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
});

// Långsamma anrop (t.ex. cold start i produktion) visar en loading-toast
const loadingTracker = createLoadingTracker(
  () => toast.loading(LOADING_TOAST_TEXT, { id: LOADING_TOAST_ID }),
  () => toast.dismiss(LOADING_TOAST_ID),
  LOADING_TOAST_DELAY_MS
);

// ⭐ REQUEST INTERCEPTOR — lägg till accessToken automatiskt
api.interceptors.request.use(
  (config) => {
    loadingTracker.start();
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ⭐ RESPONSE INTERCEPTOR — hantera expired token + köhantering
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

      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        //console.warn("No refresh token — redirecting to login");
        window.location.href = "/login";
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

        // ⭐ Uppdatera båda tokens
        localStorage.setItem("accessToken", newAccessToken);
        localStorage.setItem("refreshToken", newRefreshToken);

        // Uppdatera default header
        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);

        // Kör om originalrequesten
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);

      } catch (refreshError) {
        console.error("Refresh token failed:", refreshError);

        processQueue(refreshError, null);

        // Tokens ogiltiga → logga ut
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";

        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
};

api.interceptors.response.use(
  (response) => {
    loadingTracker.done();
    return response;
  },
  // done() först när ev. refresh + omkörning är klar, så toasten inte blinkar
  (error) => handleResponseError(error).finally(() => loadingTracker.done())
);

export default api;
