import { logoutUser } from "../api/endpoints";
import { STORAGE_KEYS } from "./constants";

export const clearSession = () => {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.username);
};

export const handleLogout = async () => {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);

  try {
    // Revokes the refresh token server-side
    if (refreshToken) await logoutUser(refreshToken);
  } catch (err) {
    console.error("Logout request failed:", err);
  } finally {
    clearSession();
    window.location.href = "/login";
  }
};
