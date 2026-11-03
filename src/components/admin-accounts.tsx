import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { CredentialNotice } from "@/components/credential-notice";
import { apiRequest } from "@/lib/experience-api";

type Account = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SUPER_ADMIN";
  enabled: boolean;
  permissions: string[];
  mustChangePassword: boolean;
};

const allPermissions = [
  "projects",
  "content",
  "experiences",
  "jobs",
  "applications",
  "contacts",
  "media",
  "exports",
  "emails",
];

// Presets only fill in the checkboxes; the server enforces the final role and permission list.
const presets: Record<string, { role: Account["role"]; permissions: string[] }> = {
  "Super Admin": { role: "SUPER_ADMIN", permissions: [] },
  Admin: { role: "ADMIN", permissions: allPermissions },
  "Content Manager": { role: "ADMIN", permissions: ["content", "media", "experiences"] },
  "Support Executive": { role: "ADMIN", permissions: ["contacts", "applications"] },
};

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

export function AdminAccounts() {
  const [rows, setRows] = useState<Account[]>([]);
  const [error, setError] = useState("");
  const [preset, setPreset] = useState("Admin");
  const [form, setForm] = useState({ name: "", email: "" });
  const [permissions, setPermissions] = useState<string[]>(presets["Admin"]!.permissions);
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await apiRequest<{ rows: Account[] }>("admin/admins");
      setRows(data.rows);
      setError("");
    } catch (reason) {
      setError(message(reason));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const choosePreset = (name: string) => {
    setPreset(name);
    setPermissions(presets[name]?.permissions ?? []);
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    const chosen = presets[preset]!;
    try {
      const { data } = await apiRequest<{ temporaryPassword: string }>("admin/admins", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          role: chosen.role,
          permissions: chosen.role === "SUPER_ADMIN" ? [] : permissions,
        }),
      });
      setCredential({ email: form.email, password: data.temporaryPassword });
      setForm({ name: "", email: "" });
      await load();
    } catch (reason) {
      setError(message(reason));
    }
  };

  const update = async (account: Account, patch: Partial<Account>) => {
    try {
      await apiRequest(`admin/admins/${account.id}`, {
        method: "PUT",
        body: JSON.stringify({
          role: account.role,
          enabled: account.enabled,
          permissions: account.permissions,
          ...patch,
        }),
      });
      await load();
    } catch (reason) {
      setError(message(reason));
    }
  };

  const reset = async (account: Account) => {
    if (!window.confirm(`Generate a new temporary password for ${account.email}?`)) return;
    try {
      const { data } = await apiRequest<{ temporaryPassword: string }>(
        `admin/admins/${account.id}/reset-password`,
        { method: "POST", body: "{}" },
      );
      setCredential({ email: account.email, password: data.temporaryPassword });
      await load();
    } catch (reason) {
      setError(message(reason));
    }
  };

  const remove = async (account: Account) => {
    if (!window.confirm(`Permanently delete ${account.email}? This cannot be undone.`)) return;
    try {
      await apiRequest(`admin/admins/${account.id}`, { method: "DELETE" });
      await load();
    } catch (reason) {
      setError(message(reason));
    }
  };

  return (
    <div className="partner-card">
      <h2>Team &amp; access</h2>
      <p className="partner-note">
        Only a Super Admin can create, block, reset or delete accounts. New users sign in with the
        generated password and must replace it immediately.
      </p>
      {error ? (
        <p role="alert" className="login-error">
          {error}
        </p>
      ) : null}

      <form className="partner-form" onSubmit={create}>
        <input
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <select value={preset} onChange={(e) => choosePreset(e.target.value)} aria-label="Role">
          {Object.keys(presets).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <Button type="submit">Create &amp; generate password</Button>
        {preset !== "Super Admin" ? (
          <fieldset className="permission-grid">
            <legend>Permissions</legend>
            {allPermissions.map((permission) => (
              <label key={permission}>
                <input
                  type="checkbox"
                  checked={permissions.includes(permission)}
                  onChange={(e) =>
                    setPermissions(
                      e.target.checked
                        ? [...permissions, permission]
                        : permissions.filter((item) => item !== permission),
                    )
                  }
                />
                {permission}
              </label>
            ))}
          </fieldset>
        ) : null}
      </form>

      {credential ? (
        <CredentialNotice
          email={credential.email}
          password={credential.password}
          onClose={() => setCredential(null)}
        />
      ) : null}

      <div className="partner-table-wrap">
        <table className="partner-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((account) => (
              <tr key={account.id}>
                <td>{account.name}</td>
                <td>{account.email}</td>
                <td>{account.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}</td>
                <td>
                  {!account.enabled
                    ? "Blocked"
                    : account.mustChangePassword
                      ? "Password change pending"
                      : "Active"}
                </td>
                <td className="partner-actions">
                  <button
                    className="partner-link"
                    onClick={() => void update(account, { enabled: !account.enabled })}
                  >
                    {account.enabled ? "Block" : "Unblock"}
                  </button>
                  <button className="partner-link" onClick={() => void reset(account)}>
                    Reset password
                  </button>
                  <button className="partner-link danger" onClick={() => void remove(account)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
