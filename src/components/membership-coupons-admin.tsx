import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/experience-api";

type Coupon = {
  id: string;
  code: string;
  percent: number;
  note: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
};

const blank = { code: "", percent: "10", note: "", expires: "", maxUses: "" };

export function MembershipCouponsAdmin() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [draft, setDraft] = useState(blank);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    apiRequest<Coupon[]>("admin/experiences/membership/coupons")
      .then(({ data }) => setRows(data))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load."));
  }, []);
  useEffect(load, [load]);

  const run = async (action: () => Promise<unknown>) => {
    setError("");
    try {
      await action();
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save.");
    }
  };

  const create = () =>
    run(async () => {
      await apiRequest("admin/experiences/membership/coupons", {
        method: "POST",
        body: JSON.stringify({
          code: draft.code,
          percent: Number(draft.percent),
          ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
          ...(draft.expires ? { expiresAt: new Date(`${draft.expires}T23:59:59`).toISOString() } : {}),
          ...(draft.maxUses ? { maxUses: Number(draft.maxUses) } : {}),
        }),
      });
      setDraft(blank);
    });

  return (
    <section className="experience-admin-hero-settings" style={{ display: "block" }}>
      <p className="eyebrow">COUPON CODES</p>
      <h2>Create discount coupons</h2>
      <p>
        Members enter the code on the join page. The discount is applied to their membership fee and
        the code's usage is counted. Share codes through the WhatsApp message or offer banner.
      </p>
      {error ? <p className="experience-alert experience-alert-error">{error}</p> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, margin: "12px 0" }}>
        <label>
          Code
          <input value={draft.code} maxLength={40} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} />
        </label>
        <label>
          Discount %
          <input inputMode="numeric" value={draft.percent} onChange={(e) => setDraft({ ...draft, percent: e.target.value })} />
        </label>
        <label>
          Expires on
          <input type="date" value={draft.expires} onChange={(e) => setDraft({ ...draft, expires: e.target.value })} />
        </label>
        <label>
          Max uses (blank = unlimited)
          <input inputMode="numeric" value={draft.maxUses} onChange={(e) => setDraft({ ...draft, maxUses: e.target.value.replace(/\D/g, "") })} />
        </label>
        <label>
          Note (shown to member)
          <input value={draft.note} maxLength={200} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        </label>
      </div>
      <button type="button" onClick={() => void create()} disabled={draft.code.trim().length < 3}>
        Add coupon
      </button>
      {rows.map((row) => (
        <div key={row.id} style={{ borderTop: "1px solid #e6d9b8", padding: "10px 0", display: "grid", gap: 6 }}>
          <strong>
            {row.code} - {row.percent}% off - {row.active ? "Active" : "Paused"}
          </strong>
          <span>
            Used {row.usedCount}
            {row.maxUses ? ` / ${row.maxUses}` : ""}
            {row.expiresAt ? ` - expires ${new Date(row.expiresAt).toLocaleDateString("en-IN")}` : ""}
            {row.note ? ` - ${row.note}` : ""}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() =>
                void run(() =>
                  apiRequest(`admin/experiences/membership/coupons/${row.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ active: !row.active }),
                  }),
                )
              }
            >
              {row.active ? "Pause" : "Activate"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete coupon ${row.code}?`)) {
                  void run(() => apiRequest(`admin/experiences/membership/coupons/${row.id}`, { method: "DELETE" }));
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
