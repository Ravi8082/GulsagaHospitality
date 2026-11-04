import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/experience-api";

type Prop = { id: number; name: string };
type Enquiry = {
  id: number;
  kind: string;
  name: string;
  contact: string | null;
  message: string | null;
  status: string;
  created_at: string;
  followUpOn: string | null;
};

const KINDS = ["General", "Wedding", "Corporate", "Group", "Art Residency"];
const STATUSES = ["NEW", "IN_PROGRESS", "RESOLVED"];
const STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
};
const TONE: Record<string, string> = { NEW: "PENDING", IN_PROGRESS: "PENDING", RESOLVED: "APPROVED" };
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (days: number) => iso(new Date(Date.now() + days * 86400000));
const ago = (value: string) => {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
};
const digits = (contact: string) => contact.replace(/[^\d]/g, "");

function ContactLinks({ contact, name }: { contact: string; name: string }) {
  if (contact.includes("@"))
    return (
      <a className="penq-act" href={`mailto:${contact}`}>
        Email
      </a>
    );
  const number = digits(contact);
  if (number.length < 7) return null;
  const wa = number.length === 10 ? `91${number}` : number;
  return (
    <>
      <a className="penq-act" href={`tel:+${wa}`}>
        Call
      </a>
      <a
        className="penq-act"
        href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hello ${name}, thank you for your enquiry.`)}`}
        target="_blank"
        rel="noreferrer"
      >
        WhatsApp
      </a>
    </>
  );
}

export function EnquiriesView({ property }: { property: Prop }) {
  const base = `partner/properties/${property.id}/enquiries`;
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [kind, setKind] = useState("ALL");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ id: number; text: string } | null>(null);
  const [form, setForm] = useState({ kind: "General", name: "", contact: "", message: "", followUpOn: "" });
  const today = iso(new Date());

  const reload = useCallback(async () => {
    try {
      const { data } = await apiRequest<{ rows: Enquiry[] }>(base);
      setRows(data.rows);
      setError("");
    } catch (reason) {
      setError(message(reason));
    }
  }, [base]);
  useEffect(() => {
    void reload();
  }, [reload]);

  const update = async (id: number, body: object, done?: string) => {
    try {
      await apiRequest(`${base}/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      if (done) setNotice(done);
      await reload();
    } catch (reason) {
      setError(message(reason));
    }
  };

  const add = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest(base, {
        method: "POST",
        body: JSON.stringify({ ...form, followUpOn: form.followUpOn || null }),
      });
      setForm({ ...form, name: "", contact: "", message: "", followUpOn: "" });
      setNotice("Enquiry saved.");
      setFilter("ALL");
      await reload();
    } catch (reason) {
      setError(message(reason));
    }
  };

  const counts = useMemo(() => {
    const out: Record<string, number> = { ALL: rows.length };
    for (const s of STATUSES) out[s] = rows.filter((r) => r.status === s).length;
    return out;
  }, [rows]);
  const due = rows.filter((r) => r.status !== "RESOLVED" && r.followUpOn && r.followUpOn <= today);
  const visible = rows.filter((r) => {
    if (filter === "DUE") return due.includes(r);
    if (filter !== "ALL" && r.status !== filter) return false;
    if (kind !== "ALL" && r.kind !== kind) return false;
    const q = search.trim().toLowerCase();
    return !q || `${r.name} ${r.contact ?? ""} ${r.message ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <section className="partner-card">
      <h2>Enquiries &amp; Leads</h2>
      <p className="partner-note">
        Keep every lead in one place. Call or WhatsApp in one tap, set a follow-up date and move it
        from New to Resolved.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? (
        <p className="pcal-notice" role="status">
          {notice}
        </p>
      ) : null}

      {due.length ? (
        <button type="button" className="penq-due" onClick={() => setFilter("DUE")}>
          {due.length} follow-up{due.length > 1 ? "s" : ""} due today or overdue — tap to view
        </button>
      ) : null}

      <form className="prooms-form" onSubmit={add}>
        <h3>Log an enquiry</h3>
        <label>
          Type
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label>
          Name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            minLength={2}
          />
        </label>
        <label>
          Phone or email
          <input
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />
        </label>
        <label>
          Follow-up date
          <input
            type="date"
            min={today}
            value={form.followUpOn}
            onChange={(e) => setForm({ ...form, followUpOn: e.target.value })}
          />
        </label>
        <label className="penq-wide">
          Notes
          <input
            value={form.message}
            placeholder="What does the guest need?"
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </label>
        <Button type="submit">Log enquiry</Button>
      </form>

      <div className="pbk-tabs" role="tablist">
        {[["ALL", "All"], ...STATUSES.map((s) => [s, STATUS_LABEL[s] ?? s])].map(([key, text]) => (
          <button
            key={key}
            type="button"
            role="tab"
            data-on={filter === key}
            onClick={() => setFilter(key ?? "ALL")}
          >
            {text}
            <span>{counts[key ?? "ALL"] ?? 0}</span>
          </button>
        ))}
        {due.length ? (
          <button type="button" role="tab" data-on={filter === "DUE"} onClick={() => setFilter("DUE")}>
            Follow-up due<span>{due.length}</span>
          </button>
        ) : null}
      </div>

      <div className="penq-tools">
        <input
          type="search"
          placeholder="Search name, phone or notes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by type">
          <option value="ALL">All types</option>
          {KINDS.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <p className="partner-empty">No enquiries here yet.</p>
      ) : (
        <div className="pbk-list">
          {visible.map((e) => {
            const overdue = e.status !== "RESOLVED" && e.followUpOn && e.followUpOn < today;
            return (
              <article className="pbk-card" key={e.id}>
                <header>
                  <strong>{e.name}</strong>
                  <span className="pstatus" data-s={TONE[e.status] ?? "PENDING"}>
                    {STATUS_LABEL[e.status] ?? e.status}
                  </span>
                </header>
                <p className="pbk-meta">
                  <span className="penq-kind">{e.kind}</span> · {ago(e.created_at)}
                  {e.contact ? ` · ${e.contact}` : ""}
                </p>
                {editing?.id === e.id ? (
                  <div className="penq-edit">
                    <textarea
                      rows={3}
                      value={editing.text}
                      maxLength={2000}
                      onChange={(ev) => setEditing({ id: e.id, text: ev.target.value })}
                    />
                    <div className="penq-row">
                      <button
                        type="button"
                        className="pbk-btn"
                        onClick={() => {
                          void update(e.id, { message: editing.text }, "Notes saved.");
                          setEditing(null);
                        }}
                      >
                        Save
                      </button>
                      <button type="button" className="penq-act" onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="penq-note">{e.message || "No notes yet."}</p>
                )}
                <div className="penq-row">
                  {e.contact ? <ContactLinks contact={e.contact} name={e.name} /> : null}
                  {editing?.id === e.id ? null : (
                    <button
                      type="button"
                      className="penq-act"
                      onClick={() => setEditing({ id: e.id, text: e.message ?? "" })}
                    >
                      Edit notes
                    </button>
                  )}
                </div>
                <div className="penq-follow" data-late={Boolean(overdue)}>
                  <label>
                    Follow-up
                    <input
                      type="date"
                      value={e.followUpOn ?? ""}
                      onChange={(ev) => void update(e.id, { followUpOn: ev.target.value || null })}
                    />
                  </label>
                  <div className="penq-row">
                    <button type="button" className="penq-act" onClick={() => void update(e.id, { followUpOn: addDays(1) })}>
                      Tomorrow
                    </button>
                    <button type="button" className="penq-act" onClick={() => void update(e.id, { followUpOn: addDays(7) })}>
                      +1 week
                    </button>
                  </div>
                  {overdue ? <small>Follow-up overdue</small> : null}
                </div>
                <div className="penq-row">
                  {e.status === "NEW" ? (
                    <button type="button" className="pbk-btn" onClick={() => void update(e.id, { status: "IN_PROGRESS" }, `${e.name} moved to In progress.`)}>
                      Start
                    </button>
                  ) : null}
                  {e.status !== "RESOLVED" ? (
                    <button type="button" className="pbk-btn" onClick={() => void update(e.id, { status: "RESOLVED", followUpOn: null }, `${e.name} marked resolved.`)}>
                      Resolve
                    </button>
                  ) : (
                    <button type="button" className="penq-act" onClick={() => void update(e.id, { status: "NEW" }, `${e.name} reopened.`)}>
                      Reopen
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
