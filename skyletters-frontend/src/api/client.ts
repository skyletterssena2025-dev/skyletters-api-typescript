// Cliente HTTP minimalista para la API Skyletters.
// Maneja el token JWT (localStorage), refresh automático en 401 y la forma { success, data }.

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3100/api/v1";

const ACCESS_KEY = "sky_access_token";
const REFRESH_KEY = "sky_refresh_token";
const USER_KEY = "sky_user";

export interface Usuario {
  id: number;
  nombreUsuario: string;
  correoUsuario: string;
  rolUsuario: string;
  tipoUsuario: string;
}

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  get user(): Usuario | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  },
  set(access: string, refresh: string, user: Usuario) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  setAccess(access: string) {
    localStorage.setItem(ACCESS_KEY, access);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string[]>;
  constructor(message: string, status: number, fields?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function parse(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function tryRefresh(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return false;
    const body = await parse(res);
    const data = body?.data ?? body;
    const newAccess = data?.tokens?.accessToken ?? data?.accessToken;
    if (!newAccess) return false;
    tokenStore.setAccess(newAccess);
    return true;
  } catch {
    return false;
  }
}

async function rawRequest(path: string, options: RequestInit, withAuth: boolean): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (withAuth && tokenStore.access) {
    headers.Authorization = `Bearer ${tokenStore.access}`;
  }
  return fetch(`${API_URL}${path}`, { ...options, headers });
}

/** Request autenticado que devuelve el payload `data` ya desempaquetado. */
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  let res = await rawRequest(path, options, true);

  if (res.status === 401 && (await tryRefresh())) {
    res = await rawRequest(path, options, true);
  }

  const body = await parse(res);

  if (!res.ok) {
    const msg = body?.message || body?.error || `Error ${res.status}`;
    if (res.status === 401) {
      tokenStore.clear();
    }
    throw new ApiError(msg, res.status, body?.errors);
  }

  // La API devuelve { success, data } en los módulos contables.
  return (body?.data ?? body) as T;
}

export async function login(correoUsuario: string, contrasenaUsuario: string): Promise<Usuario> {
  const res = await rawRequest(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ correoUsuario, contrasenaUsuario }) },
    false,
  );
  const body = await parse(res);
  if (!res.ok) {
    throw new ApiError(body?.message || "Credenciales inválidas", res.status);
  }
  const data = body?.data ?? body;
  const tokens = data?.tokens ?? {};
  const usuario: Usuario = data?.usuario;
  tokenStore.set(tokens.accessToken, tokens.refreshToken, usuario);
  return usuario;
}

export function logout() {
  tokenStore.clear();
}

export { API_URL };
