import { logoutUser } from "../api/endpoints";

export const clearSession = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("username");
};

export const handleLogout = async () => {
  const refreshToken = localStorage.getItem("refreshToken");

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
