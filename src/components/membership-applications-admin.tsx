import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/experience-api";
import { formatInr } from "@/lib/membership-data";

type Status = "PENDING" | "APPROVED" | "ACTIVE" | "REJECTED";

type Application = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  country: string | null;
  familyMembers: number | null;
  destinations: string | null;
  travelFrequency: string | null;
  requirements: string | null;
  plan: string;
  status: Status;
  memberCode: string | null;
  paymentLink: string | null;
  adminNote: string | null;
  listAmount: number | null;
  discountPercent: number;
  discountNote: string | null;
  finalAmount: number | null;
  years: number;
  createdAt: string;
};

type Draft = { list: string; percent: string; note: string; link: string };

const draftOf = (row: Application): Draft => ({
  list: row.listAmount == null ? "" : String(row.listAmount),
  percent: String(row.discountPercent),
  note: row.discountNote ?? "",
  link: row.paymentLink ?? "",
});

export function MembershipApplicationsAdmin() {
  const [rows, setRows] = useState<Application[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [error, setError] = useState("");

  const load = useCallback(() => {
    apiRequest<Application[]>("admin/experiences/membership/applications")
      .then(({ data }) => {
        setRows(data);
        setDrafts(Object.fromEntries(data.map((row) => [row.id, draftOf(row)])));
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load."));
  }, []);
  useEffect(load, [load]);

  const patch = async (row: Application, status?: Status) => {
    setError("");
    const draft = drafts[row.id] ?? draftOf(row);
    const list = Number(draft.list.replace(/\D/g, ""));
    const percent = Math.min(100, Math.max(0, Number(draft.percent) || 0));
    try {
      await apiRequest(`admin/experiences/membership/applications/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...(status ? { status } : {}),
          ...(draft.list.trim() && list > 0 ? { listAmount: list } : {}),
          discountPercent: percent,
          discountNote: draft.note.trim(),
          ...(draft.link.trim() ? { paymentLink: draft.link.trim() } : {}),
        }),
      });
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update.");
    }
  };

  const remove = async (row: Application) => {
    if (!window.confirm(`Delete the request from ${row.fullName}?`)) return;
    try {
      await apiRequest(`admin/experiences/membership/applications/${row.id}`, { method: "DELETE" });
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete.");
    }
  };

  return (
    <section className="experience-admin-hero-settings" style={{ display: "block" }}>
      <p className="eyebrow">MEMBERSHIP REQUESTS</p>
      <h2>Approve members and set discounts</h2>
      <p>
        Review each request, edit the price or give this member a special discount, then approve
        with a payment link or UPI details. Mark Active once payment is received to issue the
        member ID and card.
      </p>
      {error ? <p className="experience-alert experience-alert-error">{error}</p> : null}
      {rows.length === 0 ? <p>No membership requests yet.</p> : null}
      {rows.map((row) => {
        const draft = drafts[row.id] ?? draftOf(row);
        const set = (next: Partial<Draft>) =>
          setDrafts({ ...drafts, [row.id]: { ...draft, ...next } });
        const list = Number(draft.list.replace(/\D/g, "")) || 0;
        const percent = Math.min(100, Math.max(0, Number(draft.percent) || 0));
        const final = Math.round((list * (100 - percent)) / 100);
        return (
          <div key={row.id} style={{ borderTop: "1px solid #e6d9b8", padding: "14px 0", display: "grid", gap: 8 }}>
            <strong>
              {row.fullName} - {row.plan} - {row.status}
              {row.memberCode ? ` - ${row.memberCode}` : ""}
            </strong>
            <span>
              {row.email} - {row.phone} - {row.city}
              {row.country ? `, ${row.country}` : ""}
            </span>
            <span>
              Family: {row.familyMembers ?? "-"} - Travel: {row.travelFrequency || "-"} - Destinations:{" "}
              {row.destinations || "-"}
            </span>
            {row.requirements ? <span>Requirements: {row.requirements}</span> : null}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
              <label>
                List price (₹)
                <input inputMode="numeric" value={draft.list} onChange={(e) => set({ list: e.target.value })} />
              </label>
              <label>
                Special discount %
                <input inputMode="numeric" value={draft.percent} onChange={(e) => set({ percent: e.target.value })} />
              </label>
              <label>
                Discount reason (shown to member)
                <input value={draft.note} maxLength={200} onChange={(e) => set({ note: e.target.value })} />
              </label>
            </div>
            <strong>
              Final amount: {list ? formatInr(final) : "-"}
              {percent ? ` (${percent}% off)` : ""}
            </strong>
            <input
              placeholder="Payment link or UPI details"
              value={draft.link}
              onChange={(e) => set({ link: e.target.value })}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => void patch(row)}>
                Save price & discount
              </button>
              {row.status === "PENDING" ? (
                <button type="button" onClick={() => void patch(row, "APPROVED")}>
                  Approve
                </button>
              ) : null}
              {row.status !== "ACTIVE" ? (
                <button type="button" onClick={() => void patch(row, "ACTIVE")}>
                  Mark paid / Activate
                </button>
              ) : null}
              {row.status !== "REJECTED" ? (
                <button type="button" onClick={() => void patch(row, "REJECTED")}>
                  Reject
                </button>
              ) : null}
              <button type="button" onClick={() => void remove(row)}>
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
