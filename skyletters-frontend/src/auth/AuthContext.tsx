import { createContext, useContext, useState, type ReactNode } from "react";
import { login as apiLogin, logout as apiLogout, tokenStore, type Usuario } from "../api/client";

interface AuthState {
  user: Usuario | null;
  login: (correo: string, contrasena: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(() => tokenStore.user);

  async function login(correo: string, contrasena: string) {
    const u = await apiLogin(correo, contrasena);
    setUser(u);
  }

  function logout() {
    apiLogout();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
