import { logoutUser } from "../api/endpoints";
import { SESSION_KEYS, clearLegacySession } from "./session";

export const clearSession = () => {
  SESSION_KEYS.forEach((k) => sessionStorage.removeItem(k));
  clearLegacySession();
};

export const handleLogout = async () => {
  const refreshToken = sessionStorage.getItem("refreshToken");

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
