import { logoutUser } from "../api/endpoints";
import { logError } from "./apiError";
import { clearSession, getRefreshToken } from "./session";

export const handleLogout = async () => {
  const refreshToken = getRefreshToken();

  try {
    // Revokes the refresh token server-side
    if (refreshToken) await logoutUser(refreshToken);
  } catch (err) {
    // Bara meddelandet: axios-felet innehåller requesten, med refresh-tokenet
    logError("Logout request failed", err);
  } finally {
    clearSession();
    window.location.href = "/login";
  }
};
