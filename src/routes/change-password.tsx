import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Lock } from "lucide-react";
import { apiRequest } from "@/lib/experience-api";
import { clearToken, getToken, type AuthRole } from "@/lib/auth-token";

type Search = { role?: "admin" | "partner" };

export const Route = createFileRoute("/change-password")({
  validateSearch: (search: Record<string, unknown>): Search =>
    search["role"] === "admin" || search["role"] === "partner" ? { role: search["role"] } : {},
  head: () => ({
    meta: [{ title: "Set a new password | Gulsaga" }, { name: "robots", content: "noindex" }],
  }),
  component: ChangePassword,
});

const endpoints: Record<"admin" | "partner", { path: string; home: string }> = {
  admin: { path: "auth/admin/change-password", home: "/admin" },
  partner: { path: "partner/change-password", home: "/partner" },
};

const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

function ChangePassword() {
  const { role = "admin" } = Route.useSearch();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getToken(role as AuthRole)) window.location.replace("/login");
  }, [role]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!strong.test(next)) {
      setError(
        "Use at least 12 characters with upper and lower case letters, a number and a symbol.",
      );
      return;
    }
    if (next !== confirm) {
      setError("The new passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await apiRequest(endpoints[role].path, {
        method: "POST",
        body: JSON.stringify({ currentPassword: current, password: next }),
      });
      window.location.replace(endpoints[role].home);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not change the password.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    clearToken(role as AuthRole);
    window.location.replace("/login");
  };

  return (
    <main className="login-shell change-shell">
      <section className="login-panel">
        <div className="login-card">
          <h1>Set a new password</h1>
          <p className="login-sub">
            You signed in with a temporary password. Choose your own to continue.
          </p>
          <form onSubmit={submit} className="login-form">
            {(
              [
                ["Temporary password", current, setCurrent, "current-password"],
                ["New password", next, setNext, "new-password"],
                ["Confirm new password", confirm, setConfirm, "new-password"],
              ] as const
            ).map(([label, value, setter, autocomplete]) => (
              <label className="login-field" key={label}>
                <Lock size={18} aria-hidden />
                <input
                  type="password"
                  placeholder={label}
                  aria-label={label}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  autoComplete={autocomplete}
                  required
                />
              </label>
            ))}
            {error ? (
              <p role="alert" className="login-error">
                {error}
              </p>
            ) : null}
            <button type="submit" className="login-submit" disabled={busy}>
              {busy ? "Saving…" : "Update password"} <ArrowRight size={18} />
            </button>
            <button type="button" className="login-switch" onClick={cancel}>
              Cancel and sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
