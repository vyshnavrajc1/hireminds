/**
 * auth.ts — Centralised auth helpers for HireMinds frontend.
 * All token read/write and header generation goes through here.
 */

const TOKEN_KEY = "hireminds_token";
const USER_ID_KEY = "hireminds_user_id";
const USER_ROLE_KEY = "hireminds_user_role";

/** Save all auth data returned from POST /api/auth/login */
export function saveSession(token: string, userId: number, role: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_ID_KEY, userId.toString());
  localStorage.setItem(USER_ROLE_KEY, role);
  // Also persist as cookies so Next.js middleware can read them server-side
  const expires = new Date(Date.now() + 30 * 60 * 1000).toUTCString(); // 30 min
  document.cookie = `hireminds_token=${token}; path=/; expires=${expires}; SameSite=Strict`;
  document.cookie = `hireminds_user_role=${role}; path=/; expires=${expires}; SameSite=Strict`;
}

/** Remove all stored auth data (logout) */
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
  // Expire the cookies immediately
  document.cookie = "hireminds_token=; path=/; max-age=0";
  document.cookie = "hireminds_user_role=; path=/; max-age=0";
}

/** Returns the stored JWT or null */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Returns the stored user ID as a number, or null */
export function getUserId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_ID_KEY);
  return raw ? parseInt(raw) : null;
}

/** Returns the stored role string or null */
export function getUserRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_ROLE_KEY);
}

/** Returns true if the user has a valid token present */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * Returns standard JSON headers including the Bearer token.
 * Use this for every authenticated fetch call.
 */
export function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Returns auth headers WITHOUT Content-Type — use for multipart/form-data
 * (fetch sets it automatically with boundaries for FormData).
 */
export function getAuthHeadersMultipart(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
