import { useCallback, useEffect, useState, type ReactNode } from "react";
import { apiRequest } from "@/lib/experience-api";
import { AUTH_EVENT, clearToken, getToken, type AuthRole } from "@/lib/auth-token";

const verifyPath: Record<AuthRole, string> = {
  admin: "auth/admin/me",
  partner: "partner/me",
  member: "community/experiences/auth/otp/me",
};

function toLogin(role: AuthRole) {
  const redirect = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`/login?redirect=${redirect}`);
}

// Renders nothing from the protected page until the server has accepted the signed-in token.
export function RequireAuth({ role, children }: { role: AuthRole; children: ReactNode }) {
  const [allowed, setAllowed] = useState(false);

  const verify = useCallback(async () => {
    if (!getToken(role)) return toLogin(role);
    try {
      const { data } = await apiRequest<{
        mustChangePassword?: boolean;
        partner?: { mustChangePassword?: boolean };
      }>(verifyPath[role]);
      if (data.mustChangePassword || data.partner?.mustChangePassword) {
        window.location.replace(`/change-password?role=${role}`);
        return;
      }
      setAllowed(true);
    } catch {
      clearToken(role);
      toLogin(role);
    }
  }, [role]);

  useEffect(() => {
    void verify();
    const onChange = () => {
      if (!getToken(role)) {
        setAllowed(false);
        toLogin(role);
      }
    };
    window.addEventListener(AUTH_EVENT, onChange);
    return () => window.removeEventListener(AUTH_EVENT, onChange);
  }, [role, verify]);

  if (!allowed) {
    return (
      <main className="auth-gate" role="status">
        Checking your sign-in…
      </main>
    );
  }
  return <>{children}</>;
}
