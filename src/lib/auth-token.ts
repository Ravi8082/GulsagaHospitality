export type AuthRole = "admin" | "partner" | "member";

export const AUTH_EVENT = "gulsaga-auth-changed";
const storageKey = (role: AuthRole) => `gulsaga.jwt.${role}`;

// Tokens live in sessionStorage so they end with the browser tab and are never sent to other sites.
export function getToken(role: AuthRole) {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(storageKey(role)) ?? "";
}

export function setToken(role: AuthRole, token: string) {
  window.sessionStorage.setItem(storageKey(role), token);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearToken(role: AuthRole) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(storageKey(role));
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function roleForPath(path: string): AuthRole | null {
  const clean = path.replace(/^\/+/, "");
  if (clean.startsWith("admin/") || clean.startsWith("auth/admin/")) return "admin";
  if (clean.startsWith("partner/")) return "partner";
  if (clean.startsWith("community/")) return "member";
  return null;
}
