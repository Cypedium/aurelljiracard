import axios from "axios";
import { API_URL, STORAGE_KEYS } from "../utils/constants";

const api = axios.create({
  baseURL: API_URL,
});

// ⭐ REQUEST INTERCEPTOR — lägg till accessToken automatiskt
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.accessToken);
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

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // AccessToken expired → 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
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
        localStorage.setItem(STORAGE_KEYS.accessToken, newAccessToken);
        localStorage.setItem(STORAGE_KEYS.refreshToken, newRefreshToken);

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
        localStorage.removeItem(STORAGE_KEYS.accessToken);
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
        window.location.href = "/login";

        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
