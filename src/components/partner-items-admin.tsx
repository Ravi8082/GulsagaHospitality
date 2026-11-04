import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/experience-api";

type Item = {
  id: number;
  kind: string;
  title: string;
  status: string;
  resortId: number;
  resortName: string | null;
  data: Record<string, string | number>;
  reviewNote: string | null;
};

const kinds = ["offer", "experience", "media", "team", "ticket", "payout", "review"];
const statuses: Record<string, string[]> = {
  offer: ["APPROVED", "REJECTED", "PENDING"],
  experience: ["APPROVED", "REJECTED", "PENDING"],
  media: ["APPROVED", "REJECTED", "PENDING"],
  team: ["APPROVED", "REJECTED", "PENDING"],
  ticket: ["ANSWERED", "CLOSED", "OPEN"],
  payout: ["PENDING", "PROCESSING", "PAID"],
  review: ["PUBLISHED", "HIDDEN"],
};
const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");
const detail = (i: Item) =>
  Object.entries(i.data)
    .filter(([, v]) => v !== "" && v !== 0)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");

export function PartnerItemsAdmin() {
  const [kind, setKind] = useState("offer");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<Item[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    resortId: "",
    title: "",
    amount: "",
    periodStart: "",
    periodEnd: "",
    method: "Bank transfer",
    reference: "",
    rating: "5",
    comment: "",
  });

  const load = useCallback(async () => {
    try {
      const query = `kind=${kind}${status ? `&status=${status}` : ""}`;
      const { data } = await apiRequest<{ rows: Item[] }>(`admin/partners/items?${query}`);
      setRows(data.rows);
      setError("");
    } catch (reason) {
      setError(message(reason));
    }
  }, [kind, status]);
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (run: () => Promise<unknown>) => {
    try {
      await run();
      await load();
    } catch (reason) {
      setError(message(reason));
    }
  };
  const setItem = (item: Item, next: string) =>
    act(() =>
      apiRequest(`admin/partners/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next, note: notes[item.id] ?? item.reviewNote ?? "" }),
      }),
    );
  const remove = (item: Item) =>
    window.confirm(`Delete "${item.title}"?`)
      ? act(() => apiRequest(`admin/partners/items/${item.id}`, { method: "DELETE" }))
      : undefined;

  const create = (event: FormEvent) => {
    event.preventDefault();
    const isPayout = kind === "payout";
    const data = isPayout
      ? {
          amount: Number(form.amount),
          periodStart: form.periodStart,
          periodEnd: form.periodEnd,
          method: form.method,
          reference: form.reference,
        }
      : { rating: Number(form.rating), comment: form.comment };
    void act(async () => {
      await apiRequest("admin/partners/items", {
        method: "POST",
        body: JSON.stringify({ resortId: Number(form.resortId), kind, title: form.title, data }),
      });
      setForm({ ...form, title: "", amount: "", reference: "", comment: "" });
    });
  };

  return (
    <div className="partner-card">
      <h2>Partner submissions</h2>
      <p className="partner-note">
        Approve or reject offers, experiences, media and team entries; answer support tickets; record
        payouts and guest reviews.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <div className="partner-form pitems-form">
        <select aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value)}>
          {kinds.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {statuses[kind]?.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {kind === "payout" || kind === "review" ? (
        <form className="partner-form pitems-form" onSubmit={create}>
          <input
            type="number"
            placeholder="Resort ID"
            value={form.resortId}
            onChange={(e) => setForm({ ...form, resortId: e.target.value })}
            required
          />
          <input
            placeholder={kind === "payout" ? "Title, e.g. March settlement" : "Guest name"}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            minLength={2}
          />
          {kind === "payout" ? (
            <>
              <input
                type="number"
                placeholder="Amount (₹)"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
              <input
                type="date"
                title="Period start"
                value={form.periodStart}
                onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
                required
              />
              <input
                type="date"
                title="Period end"
                value={form.periodEnd}
                onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
                required
              />
              <input
                placeholder="Method"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              />
              <input
                placeholder="Reference / UTR"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
              />
            </>
          ) : (
            <>
              <select
                aria-label="Rating"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
              <textarea
                placeholder="Review comment"
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                rows={2}
              />
            </>
          )}
          <Button type="submit">Add {kind}</Button>
        </form>
      ) : null}

      {rows.length === 0 ? (
        <p className="partner-empty">Nothing here.</p>
      ) : (
        <ul className="pitem-list">
          {rows.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.title}</strong>{" "}
                <span className="pstatus" data-s={item.status}>
                  {item.status}
                </span>
                <small>
                  {item.resortName ?? `Resort ${item.resortId}`} · {detail(item)}
                </small>
                <input
                  placeholder={kind === "ticket" ? "Reply to partner" : "Note to partner (optional)"}
                  defaultValue={item.reviewNote ?? ""}
                  onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })}
                />
              </div>
              <div className="partner-actions">
                {(statuses[kind] ?? [])
                  .filter((s) => s !== item.status)
                  .map((s) => (
                    <button key={s} className="partner-link" onClick={() => void setItem(item, s)}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                  ))}
                <button className="partner-link danger" onClick={() => void remove(item)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
