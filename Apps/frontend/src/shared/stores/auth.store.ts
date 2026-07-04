import { create } from "zustand";

interface UserProfile {
  id: string;
  username: string;
  roles: string[];
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  loading: boolean;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
  initialize: () => void;
}

function parseJwt(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  loading: true,

  login: (accessToken, refreshToken) => {
    localStorage.setItem("memento_refresh", refreshToken);
    const decoded = parseJwt(accessToken);
    const userProfile = decoded
      ? { id: decoded.sub, username: decoded.username, roles: decoded.roles || [] }
      : null;

    set({ accessToken, refreshToken, user: userProfile, loading: false });
  },

  logout: () => {
    localStorage.removeItem("memento_refresh");
    set({ accessToken: null, refreshToken: null, user: null, loading: false });
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },

  setAccessToken: (accessToken) => {
    const decoded = parseJwt(accessToken);
    const userProfile = decoded
      ? { id: decoded.sub, username: decoded.username, roles: decoded.roles || [] }
      : null;
    set({ accessToken, user: userProfile });
  },

  initialize: () => {
    const refreshToken = localStorage.getItem("memento_refresh");
    if (!refreshToken) {
      set({ loading: false });
      return;
    }
    set({ refreshToken, loading: false });
  },
}));
