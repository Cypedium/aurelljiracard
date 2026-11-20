import { logoutUser } from "../api/endpoints";
import { logError } from "./apiError";
import { clearSession, getRefreshToken } from "./session";
import { ROUTES } from "./routes";

export const handleLogout = async () => {
  const refreshToken = getRefreshToken();

  try {
    // Revokes the refresh token server-side
    if (refreshToken) await logoutUser(refreshToken);
  } catch (err) {
    // Only the message: the axios error contains the request, with the refresh token
    logError("Logout request failed", err);
  } finally {
    clearSession();
    window.location.href = ROUTES.login;
  }
};
