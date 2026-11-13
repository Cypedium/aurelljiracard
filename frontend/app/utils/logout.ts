import { logoutUser } from "../api/endpoints";
import { clearSession, getRefreshToken } from "./session";

export const handleLogout = async () => {
  const refreshToken = getRefreshToken();

  try {
    // Revokes the refresh token server-side
    if (refreshToken) await logoutUser(refreshToken);
  } catch (err) {
    // Bara meddelandet: axios-felet innehåller requesten, med refresh-tokenet
    console.error("Logout request failed:", (err as Error).message);
  } finally {
    clearSession();
    window.location.href = "/login";
  }
};
