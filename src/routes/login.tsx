import { useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { apiRequest } from "@/lib/experience-api";
import { ExperienceSignIn } from "@/components/experience-platform";
import { getToken, type AuthRole } from "@/lib/auth-token";
import { useHomeContent } from "@/lib/home-content";
import { pageHead } from "@/lib/hotel-data";

type LoginSearch = { redirect?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch =>
    typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {},
  head: () => pageHead("Sign in", "Sign in to your Gulsaga account."),
  component: LoginPage,
});

const defaults: Record<AuthRole, string> = {
  admin: "/admin",
  partner: "/partner",
  member: "/experiences/dashboard",
};

const roleOfPath = (path: string): AuthRole =>
  path.startsWith("/admin") ? "admin" : path.startsWith("/partner") ? "partner" : "member";

// Only same-site paths that belong to the signed-in role are accepted, so a login link cannot send people elsewhere.
function safeRedirect(value: string | undefined, role: AuthRole) {
  return value && /^\/(?![/\\])/.test(value) && roleOfPath(value) === role ? value : defaults[role];
}

function LoginPage() {
  const search = Route.useSearch();
  const { loginPageContent: page, content } = useHomeContent();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"password" | "forgot" | "member">("password");
  const [notice, setNotice] = useState("");

  const forgot = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await apiRequest<{ message: string }>("auth/admin/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setNotice(data.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send reset instructions.");
    } finally {
      setBusy(false);
    }
  };

  const goTo = (next: "password" | "forgot" | "member") => {
    setMode(next);
    setError("");
    setNotice("");
  };
  // Someone who is already signed in goes straight to the area they were trying to open.
  useEffect(() => {
    const wanted = roleOfPath(search.redirect ?? "");
    if (search.redirect && getToken(wanted)) {
      window.location.replace(safeRedirect(search.redirect, wanted));
    }
  }, [search.redirect]);

  // One form for every account: the server decides the role from the credentials.
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const body = JSON.stringify({ email, password });
    try {
      for (const [endpoint, role] of [
        ["auth/admin/login", "admin"],
        ["partner/login", "partner"],
      ] as const) {
        try {
          await apiRequest(endpoint, { method: "POST", body });
        } catch {
          continue;
        }
        if (getToken(role)) {
          window.location.replace(safeRedirect(search.redirect, role));
          return;
        }
      }
      setError("Invalid email or password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-shell">
      <section
        className="login-visual"
        style={{ backgroundImage: `url("${page.background.src}")` }}
        aria-label="Gulsaga resort"
      >
        <div className="login-visual-shade" />
        <Link to="/" className="login-visual-brand">
          Gulsaga <small>HOSPITALITY</small>
        </Link>
        <div className="login-welcome">
          <h2>{page.headline}</h2>
          <p>{page.intro}</p>
          <ul>
            {page.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="login-panel">
        <Link to="/" className="login-logo" aria-label="Gulsaga Hospitality home">
          {content.brand.logo ? (
            <img src={content.brand.logo.src} alt="Gulsaga Hospitality" />
          ) : (
            <span>Gulsaga Hospitality</span>
          )}
        </Link>
        <div className="login-card">
          <h1>{page.formTitle}</h1>
          <p className="login-sub">{page.formSubtitle}</p>

          {mode === "password" ? (
            <form onSubmit={submit} className="login-form">
              <label className="login-field">
                <Mail size={18} aria-hidden />
                <input
                  type="email"
                  placeholder="Email Address"
                  aria-label="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </label>
              <label className="login-field">
                <Lock size={18} aria-hidden />
                <input
                  type={visible ? "text" : "password"}
                  placeholder="Password"
                  aria-label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setVisible((value) => !value)}
                  aria-label={visible ? "Hide password" : "Show password"}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </label>
              {error ? (
                <p role="alert" className="login-error">
                  {error}
                </p>
              ) : null}
              <button type="submit" className="login-submit" disabled={busy}>
                {busy ? "Signing in…" : "Login"} <ArrowRight size={18} />
              </button>
              <div className="login-links">
                <button type="button" className="login-switch" onClick={() => goTo("forgot")}>
                  Forgot your password?
                </button>
                <button type="button" className="login-switch" onClick={() => goTo("member")}>
                  Member? Get a one-time code
                </button>
              </div>
            </form>
          ) : mode === "forgot" ? (
            <form onSubmit={forgot} className="login-form">
              <label className="login-field">
                <Mail size={18} aria-hidden />
                <input
                  type="email"
                  placeholder="Email Address"
                  aria-label="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              {error ? (
                <p role="alert" className="login-error">
                  {error}
                </p>
              ) : null}
              {notice ? (
                <p role="status" className="login-notice">
                  {notice}
                </p>
              ) : null}
              <button type="submit" className="login-submit" disabled={busy}>
                {busy ? "Sending…" : "Send reset link"} <ArrowRight size={18} />
              </button>
              <p className="login-note">
                Partner or member account? Ask your Gulsaga administrator to reset your access.
              </p>
              <button type="button" className="login-switch" onClick={() => goTo("password")}>
                Back to sign in
              </button>
            </form>
          ) : (
            <div className="login-member">
              <ExperienceSignIn
                onVerified={() => window.location.replace(safeRedirect(search.redirect, "member"))}
                compact
              />
              <button type="button" className="login-switch" onClick={() => goTo("password")}>
                Back to sign in
              </button>
            </div>
          )}

          <p className="login-foot">
            New to Gulsaga? <Link to="/membership">Explore membership</Link> ·{" "}
            <Link to="/partner-registration">Partner with Gulsaga</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
