import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/experience-api";
import { CredentialNotice } from "@/components/credential-notice";

type PartnerRow = {
  id: string | number;
  name: string;
  email: string;
  enabled: number | boolean;
  resortIds: number[];
};
type Request = {
  id: number;
  resortName?: string;
  partnerName?: string;
  payload: Record<string, string>;
  status: string;
  createdAt: string;
};

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

export function PartnerAdmin() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", resortIds: "" });
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([
        apiRequest<{ rows: PartnerRow[] }>("admin/partners"),
        apiRequest<{ rows: Request[] }>("admin/partners/change-requests"),
      ]);
      setPartners(p.data.rows);
      setRequests(r.data.rows);
      setError("");
    } catch (reason) {
      setError(message(reason));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const { data } = await apiRequest<{ temporaryPassword: string }>("admin/partners", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          resortIds: form.resortIds
            .split(",")
            .map((v) => Number(v.trim()))
            .filter(Boolean),
        }),
      });
      setCredential({ email: form.email, password: data.temporaryPassword });
      setForm({ name: "", email: "", resortIds: "" });
      await load();
    } catch (reason) {
      setError(message(reason));
    }
  };
  const reset = async (partner: PartnerRow) => {
    if (!window.confirm(`Generate a new temporary password for ${partner.email}?`)) return;
    try {
      const { data } = await apiRequest<{ temporaryPassword: string }>(
        `admin/partners/${partner.id}/reset-password`,
        { method: "POST", body: "{}" },
      );
      setCredential({ email: partner.email, password: data.temporaryPassword });
    } catch (reason) {
      setError(message(reason));
    }
  };
  const remove = async (partner: PartnerRow) => {
    if (!window.confirm(`Permanently delete ${partner.email}? This cannot be undone.`)) return;
    try {
      await apiRequest(`admin/partners/${partner.id}`, { method: "DELETE" });
      await load();
    } catch (reason) {
      setError(message(reason));
    }
  };
  const decide = async (id: number, action: "approve" | "reject") => {
    const note = action === "reject" ? (window.prompt("Reason for rejecting?") ?? "") : "";
    try {
      await apiRequest(`admin/partners/change-requests/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ note }),
      });
      await load();
    } catch (reason) {
      setError(message(reason));
    }
  };
  const toggle = async (partner: PartnerRow) => {
    try {
      await apiRequest(`admin/partners/${partner.id}`, {
        method: "PUT",
        body: JSON.stringify({ enabled: !partner.enabled, resortIds: partner.resortIds }),
      });
      await load();
    } catch (reason) {
      setError(message(reason));
    }
  };

  return (
    <div className="partner-card">
      <h2>Partner accounts</h2>
      <p className="partner-note">
        Saved to the database. Partners sign in at /login and see only the properties assigned here.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <form className="partner-form" onSubmit={create}>
        <input
          placeholder="Name"
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
        <input
          placeholder="Resort IDs, e.g. 1,2"
          value={form.resortIds}
          onChange={(e) => setForm({ ...form, resortIds: e.target.value })}
          required
        />
        <Button type="submit">Create partner</Button>
      </form>
      {credential ? (
        <CredentialNotice
          email={credential.email}
          password={credential.password}
          onClose={() => setCredential(null)}
        />
      ) : null}
      <table className="partner-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Resort IDs</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {partners.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.email}</td>
              <td>{(p.resortIds ?? []).join(", ")}</td>
              <td>{p.enabled ? "Enabled" : "Disabled"}</td>
              <td className="partner-actions">
                <button className="partner-link" onClick={() => void toggle(p)}>
                  {p.enabled ? "Block" : "Unblock"}
                </button>
                <button className="partner-link" onClick={() => void reset(p)}>
                  Reset password
                </button>
                <button className="partner-link danger" onClick={() => void remove(p)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Pending property change requests</h3>
      <table className="partner-table">
        <thead>
          <tr>
            <th>Property</th>
            <th>Changes</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
              <td>{r.resortName ?? "—"}</td>
              <td>
                {Object.entries(r.payload)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" | ")}
              </td>
              <td>{r.status}</td>
              <td>
                {r.status === "PENDING" ? (
                  <>
                    <button className="partner-link" onClick={() => void decide(r.id, "approve")}>
                      Approve
                    </button>{" "}
                    <button className="partner-link" onClick={() => void decide(r.id, "reject")}>
                      Reject
                    </button>
                  </>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
