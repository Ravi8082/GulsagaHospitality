import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { apiRequest } from "@/lib/experience-api";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const day = (v: string) =>
  new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const tone = (s: string) => s.toLowerCase().replace(/_/g, "-");
const label = (s: string) => s.replace(/_/g, " ");

function useLoad<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    apiRequest<T>(path)
      .then(({ data: d }) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load. Please sign in."))
      .finally(() => setLoading(false));
  }, [path]);
  useEffect(reload, [reload]);
  return { data, error, loading, reload };
}

function csv(name: string, header: string[], rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const text = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Head({
  title,
  sub,
  onExport,
}: {
  title: string;
  sub: string;
  onExport?: () => void;
}) {
  return (
    <div className="aop-head">
      <div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {onExport ? (
        <button type="button" className="aop-btn" onClick={onExport}>
          <Download size={14} /> Export CSV
        </button>
      ) : null}
    </div>
  );
}

function Filters({
  q,
  setQ,
  status,
  setStatus,
  options,
  placeholder,
}: {
  q: string;
  setQ: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="aop-filters">
      <label className="aop-search">
        <Search size={15} aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
      </label>
      <div className="aop-pills" role="tablist">
        {["", ...options].map((o) => (
          <button
            type="button"
            key={o || "all"}
            className={status === o ? "on" : ""}
            onClick={() => setStatus(o)}
          >
            {o ? label(o) : "All"}
          </button>
        ))}
      </div>
    </div>
  );
}

const useDebounced = (v: string, ms = 350) => {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
};

type Member = {
  id: string;
  email: string;
  displayName: string;
  enabled: boolean;
  createdAt: string;
  membershipApplication: {
    plan: string;
    status: string;
    memberCode: string | null;
    phone: string;
    city: string;
  } | null;
};

function BacksPanel({ id }: { id: string }) {
  type Backs = { eligible: number; benefit: number; credited: number; pending: number; rows: { id: number; kind: string; amount: number; note: string | null; at: string }[] };
  const { data, reload } = useLoad<Backs>(`admin/ops/members/${id}/backs`);
  const [kind, setKind] = useState("ELIGIBLE");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const add = async () => {
    setMsg("");
    try {
      await apiRequest(`admin/ops/members/${id}/backs`, { method: "POST", body: JSON.stringify({ kind, amount: Number(amount), note }) });
      setAmount("");
      setNote("");
      reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save.");
    }
  };
  const remove = async (entry: number) => {
    await apiRequest(`admin/ops/members/${id}/backs/${entry}`, { method: "DELETE" });
    reload();
  };
  return (
    <div className="aop-backs">
      <h3>50% Back ledger</h3>
      <p className="aop-note">
        Record figures from the signed agreement. Benefit = 50% of eligible bookings; pending = benefit − credited. The member sees this in their tracker.
      </p>
      <dl>
        {([["Eligible", data?.eligible], ["Benefit", data?.benefit], ["Credited", data?.credited], ["Pending", data?.pending]] as const).map(([l, v]) => (
          <div key={l}>
            <dt>{l}</dt>
            <dd>{inr(v ?? 0)}</dd>
          </div>
        ))}
      </dl>
      <div className="aop-backs-form">
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Entry type">
          <option value="ELIGIBLE">Eligible booking amount</option>
          <option value="CREDIT">Credited to member</option>
        </select>
        <input type="number" min="1" inputMode="decimal" placeholder="Amount ₹" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" />
        <input placeholder="Note (booking, reference)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
        <button type="button" className="aop-btn" onClick={() => void add()} disabled={!amount}>
          Add
        </button>
      </div>
      {msg ? <p className="aop-error">{msg}</p> : null}
      <ul>
        {(data?.rows ?? []).map((r) => (
          <li key={r.id}>
            {r.kind === "CREDIT" ? "Credited" : "Eligible"} {inr(r.amount)} · {day(r.at)}
            {r.note ? ` · ${r.note}` : ""}{" "}
            <button type="button" className="aop-link" onClick={() => void remove(r.id)}>
              remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MemberDetail({ id }: { id: string }) {
  const { data, loading, error } = useLoad<{
    email: string;
    createdAt: string;
    membershipApplication: Record<string, unknown> | null;
    experiences: { id: string; title: string; status: string }[];
    bookings: { id: number; resort: string | null; status: string; amount: number | string | null; checkIn: string | null; checkOut: string | null }[];
  }>(`admin/ops/members/${id}`);
  if (!data) return <p className="aop-empty">{error || (loading ? "Loading…" : "")}</p>;
  const a = data.membershipApplication;
  const pick: [string, string][] = [
    ["Plan", "plan"],
    ["Member code", "memberCode"],
    ["City", "city"],
    ["Country", "country"],
    ["Family members", "familyMembers"],
    ["Travel frequency", "travelFrequency"],
    ["Preferred destinations", "destinations"],
    ["Requirements", "requirements"],
    ["Discount %", "discountPercent"],
    ["Years", "years"],
  ];
  return (
    <div className="aop-member-detail">
      {a ? (
        <dl>
          {pick.map(([l, k]) => (
            <div key={k}>
              <dt>{l}</dt>
              <dd>{show(a[k])}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>No membership application yet.</p>
      )}
      <BacksPanel id={id} />
      <h3>Bookings through partners ({data.bookings.length})</h3>
      <ul>
        {data.bookings.map((b) => (
          <li key={b.id}>
            BK-{b.id} · {b.resort ?? "—"} · {b.checkIn} → {b.checkOut} ·{" "}
            <span className={`ado-chip ${tone(b.status)}`}>{label(b.status)}</span>
          </li>
        ))}
        {!data.bookings.length ? <li>No bookings matched this member's phone.</li> : null}
      </ul>
      <h3>Experiences shared ({data.experiences.length})</h3>
      <ul>
        {data.experiences.map((e) => (
          <li key={e.id}>
            {e.title} · {label(e.status)}
          </li>
        ))}
        {!data.experiences.length ? <li>None.</li> : null}
      </ul>
    </div>
  );
}

export function MembersAdmin() {
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const dq = useDebounced(q);
  const { data, error, loading, reload } = useLoad<{ rows: Member[] }>(
    `admin/ops/members?q=${encodeURIComponent(dq)}&status=${status}`,
  );
  const rows = data?.rows ?? [];
  const toggle = async (m: Member) => {
    await apiRequest(`admin/ops/members/${m.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !m.enabled }),
    });
    reload();
  };
  return (
    <section className="aop">
      <Head
        title="Users & Members"
        sub="Everyone who signed up, with membership status. Disabled users cannot sign in."
        onExport={() =>
          csv(
            "members",
            ["Name", "Email", "Phone", "City", "Plan", "Status", "Code", "Joined", "Enabled"],
            rows.map((m) => [
              m.displayName,
              m.email,
              m.membershipApplication?.phone ?? "",
              m.membershipApplication?.city ?? "",
              m.membershipApplication?.plan ?? "",
              m.membershipApplication?.status ?? "NONE",
              m.membershipApplication?.memberCode ?? "",
              day(m.createdAt),
              m.enabled ? "yes" : "no",
            ]),
          )
        }
      />
      <Filters
        q={q}
        setQ={setQ}
        status={status}
        setStatus={setStatus}
        options={["ACTIVE", "PENDING", "REJECTED", "NONE"]}
        placeholder="Search name, email or phone"
      />
      {error ? <p className="aop-error">{error}</p> : null}
      <div className="aop-table-wrap">
        <table className="aop-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Phone / City</th>
              <th>Joined</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <Fragment key={m.id}>
              <tr>
                <td data-l="User">
                  <button type="button" className="aop-link" onClick={() => setOpen(open === m.id ? null : m.id)}>
                    <strong>{m.displayName}</strong>
                  </button>
                  <small>{m.email}</small>
                </td>
                <td data-l="Plan">{m.membershipApplication?.plan ?? "—"}</td>
                <td data-l="Status">
                  <span className={`ado-chip ${tone(m.membershipApplication?.status ?? "none")}`}>
                    {m.membershipApplication?.status ?? "No plan"}
                  </span>
                  {m.membershipApplication?.memberCode ? (
                    <small>{m.membershipApplication.memberCode}</small>
                  ) : null}
                </td>
                <td data-l="Phone / City">
                  {m.membershipApplication
                    ? `${m.membershipApplication.phone} · ${m.membershipApplication.city}`
                    : "—"}
                </td>
                <td data-l="Joined">{day(m.createdAt)}</td>
                <td data-l="Access">
                  <button
                    type="button"
                    className={`aop-btn ${m.enabled ? "" : "danger"}`}
                    onClick={() => void toggle(m)}
                  >
                    {m.enabled ? "Enabled" : "Disabled"}
                  </button>
                </td>
              </tr>
              {open === m.id ? (
                <tr>
                  <td colSpan={6}>
                    <MemberDetail id={m.id} />
                  </td>
                </tr>
              ) : null}
              </Fragment>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="aop-empty">
                  {loading ? "Loading…" : "No users match."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type Booking = {
  id: number;
  guest: string;
  contact: string | null;
  resort: string | null;
  room: string | null;
  guests: number | null;
  amount: number | string | null;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  member?: { name: string; plan: string; code: string | null } | null;
};

export function BookingsAdmin() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const dq = useDebounced(q);
  const { data, error, loading } = useLoad<{
    rows: Booking[];
    summary: { byStatus: Record<string, number>; revenue: number };
  }>(`admin/ops/bookings?q=${encodeURIComponent(dq)}&status=${status}`);
  const rows = data?.rows ?? [];
  const by = data?.summary.byStatus ?? {};
  const total = Object.values(by).reduce((a, b) => a + b, 0);
  return (
    <section className="aop">
      <Head
        title="Bookings"
        sub="All partner bookings in one place. Partners update status from their portal."
        onExport={() =>
          csv(
            "bookings",
            ["ID", "Guest", "Contact", "Resort", "Room", "Check-in", "Check-out", "Amount", "Status"],
            rows.map((b) => [
              `BK-${b.id}`,
              b.guest,
              b.contact,
              b.resort,
              b.room,
              b.checkIn,
              b.checkOut,
              b.amount,
              b.status,
            ]),
          )
        }
      />
      <div className="aop-kpis">
        <div>
          <span>Total bookings</span>
          <b>{total}</b>
        </div>
        <div>
          <span>Confirmed + stays</span>
          <b>{(by["CONFIRMED"] ?? 0) + (by["CHECKED_IN"] ?? 0) + (by["CHECKED_OUT"] ?? 0)}</b>
        </div>
        <div>
          <span>Cancelled</span>
          <b>{by["CANCELLED"] ?? 0}</b>
        </div>
        <div>
          <span>Booked revenue</span>
          <b>{inr(data?.summary.revenue ?? 0)}</b>
        </div>
      </div>
      <Filters
        q={q}
        setQ={setQ}
        status={status}
        setStatus={setStatus}
        options={["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"]}
        placeholder="Search guest, resort or contact"
      />
      {error ? <p className="aop-error">{error}</p> : null}
      <div className="aop-table-wrap">
        <table className="aop-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Guest</th>
              <th>Resort</th>
              <th>Stay</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td data-l="ID">BK-{b.id}</td>
                <td data-l="Guest">
                  <strong>{b.guest}</strong>
                  {b.member ? (
                    <span className="ado-chip active" title={b.member.code ?? ""}>
                      Member · {b.member.plan}
                    </span>
                  ) : null}
                  <small>{b.contact ?? ""}</small>
                </td>
                <td data-l="Resort">
                  {b.resort ?? "—"}
                  <small>{b.room ?? "Room not assigned"}</small>
                </td>
                <td data-l="Stay">
                  {b.checkIn ?? "—"} → {b.checkOut ?? "—"}
                </td>
                <td data-l="Amount">{b.amount ? inr(Number(b.amount)) : "Quote pending"}</td>
                <td data-l="Status">
                  <span className={`ado-chip ${tone(b.status)}`}>{label(b.status)}</span>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="aop-empty">
                  {loading ? "Loading…" : "No bookings match."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type Contact = {
  id: string;
  reference: string;
  name: string;
  email: string;
  mobile: string;
  company: string | null;
  type: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
};
const CONTACT_STATUS = ["NEW", "IN_PROGRESS", "RESPONDED", "CLOSED"];

type PartnerEnquiry = {
  id: number;
  kind: string;
  name: string;
  contact: string | null;
  message: string | null;
  status: string;
  createdAt: string;
  resort: string | null;
  followUpOn: string | null;
};

function PartnerEnquiries() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const dq = useDebounced(q);
  const { data, error, loading } = useLoad<{ rows: PartnerEnquiry[] }>(
    `admin/ops/partner-enquiries?q=${encodeURIComponent(dq)}&status=${status}`,
  );
  const rows = data?.rows ?? [];
  const statuses = [...new Set(rows.map((r) => r.status))];
  return (
    <>
      <Filters
        q={q}
        setQ={setQ}
        status={status}
        setStatus={setStatus}
        options={status && !statuses.includes(status) ? [status, ...statuses] : statuses}
        placeholder="Search guest, contact or partner"
      />
      <p className="aop-note">
        These leads are handled by the partner in their portal. You can see them here but status is
        changed by the partner.
      </p>
      {error ? <p className="aop-error">{error}</p> : null}
      <div className="aop-cards">
        {rows.map((e) => (
          <article key={e.id} className="aop-card open">
            <div className="aop-card-top">
              <span>
                <strong>{e.name}</strong>
                <small>
                  {e.kind} · {e.resort ?? "Partner"} · {day(e.createdAt)}
                </small>
              </span>
              <span className={`ado-chip ${tone(e.status)}`}>{label(e.status)}</span>
            </div>
            {e.message ? <p className="aop-subject">{e.message}</p> : null}
            <div className="aop-contact">
              {e.contact ? <a href={`tel:${e.contact}`}>{e.contact}</a> : null}
              {e.followUpOn ? <span>Follow-up: {e.followUpOn}</span> : null}
            </div>
          </article>
        ))}
        {!rows.length ? <p className="aop-empty">{loading ? "Loading…" : "No partner enquiries yet."}</p> : null}
      </div>
    </>
  );
}

export function EnquiriesAdmin() {
  const [source, setSource] = useState<"website" | "partner">("website");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const dq = useDebounced(q);
  const { data, error, loading, reload } = useLoad<{ rows: Contact[]; total: number }>(
    `admin/contacts?search=${encodeURIComponent(dq)}&status=${status}`,
  );
  const rows = data?.rows ?? [];
  const setState = async (c: Contact, next: string) => {
    await apiRequest(`admin/contacts/${c.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
    reload();
  };
  return (
    <section className="aop">
      <Head
        title="Enquiries (CRM)"
        sub="Website contact enquiries. Move each lead through New → In progress → Responded → Closed."
        onExport={() =>
          csv(
            "enquiries",
            ["Reference", "Name", "Email", "Mobile", "Type", "Subject", "Status", "Received"],
            rows.map((c) => [
              c.reference,
              c.name,
              c.email,
              c.mobile,
              c.type,
              c.subject,
              c.status,
              day(c.createdAt),
            ]),
          )
        }
      />
      <div className="aop-pills">
        <button type="button" className={source === "website" ? "on" : ""} onClick={() => setSource("website")}>
          Website enquiries
        </button>
        <button type="button" className={source === "partner" ? "on" : ""} onClick={() => setSource("partner")}>
          Partner enquiries
        </button>
      </div>
      {source === "partner" ? (
        <PartnerEnquiries />
      ) : (
        <>
      <Filters
        q={q}
        setQ={setQ}
        status={status}
        setStatus={setStatus}
        options={CONTACT_STATUS}
        placeholder="Search name, email or reference"
      />
      {error ? <p className="aop-error">{error}</p> : null}
      <div className="aop-cards">
        {rows.map((c) => (
          <article key={c.id} className={`aop-card${open === c.id ? " open" : ""}`}>
            <button type="button" className="aop-card-top" onClick={() => setOpen(open === c.id ? null : c.id)}>
              <span>
                <strong>{c.name}</strong>
                <small>
                  {c.type} · {day(c.createdAt)} · {c.reference}
                </small>
              </span>
              <span className={`ado-chip ${tone(c.status)}`}>{label(c.status)}</span>
            </button>
            <p className="aop-subject">{c.subject}</p>
            {open === c.id ? (
              <div className="aop-detail">
                <p>{c.message}</p>
                <div className="aop-contact">
                  <a href={`mailto:${c.email}`}>{c.email}</a>
                  <a href={`tel:${c.mobile}`}>{c.mobile}</a>
                  <a
                    href={`https://wa.me/${c.mobile.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </div>
                <div className="aop-pills">
                  {CONTACT_STATUS.map((s) => (
                    <button
                      type="button"
                      key={s}
                      className={c.status === s ? "on" : ""}
                      onClick={() => void setState(c, s)}
                    >
                      {label(s)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
        ))}
        {!rows.length ? (
          <p className="aop-empty">{loading ? "Loading…" : "No enquiries yet."}</p>
        ) : null}
      </div>
        </>
      )}
    </section>
  );
}

type Activity = {
  key: string;
  type: string;
  at: string;
  resort: string;
  title: string;
  detail: string;
  status: string | null;
  itemId?: number;
  fields?: Record<string, unknown>;
  note?: string;
};
const pretty = (k: string) =>
  k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const show = (v: unknown) =>
  v === null || v === undefined || v === ""
    ? "—"
    : typeof v === "object"
      ? JSON.stringify(v)
      : String(v);

const ACT_TYPES: [string, string][] = [
  ["", "All"],
  ["offer", "Offers"],
  ["item", "New items"],
  ["enquiry", "Enquiries"],
  ["booking", "Bookings"],
  ["room", "Rooms"],
  ["profile", "Profile"],
  ["change", "Change requests"],
];

export function PartnerActivityAdmin({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [kind, setKind] = useState("");
  const [resort, setResort] = useState("");
  const { data, error, loading, reload } = useLoad<{
    rows: Activity[];
    counts: Record<string, number>;
    pendingItems: number;
  }>(`admin/ops/activity?kind=${kind}&limit=120`);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const decide = async (r: Activity, status: string) => {
    if (!r.itemId) return;
    setBusy(true);
    try {
      await apiRequest(`admin/partners/items/${r.itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, note: "" }),
      });
      reload();
    } finally {
      setBusy(false);
    }
  };
  const rows = (data?.rows ?? []).filter((r) => !resort || r.resort === resort);
  const resorts = [...new Set((data?.rows ?? []).map((r) => r.resort))].sort();
  return (
    <section className="aop">
      <Head
        title="Partner activity"
        sub="Everything partners do in their portal: new offers, items, enquiries, rooms, profile changes and bookings. Member 50% Back is separate and not shown here."
        onExport={() =>
          csv(
            "partner-activity",
            ["When", "Partner", "Type", "Activity", "Details", "Status"],
            rows.map((r) => [new Date(r.at).toLocaleString("en-IN"), r.resort, r.type, r.title, r.detail, r.status]),
          )
        }
      />
      {data?.pendingItems ? (
        <p className="aop-note">
          {data.pendingItems} partner submission(s) waiting for approval.{" "}
          <button type="button" onClick={() => onNavigate?.("Marketing & Offers")}>
            Review now
          </button>
        </p>
      ) : null}
      <div className="aop-filters">
        <div className="aop-pills">
          {ACT_TYPES.map(([k, l]) => (
            <button type="button" key={k || "all"} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>
              {l}
              {k && data?.counts[k] ? ` · ${data.counts[k]}` : ""}
            </button>
          ))}
        </div>
        <select className="aop-select" value={resort} onChange={(e) => setResort(e.target.value)}>
          <option value="">All partners</option>
          {resorts.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="aop-error">{error}</p> : null}
      <ul className="aop-feed">
        {rows.map((r) => (
          <li key={r.key} className={`t-${r.type}${open === r.key ? " open" : ""}`}>
            <span className="aop-feed-dot" aria-hidden="true" />
            <div>
              <button
                type="button"
                className="aop-feed-head"
                onClick={() => setOpen(open === r.key ? null : r.key)}
                aria-expanded={open === r.key}
              >
                <strong>{r.title}</strong>
                <small>
                  {r.resort} · {new Date(r.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </small>
              </button>
              {r.detail && open !== r.key ? <p>{r.detail}</p> : null}
              {open === r.key ? (
                <div className="aop-feed-detail">
                  {r.fields && Object.keys(r.fields).length ? (
                    <dl>
                      {Object.entries(r.fields).map(([k, v]) => (
                        <div key={k}>
                          <dt>{pretty(k)}</dt>
                          <dd>{show(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p>No extra details for this update.</p>
                  )}
                  {r.note ? <p className="aop-note">Your note: {r.note}</p> : null}
                  {r.itemId ? (
                    <div className="aop-pills">
                      {["APPROVED", "REJECTED", "PENDING"].map((s) => (
                        <button
                          type="button"
                          key={s}
                          disabled={busy || r.status === s}
                          className={r.status === s ? "on" : ""}
                          onClick={() => void decide(r, s)}
                        >
                          {s === "APPROVED" ? "Approve" : s === "REJECTED" ? "Reject" : "Mark pending"}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {r.status ? <span className={`ado-chip ${tone(r.status)}`}>{label(r.status)}</span> : null}
          </li>
        ))}
        {!rows.length ? <li className="aop-empty">{loading ? "Loading…" : "No partner activity yet."}</li> : null}
      </ul>
    </section>
  );
}

type Report = {
  kpi: {
    revenue: number;
    bookings: number;
    avgBooking: number;
    nights: number;
    cancellationRate: number;
    resorts: number;
    pendingMemberships: number;
  };
  months: { month: string; revenue: number; bookings: number; signups: number }[];
  topResorts: { resort: string; bookings: number; revenue: number }[];
  plans: { plan: string; count: number }[];
  enquiryTypes: { type: string; count: number; source: string }[];
};

function Bars({ values, labels, money }: { values: number[]; labels: string[]; money?: boolean }) {
  const max = Math.max(1, ...values);
  return (
    <div className="aop-bars">
      {values.map((v, i) => (
        <div key={labels[i]} title={`${labels[i]}: ${money ? inr(v) : v}`}>
          <i style={{ height: `${Math.max(3, (v / max) * 100)}%` }} className={v ? "on" : ""} />
          <small>{labels[i]}</small>
        </div>
      ))}
    </div>
  );
}

export function ReportsAdmin() {
  const { data, error, loading } = useLoad<Report>("admin/ops/reports");
  const monthLabels = useMemo(
    () =>
      (data?.months ?? []).map((m) =>
        new Date(`${m.month}-01`).toLocaleDateString("en-IN", { month: "short" }),
      ),
    [data],
  );
  if (!data) {
    return (
      <section className="aop">
        <Head title="Reports & Analytics" sub="Live business numbers." />
        <p className={error ? "aop-error" : "aop-empty"}>{error || (loading ? "Loading…" : "")}</p>
      </section>
    );
  }
  const k = data.kpi;
  const planMax = Math.max(1, ...data.plans.map((p) => p.count));
  const resortMax = Math.max(1, ...data.topResorts.map((r) => r.revenue));
  return (
    <section className="aop">
      <Head
        title="Reports & Analytics"
        sub="Live numbers from partner bookings, members and enquiries."
        onExport={() =>
          csv(
            "monthly-report",
            ["Month", "Revenue", "Bookings", "New users"],
            data.months.map((m) => [m.month, m.revenue, m.bookings, m.signups]),
          )
        }
      />
      <div className="aop-kpis">
        <div>
          <span>Booked revenue</span>
          <b>{inr(k.revenue)}</b>
        </div>
        <div>
          <span>Bookings</span>
          <b>{k.bookings}</b>
        </div>
        <div>
          <span>Avg. booking</span>
          <b>{inr(k.avgBooking)}</b>
        </div>
        <div>
          <span>Room nights</span>
          <b>{k.nights}</b>
        </div>
        <div>
          <span>Cancellation rate</span>
          <b>{k.cancellationRate}%</b>
        </div>
        <div>
          <span>Pending memberships</span>
          <b>{k.pendingMemberships}</b>
        </div>
      </div>
      <div className="aop-grid">
        <article className="aop-panel">
          <h2>Revenue · last 6 months</h2>
          <Bars values={data.months.map((m) => m.revenue)} labels={monthLabels} money />
        </article>
        <article className="aop-panel">
          <h2>Bookings · last 6 months</h2>
          <Bars values={data.months.map((m) => m.bookings)} labels={monthLabels} />
        </article>
        <article className="aop-panel">
          <h2>New users · last 6 months</h2>
          <Bars values={data.months.map((m) => m.signups)} labels={monthLabels} />
        </article>
        <article className="aop-panel">
          <h2>Top resorts by revenue</h2>
          <ul className="aop-rank">
            {data.topResorts.map((r) => (
              <li key={r.resort}>
                <span>
                  {r.resort}
                  <b>
                    {inr(r.revenue)} · {r.bookings}
                  </b>
                </span>
                <i style={{ width: `${(r.revenue / resortMax) * 100}%` }} />
              </li>
            ))}
            {!data.topResorts.length ? <li className="aop-empty">No confirmed bookings yet.</li> : null}
          </ul>
        </article>
        <article className="aop-panel">
          <h2>Active members by plan</h2>
          <ul className="aop-rank">
            {data.plans.map((p) => (
              <li key={p.plan}>
                <span>
                  {p.plan}
                  <b>{p.count}</b>
                </span>
                <i style={{ width: `${(p.count / planMax) * 100}%` }} />
              </li>
            ))}
            {!data.plans.length ? <li className="aop-empty">No active members yet.</li> : null}
          </ul>
        </article>
        <article className="aop-panel">
          <h2>Enquiries by type</h2>
          <ul className="aop-rank">
            {data.enquiryTypes.map((e) => (
              <li key={`${e.source}-${e.type}`}>
                <span>
                  {e.type} <small>({e.source})</small>
                  <b>{e.count}</b>
                </span>
              </li>
            ))}
            {!data.enquiryTypes.length ? <li className="aop-empty">No enquiries yet.</li> : null}
          </ul>
        </article>
      </div>
    </section>
  );
}

type ReviewRow = {
  id: string | number;
  source: "partner" | "member";
  title: string;
  resort: string | null;
  author?: string;
  rating: number;
  comment?: string;
  status: string;
  at: string;
};
type ReviewsData = {
  average: number | null;
  total: number;
  distribution: { stars: number; count: number }[];
  resorts: { name: string; average: number | null; count: number }[];
  rows: ReviewRow[];
};

const stars = (n: number) => "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));

export function ReviewsAdmin() {
  const { data, error, loading, reload } = useLoad<ReviewsData>("admin/ops/reviews");
  const [src, setSrc] = useState("");
  const rows = (data?.rows ?? []).filter((r) => !src || r.source === src);
  const maxCount = Math.max(1, ...(data?.distribution ?? []).map((d) => d.count));
  const setStatus = async (r: ReviewRow, status: string) => {
    await apiRequest(`admin/partners/items/${r.id}`, { method: "PATCH", body: JSON.stringify({ status, note: "" }) });
    reload();
  };
  return (
    <section className="aop">
      <Head
        title="Reviews & Ratings"
        sub="Partner-posted reviews and member experience ratings. Only published or approved ones count towards averages."
        onExport={() =>
          csv(
            "reviews",
            ["Source", "Title", "Resort", "Rating", "Status", "Date"],
            rows.map((r) => [r.source, r.title, r.resort, r.rating, r.status, day(r.at)]),
          )
        }
      />
      {error ? <p className="aop-error">{error}</p> : null}
      <div className="aop-kpis">
        <div>
          <span>Average rating</span>
          <strong>{data?.average ?? "—"}</strong>
        </div>
        <div>
          <span>Live reviews</span>
          <strong>{data?.total ?? 0}</strong>
        </div>
        <div>
          <span>Resorts rated</span>
          <strong>{data?.resorts.length ?? 0}</strong>
        </div>
      </div>
      <div className="aop-two">
        <article className="aop-panel">
          <h3>Rating split</h3>
          {(data?.distribution ?? []).map((d) => (
            <div key={d.stars} className="aop-bar-row">
              <span>{d.stars}★</span>
              <i style={{ width: `${(d.count / maxCount) * 100}%` }} />
              <b>{d.count}</b>
            </div>
          ))}
        </article>
        <article className="aop-panel">
          <h3>Top resorts</h3>
          <ul className="aop-list">
            {(data?.resorts ?? []).map((r) => (
              <li key={r.name}>
                <span>{r.name}</span>
                <b>
                  {r.average} ★ <small>({r.count})</small>
                </b>
              </li>
            ))}
            {!data?.resorts.length ? <li className="aop-empty">No rated resorts yet.</li> : null}
          </ul>
        </article>
      </div>
      <div className="aop-pills">
        {[["", "All"], ["partner", "Partner reviews"], ["member", "Member ratings"]].map(([v, l]) => (
          <button type="button" key={v} className={src === v ? "on" : ""} onClick={() => setSrc(v ?? "")}>
            {l}
          </button>
        ))}
      </div>
      <div className="aop-cards">
        {rows.map((r) => (
          <article key={`${r.source}-${r.id}`} className="aop-card open">
            <div className="aop-card-top">
              <span>
                <strong>{r.title}</strong>
                <small>
                  {r.source === "member" ? `Member${r.author ? ` · ${r.author}` : ""}` : "Partner"} ·{" "}
                  {r.resort ?? "General"} · {day(r.at)}
                </small>
              </span>
              <span className={`ado-chip ${tone(r.status)}`}>{label(r.status)}</span>
            </div>
            <p className="aop-subject aop-stars">{stars(r.rating)}</p>
            {r.comment ? <p className="aop-subject">{r.comment}</p> : null}
            {r.source === "partner" ? (
              <div className="aop-pills">
                {["PUBLISHED", "HIDDEN"].map((s) => (
                  <button type="button" key={s} className={r.status === s ? "on" : ""} disabled={r.status === s} onClick={() => void setStatus(r, s)}>
                    {s === "PUBLISHED" ? "Publish" : "Hide"}
                  </button>
                ))}
              </div>
            ) : (
              <p className="aop-note">Moderate member stories under Experiences.</p>
            )}
          </article>
        ))}
        {!rows.length ? <p className="aop-empty">{loading ? "Loading…" : "No reviews yet."}</p> : null}
      </div>
    </section>
  );
}

type MediaRow = {
  id: number;
  title: string;
  status: string;
  note: string | null;
  at: string;
  resort: string | null;
  url: string;
  type: string;
  caption: string;
};

export function MediaAdmin() {
  const { data, error, loading, reload } = useLoad<{
    rows: MediaRow[];
    storage: { purpose: string; files: number; bytes: number }[];
  }>("admin/ops/media");
  const [status, setStatus] = useState("");
  const rows = (data?.rows ?? []).filter((r) => !status || r.status === status);
  const act = async (id: number, next: string) => {
    await apiRequest(`admin/partners/items/${id}`, { method: "PATCH", body: JSON.stringify({ status: next, note: "" }) });
    reload();
  };
  const mb = (b: number) => `${(b / 1048576).toFixed(1)} MB`;
  return (
    <section className="aop">
      <Head title="Media Library" sub="Photos and videos uploaded by partners. Approve what should go live." />
      {error ? <p className="aop-error">{error}</p> : null}
      <div className="aop-kpis">
        {(data?.storage ?? []).map((s) => (
          <div key={s.purpose}>
            <span>{s.purpose}</span>
            <strong>{s.files}</strong>
            <small>{mb(s.bytes)}</small>
          </div>
        ))}
      </div>
      <div className="aop-pills">
        {["", "PENDING", "APPROVED", "REJECTED"].map((s) => (
          <button type="button" key={s} className={status === s ? "on" : ""} onClick={() => setStatus(s)}>
            {s ? label(s) : "All"}
          </button>
        ))}
      </div>
      <div className="aop-media">
        {rows.map((m) => (
          <article key={m.id}>
            {m.type === "video" ? <video src={m.url} controls preload="metadata" /> : <img src={m.url} alt={m.caption || m.title} loading="lazy" />}
            <div>
              <strong>{m.title}</strong>
              <small>
                {m.resort ?? "—"} · {day(m.at)}
              </small>
              <span className={`ado-chip ${tone(m.status)}`}>{label(m.status)}</span>
              <div className="aop-pills">
                <button type="button" disabled={m.status === "APPROVED"} onClick={() => void act(m.id, "APPROVED")}>
                  Approve
                </button>
                <button type="button" disabled={m.status === "REJECTED"} onClick={() => void act(m.id, "REJECTED")}>
                  Reject
                </button>
              </div>
            </div>
          </article>
        ))}
        {!rows.length ? <p className="aop-empty">{loading ? "Loading…" : "No media yet."}</p> : null}
      </div>
    </section>
  );
}

type SystemData = {
  channels: {
    email: { configured: boolean; provider: string | null; to: string | null };
    whatsapp: { configured: boolean; adminNumbers: string[] };
  };
  env: { frontendUrl: string | null; node: string };
  emails: { id: string; recipient: string; subject: string; state: string; attempts: number; lastError: string | null; createdAt: string }[];
  whatsapp: { id: number; phone: string; kind: string; body: string; status: string; at: string }[];
};

function useSystem() {
  const sys = useLoad<SystemData>("admin/ops/system");
  const [result, setResult] = useState("");
  const test = async () => {
    setResult("Sending…");
    try {
      const { data } = await apiRequest<{ email: string; whatsapp: string }>("admin/ops/system/test-alert", { method: "POST", body: "{}" });
      setResult(`Email: ${data.email} · WhatsApp: ${data.whatsapp}`);
      sys.reload();
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Test failed.");
    }
  };
  return { ...sys, result, test };
}

export function NotificationsAdmin({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { data, error, loading, result, test } = useSystem();
  const [perm, setPerm] = useState(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  return (
    <section className="aop">
      <Head title="Notifications" sub="How you are alerted when partners get bookings or send updates, and a log of what was sent." />
      {error ? <p className="aop-error">{error}</p> : null}
      <div className="aop-two">
        <article className="aop-panel">
          <h3>Alert channels</h3>
          <ul className="aop-list">
            <li>
              <span>In-app bell and toast</span>
              <b className="ado-chip approved">ON</b>
            </li>
            <li>
              <span>Browser notification</span>
              {perm === "granted" ? (
                <b className="ado-chip approved">ON</b>
              ) : perm === "unsupported" ? (
                <b className="ado-chip">N/A</b>
              ) : (
                <button type="button" className="aop-btn" onClick={() => void Notification.requestPermission().then(setPerm)}>
                  Enable
                </button>
              )}
            </li>
            <li>
              <span>Email{data?.channels.email.to ? ` · ${data.channels.email.to}` : ""}</span>
              <b className={`ado-chip ${data?.channels.email.configured ? "approved" : "rejected"}`}>
                {data?.channels.email.configured ? "ON" : "NOT SET"}
              </b>
            </li>
            <li>
              <span>WhatsApp{data?.channels.whatsapp.adminNumbers.length ? ` · ${data.channels.whatsapp.adminNumbers.join(", ")}` : ""}</span>
              <b className={`ado-chip ${data?.channels.whatsapp.configured && data.channels.whatsapp.adminNumbers.length ? "approved" : "rejected"}`}>
                {data?.channels.whatsapp.configured && data.channels.whatsapp.adminNumbers.length ? "ON" : "NOT SET"}
              </b>
            </li>
          </ul>
          <div className="aop-pills">
            <button type="button" onClick={() => void test()}>
              Send test alert
            </button>
            <button type="button" onClick={() => onNavigate?.("Partner activity")}>
              Open partner activity
            </button>
          </div>
          {result ? <p className="aop-note">{result}</p> : null}
        </article>
        <article className="aop-panel">
          <h3>Sent emails</h3>
          <ul className="aop-list">
            {(data?.emails ?? []).map((m) => (
              <li key={m.id}>
                <span>
                  {m.subject}
                  <small>
                    {m.recipient} · {day(m.createdAt)}
                  </small>
                </span>
                <b className={`ado-chip ${m.state === "SENT" ? "approved" : m.state === "FAILED" ? "rejected" : "pending"}`}>{m.state}</b>
              </li>
            ))}
            {!data?.emails.length ? <li className="aop-empty">{loading ? "Loading…" : "No emails yet."}</li> : null}
          </ul>
        </article>
      </div>
      <article className="aop-panel">
        <h3>WhatsApp alerts</h3>
        <ul className="aop-list">
          {(data?.whatsapp ?? []).map((m) => (
            <li key={m.id}>
              <span>
                {m.body.slice(0, 140)}
                <small>
                  {m.kind} · {day(m.at)}
                </small>
              </span>
              <b className={`ado-chip ${m.status === "ok" ? "approved" : "rejected"}`}>{m.status}</b>
            </li>
          ))}
          {!data?.whatsapp.length ? <li className="aop-empty">No WhatsApp alerts yet.</li> : null}
        </ul>
      </article>
    </section>
  );
}

export function SettingsAdmin({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { data, error, result, test } = useSystem();
  const rows: [string, string, boolean][] = [
    ["Email alerts to", data?.channels.email.to ?? "Not set (COMPANY_NOTIFICATION_EMAIL)", Boolean(data?.channels.email.to)],
    ["Mail provider", data?.channels.email.provider ?? "Not set (MAIL_PROVIDER)", Boolean(data?.channels.email.provider)],
    ["WhatsApp gateway", data?.channels.whatsapp.configured ? "Connected" : "Not set (OPENWA_API_KEY, OPENWA_SESSION_ID)", Boolean(data?.channels.whatsapp.configured)],
    ["WhatsApp admin numbers", data?.channels.whatsapp.adminNumbers.join(", ") || "Not set (WHATSAPP_ADMIN_NUMBERS)", Boolean(data?.channels.whatsapp.adminNumbers.length)],
    ["Website URL", data?.env.frontendUrl ?? "—", Boolean(data?.env.frontendUrl)],
    ["Server runtime", data?.env.node ?? "—", true],
  ];
  return (
    <section className="aop">
      <Head title="Settings" sub="Platform configuration status. Values are set in the backend .env file for security." />
      {error ? <p className="aop-error">{error}</p> : null}
      <article className="aop-panel">
        <h3>System checklist</h3>
        <ul className="aop-list">
          {rows.map(([k, v, ok]) => (
            <li key={k}>
              <span>
                {k}
                <small>{v}</small>
              </span>
              <b className={`ado-chip ${ok ? "approved" : "rejected"}`}>{ok ? "OK" : "MISSING"}</b>
            </li>
          ))}
        </ul>
        <div className="aop-pills">
          <button type="button" onClick={() => void test()}>
            Send test alert
          </button>
          <button type="button" onClick={() => onNavigate?.("Team & Roles")}>
            Manage admin team &amp; roles
          </button>
          <button type="button" onClick={() => onNavigate?.("Change History")}>
            View change history
          </button>
        </div>
        {result ? <p className="aop-note">{result}</p> : null}
        <p className="aop-note">To change these values edit backend .env and restart the API.</p>
      </article>
    </section>
          );
        }

type PolicyRow = { slug: string; title: string; body: string; version: number; hasPdf: boolean; pdfName: string | null; updatedAt: string };
type Acceptance = { id: number; context: string; name: string | null; email: string; phone: string | null; reference: string | null; policies: string; at: string };

function PolicyEditor({ policy, onSaved }: { policy: PolicyRow; onSaved: () => void }) {
  const [title, setTitle] = useState(policy.title);
  const [body, setBody] = useState(policy.body);
  const [msg, setMsg] = useState("");
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg("");
    try {
      await fn();
      setMsg(ok);
      onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    }
  };
  const upload = (file: File | undefined) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    void run(() => apiRequest(`admin/policies/${policy.slug}/pdf`, { method: "POST", body: fd }), "PDF uploaded");
  };
  return (
    <article className="aop-panel">
      <h3>
        {policy.title} <small>· v{policy.version}</small>
      </h3>
      <input className="aop-input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
      <textarea className="aop-input" rows={9} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the policy text here (or upload a PDF below)" />
      <div className="aop-row-actions">
        <button type="button" className="aop-btn" onClick={() => void run(() => apiRequest(`admin/policies/${policy.slug}`, { method: "PUT", body: JSON.stringify({ title, body }) }), "Saved — new version published")}>
          Save text
        </button>
        <label className="aop-btn">
          {policy.hasPdf ? "Replace PDF" : "Upload PDF"}
          <input type="file" accept="application/pdf" hidden onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        {policy.hasPdf ? (
          <button type="button" className="aop-btn" onClick={() => void run(() => apiRequest(`admin/policies/${policy.slug}/pdf`, { method: "DELETE" }), "PDF removed")}>
            Remove PDF ({policy.pdfName})
          </button>
        ) : null}
      </div>
      {msg ? <p className="aop-note">{msg}</p> : null}
    </article>
  );
}

export function PoliciesAdmin() {
  const pol = useLoad<PolicyRow[]>("admin/policies");
  const log = useLoad<Acceptance[]>("admin/policies/acceptances/log");
  const rows = log.data ?? [];
  return (
    <div className="aop">
      <Head
        title="Terms & Policies"
        sub="Write the text or upload a PDF. Visitors must accept before an enquiry or membership; every acceptance is logged and emailed."
        onExport={() => csv("policy-acceptances", ["When", "Name", "Email", "Phone", "For", "Reference", "Accepted"], rows.map((r) => [new Date(r.at).toISOString(), r.name, r.email, r.phone, r.context, r.reference, r.policies]))}
      />
      {pol.error ? <p className="aop-error">{pol.error}</p> : null}
      <div className="aop-two">
        {(pol.data ?? []).map((p) => (
          <PolicyEditor key={`${p.slug}-${p.version}`} policy={p} onSaved={() => { pol.reload(); log.reload(); }} />
        ))}
      </div>
      <h3>Who accepted ({rows.length})</h3>
      <div className="aop-table-wrap">
        <table className="aop-table">
          <thead>
            <tr><th>When</th><th>Name</th><th>Email</th><th>Phone</th><th>For</th><th>Accepted</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{day(r.at)}</td><td>{r.name}</td><td>{r.email}</td><td>{r.phone}</td><td>{r.context}</td><td>{r.policies}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={6}>No acceptances yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
