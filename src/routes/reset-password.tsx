import { useState, type FormEvent } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Lock } from "lucide-react";
import { apiRequest } from "@/lib/experience-api";

type Search = { token?: string };

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search["token"] === "string" ? { token: search["token"] } : {},
  head: () => ({
    meta: [{ title: "Reset password | Gulsaga" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPassword,
});

const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

function ResetPassword() {
  const { token = "" } = Route.useSearch();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

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
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await apiRequest("auth/admin/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password: next }),
      });
      setDone(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-shell change-shell">
      <section className="login-panel">
        <div className="login-card">
          <h1>Reset your password</h1>
          {done ? (
            <>
              <p className="login-notice">Password updated. You can now sign in.</p>
              <Link to="/login" className="login-submit">
                Go to sign in <ArrowRight size={18} />
              </Link>
            </>
          ) : (
            <form onSubmit={submit} className="login-form">
              {(
                [
                  ["New password", next, setNext],
                  ["Confirm new password", confirm, setConfirm],
                ] as const
              ).map(([label, value, setter]) => (
                <label className="login-field" key={label}>
                  <Lock size={18} aria-hidden />
                  <input
                    type="password"
                    placeholder={label}
                    aria-label={label}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>
              ))}
              {error ? (
                <p role="alert" className="login-error">
                  {error}
                </p>
              ) : null}
              <button type="submit" className="login-submit" disabled={busy || !token}>
                {busy ? "Saving…" : "Update password"} <ArrowRight size={18} />
              </button>
              {!token ? <p className="login-error">This reset link is missing its token.</p> : null}
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
