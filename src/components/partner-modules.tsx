import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { apiBase, apiRequest } from "@/lib/experience-api";

type Prop = { id: number; name: string };
type Data = Partial<
  Record<
    | "price" | "discountPercent" | "validFrom" | "validTo" | "description" | "duration" | "capacity"
    | "image" | "type" | "url" | "caption" | "role" | "email" | "phone" | "rating" | "comment"
    | "periodStart" | "periodEnd" | "amount" | "method" | "reference" | "category" | "priority"
    | "message",
    string | number
  >
>;
type Item = {
  id: number;
  kind: string;
  title: string;
  status: string;
  data: Data;
  reviewNote: string | null;
  createdAt: string;
};

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";
const money = (value: number) => `₹${new Intl.NumberFormat("en-IN").format(value)}`;
const base = (property: Prop, rest: string) => `partner/properties/${property.id}/${rest}`;
export const mediaSrc = (url: string) => (url.startsWith("/api/") ? apiBase + url.slice(4) : url);
const thumb = (item: { data: Data }) => {
  const url = String(item.data.image ?? (item.data.type === "video" ? "" : (item.data.url ?? "")));
  return url && /^(https:|\/)/.test(url) ? mediaSrc(url) : "";
};
const dateOnly = (value: string) => String(value).slice(0, 10);

function Panel({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="partner-card">
      <h2>{title}</h2>
      {note ? <p className="partner-note">{note}</p> : null}
      {children}
    </section>
  );
}

function Status({ value }: { value: string }) {
  return (
    <span className="pstatus" data-s={value}>
      {value.charAt(0) + value.slice(1).toLowerCase()}
    </span>
  );
}

function useItems(property: Prop, kind: string) {
  const [rows, setRows] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    try {
      const { data } = await apiRequest<{ rows: Item[] }>(base(property, `items?kind=${kind}`));
      setRows(data.rows);
      setError("");
    } catch (reason) {
      setError(message(reason));
    }
  }, [property, kind]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { rows, error, setError, reload };
}

type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select" | "image";
  options?: string[];
  required?: boolean;
};
type ItemsConfig = {
  kind: "offer" | "experience" | "media" | "team";
  heading: string;
  note: string;
  titleLabel: string;
  fields: Field[];
  summary: (item: Item) => string;
  empty: string;
};

const initial = (fields: Field[]) =>
  Object.fromEntries(fields.map((f) => [f.key, f.type === "select" ? (f.options?.[0] ?? "") : ""]));

export function ImageField({
  property,
  label,
  value,
  required,
  onChange,
  onError,
}: {
  property: Prop;
  label: string;
  value: string;
  required?: boolean | undefined;
  onChange: (value: string) => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return onError("Please choose an image file (JPG, PNG or WebP).");
    if (file.size > 5 * 1024 * 1024) return onError("Image must be 5 MB or smaller.");
    const body = new FormData();
    body.append("image", file);
    setBusy(true);
    try {
      const { data } = await apiRequest<{ url: string }>(base(property, "upload"), { method: "POST", body });
      onChange(data.url);
      onError("");
    } catch (reason) {
      onError(message(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="pimage-field">
      {value ? <img src={mediaSrc(value)} alt="" /> : <span className="pimage-empty">No image</span>}
      <div>
        <label className="pimage-btn">
          {busy ? "Uploading…" : value ? "Change image" : `Upload ${label.toLowerCase()}`}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            disabled={busy}
            onChange={(e) => {
              void pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <input
          placeholder="or paste an https link"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          aria-label={label}
        />
      </div>
    </div>
  );
}

function ItemsView({ property, config }: { property: Prop; config: ItemsConfig }) {
  const { rows, error, setError, reload } = useItems(property, config.kind);
  const [title, setTitle] = useState("");
  const [form, setForm] = useState<Record<string, string>>(initial(config.fields));
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const data: Record<string, string | number> = {};
    for (const field of config.fields) {
      const value = (form[field.key] ?? "").trim();
      if (field.type === "number") {
        if (value !== "") data[field.key] = Number(value);
      } else if (value !== "" || field.type === "date") {
        data[field.key] = value;
      }
    }
    setBusy(true);
    try {
      await apiRequest(base(property, "items"), {
        method: "POST",
        body: JSON.stringify({ kind: config.kind, title, data }),
      });
      setTitle("");
      setForm(initial(config.fields));
      await reload();
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (item: Item) => {
    if (!window.confirm(`Remove "${item.title}"?`)) return;
    try {
      await apiRequest(base(property, `items/${item.id}`), { method: "DELETE" });
      await reload();
    } catch (reason) {
      setError(message(reason));
    }
  };

  return (
    <Panel title={config.heading} note={config.note}>
      {error ? <p role="alert">{error}</p> : null}
      <form className="partner-form pitems-form" onSubmit={submit}>
        <input
          placeholder={config.titleLabel}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={2}
          maxLength={200}
        />
        {config.fields.map((field) =>
          field.type === "textarea" ? (
            <textarea
              key={field.key}
              placeholder={field.label}
              value={form[field.key] ?? ""}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              rows={2}
            />
          ) : field.type === "image" ? (
            <ImageField
              key={field.key}
              property={property}
              label={field.label}
              value={form[field.key] ?? ""}
              required={field.required}
              onChange={(value) => setForm({ ...form, [field.key]: value })}
              onError={setError}
            />
          ) : field.type === "select" ? (
            <select
              key={field.key}
              aria-label={field.label}
              value={form[field.key] ?? ""}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
            >
              {field.options?.map((o) => <option key={o}>{o}</option>)}
            </select>
          ) : (
            <input
              key={field.key}
              type={field.type ?? "text"}
              placeholder={field.label}
              aria-label={field.label}
              title={field.label}
              value={form[field.key] ?? ""}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              required={field.required}
              min={field.type === "number" ? 0 : undefined}
            />
          ),
        )}
        <Button type="submit" disabled={busy}>
          Submit for approval
        </Button>
      </form>
      {rows.length === 0 ? (
        <p className="partner-empty">{config.empty}</p>
      ) : (
        <ul className="pitem-list">
          {rows.map((item) => (
            <li key={item.id}>
              {thumb(item) ? <img className="pitem-thumb" src={thumb(item)} alt="" loading="lazy" /> : null}
              <div>
                <strong>{item.title}</strong> <Status value={item.status} />
                <small>{config.summary(item)}</small>
                {item.reviewNote ? <small className="pitem-note">Admin: {item.reviewNote}</small> : null}
              </div>
              <button className="partner-link danger" onClick={() => void remove(item)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const inr = (v: string | number | undefined) => (v ? money(Number(v)) : "—");

export function OffersView({ property }: { property: Prop }) {
  return (
    <ItemsView
      property={property}
      config={{
        kind: "offer",
        heading: "Offers & Packages",
        note: "New offers go live only after Gulsaga approves them.",
        titleLabel: "Offer name, e.g. Monsoon 3N package",
        fields: [
          { key: "image", label: "Offer image", type: "image" },
          { key: "description", label: "Description", type: "textarea" },
          { key: "price", label: "Package price (₹)", type: "number" },
          { key: "discountPercent", label: "Discount %", type: "number" },
          { key: "validFrom", label: "Valid from", type: "date" },
          { key: "validTo", label: "Valid to", type: "date" },
        ],
        summary: (i) =>
          [
            i.data.price ? inr(i.data.price) : "",
            i.data.discountPercent ? `${i.data.discountPercent}% off` : "",
            i.data.validFrom || i.data.validTo ? `${i.data.validFrom || "…"} → ${i.data.validTo || "…"}` : "",
            i.data.description,
          ]
            .filter(Boolean)
            .join(" · "),
        empty: "No offers yet. Add your first package above.",
      }}
    />
  );
}

export function ExperiencesView({ property }: { property: Prop }) {
  return (
    <ItemsView
      property={property}
      config={{
        kind: "experience",
        heading: "Experiences",
        note: "Activities guests can add to a stay. Admin approval required.",
        titleLabel: "Experience name, e.g. Sunset cruise",
        fields: [
          { key: "image", label: "Experience image", type: "image" },
          { key: "description", label: "Description", type: "textarea" },
          { key: "price", label: "Price per person (₹)", type: "number" },
          { key: "duration", label: "Duration, e.g. 2 hours" },
          { key: "capacity", label: "Max guests", type: "number" },
        ],
        summary: (i) =>
          [i.data.price ? `${inr(i.data.price)} / person` : "", i.data.duration, i.data.description]
            .filter(Boolean)
            .join(" · "),
        empty: "No experiences yet.",
      }}
    />
  );
}

export function MediaView({ property }: { property: Prop }) {
  return (
    <ItemsView
      property={property}
      config={{
        kind: "media",
        heading: "Media & Gallery",
        note: "Upload photos (JPG, PNG or WebP, up to 5 MB) or paste a video link. Approved media can be used by Gulsaga on your listing.",
        titleLabel: "Title, e.g. Pool at sunset",
        fields: [
          { key: "url", label: "Photo", type: "image", required: true },
          { key: "type", label: "Type", type: "select", options: ["image", "video"] },
          { key: "caption", label: "Caption" },
        ],
        summary: (i) => [i.data.type, i.data.url, i.data.caption].filter(Boolean).join(" · "),
        empty: "No media submitted yet.",
      }}
    />
  );
}

export function TeamView({ property }: { property: Prop }) {
  return (
    <ItemsView
      property={property}
      config={{
        kind: "team",
        heading: "Team & Access",
        note: "Register staff who handle this property. Gulsaga verifies each member before they are listed.",
        titleLabel: "Full name",
        fields: [
          { key: "email", label: "Email", type: "text", required: true },
          { key: "phone", label: "Phone" },
          {
            key: "role",
            label: "Role",
            type: "select",
            options: ["Manager", "Reservations", "Front Desk", "Accounts"],
          },
        ],
        summary: (i) => [i.data.role, i.data.email, i.data.phone].filter(Boolean).join(" · "),
        empty: "No team members added yet.",
      }}
    />
  );
}

export function ReviewsView({ property }: { property: Prop }) {
  const { rows, error } = useItems(property, "review");
  const published = rows.filter((r) => r.status === "PUBLISHED");
  const ratings = published.map((r) => Number(r.data.rating));
  const average = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";
  return (
    <Panel title="Reviews & Ratings" note="Guest reviews are verified and published by Gulsaga.">
      {error ? <p role="alert">{error}</p> : null}
      <div className="partner-cards">
        <div className="partner-card partner-metric">
          <span>Average rating</span>
          <strong>{average === "—" ? "—" : `${average} / 5`}</strong>
        </div>
        <div className="partner-card partner-metric">
          <span>Total reviews</span>
          <strong>{published.length}</strong>
        </div>
      </div>
      {published.length === 0 ? (
        <p className="partner-empty">No reviews published yet.</p>
      ) : (
        <ul className="pitem-list">
          {published.map((r) => (
            <li key={r.id}>
              <div>
                <strong>{r.title}</strong> <span className="pstars">{"★".repeat(Number(r.data.rating))}</span>
                <small>{r.data.comment}</small>
              </div>
              <small>{dateOnly(r.createdAt)}</small>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

type Report = {
  totals: {
    bookings: number;
    cancelled: number;
    earned: number;
    paidOut: number;
    balance: number;
    averageValue: number;
    averageStay: number;
  };
  monthly: { month: string; bookings: number; revenue: number; occupancy: number | null }[];
  rooms: { room: string; bookings: number; revenue: number }[];
};

function useReport(property: Prop) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setReport(null);
    apiRequest<Report>(base(property, "reports"))
      .then((r) => setReport(r.data))
      .catch((reason) => setError(message(reason)));
  }, [property]);
  return { report, error };
}

export function ReportsView({ property }: { property: Prop }) {
  const { report, error } = useReport(property);
  if (error) return <p role="alert">{error}</p>;
  if (!report) return <p role="status">Loading report…</p>;
  const { totals, monthly, rooms } = report;
  const maxRevenue = Math.max(1, ...monthly.map((m) => m.revenue));
  const cancelRate = totals.bookings ? Math.round((totals.cancelled / totals.bookings) * 100) : 0;
  const download = () => {
    const lines = [
      "Month,Bookings,Revenue,Occupancy %",
      ...monthly.map((m) => `${m.month},${m.bookings},${m.revenue},${m.occupancy ?? ""}`),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${property.name.replace(/\W+/g, "-")}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const cards: [string, string][] = [
    ["Total earned", money(totals.earned)],
    ["Avg. booking value", money(totals.averageValue)],
    ["Avg. stay (nights)", String(totals.averageStay)],
    ["Cancellation rate", `${cancelRate}%`],
  ];
  return (
    <Panel title="Reports & Insights" note="Calculated from your confirmed and completed bookings.">
      <div className="partner-cards">
        {cards.map(([label, value]) => (
          <div key={label} className="partner-card partner-metric">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <h3 className="pgap">Last 6 months</h3>
      <div className="preport-bars">
        {monthly.map((m) => (
          <div key={m.month} title={`${m.month}: ${money(m.revenue)}`}>
            <i style={{ height: `${Math.max(4, (m.revenue / maxRevenue) * 100)}%` }} />
            <span>{m.month.slice(5)}</span>
          </div>
        ))}
      </div>
      <div className="partner-table-wrap">
        <table className="partner-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Bookings</th>
              <th>Revenue</th>
              <th>Occupancy</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((m) => (
              <tr key={m.month}>
                <td>{m.month}</td>
                <td>{m.bookings}</td>
                <td>{money(m.revenue)}</td>
                <td>{m.occupancy === null ? "—" : `${m.occupancy}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="pgap">Revenue by room</h3>
      {rooms.length === 0 ? (
        <p className="partner-empty">No earning bookings yet.</p>
      ) : (
        <div className="partner-table-wrap">
          <table className="partner-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Bookings</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.room}>
                  <td>{r.room}</td>
                  <td>{r.bookings}</td>
                  <td>{money(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Button type="button" variant="outline" onClick={download}>
        Download CSV
      </Button>
    </Panel>
  );
}

export function PayoutsView({ property }: { property: Prop }) {
  const { report } = useReport(property);
  const { rows, error } = useItems(property, "payout");
  return (
    <Panel title="Payouts & Settlements" note="Settlements are recorded by Gulsaga after each transfer.">
      {error ? <p role="alert">{error}</p> : null}
      {report ? (
        <div className="partner-cards">
          {(
            [
              ["Total earned", report.totals.earned],
              ["Paid out", report.totals.paidOut],
              ["Pending balance", report.totals.balance],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="partner-card partner-metric">
              <span>{label}</span>
              <strong>{money(value)}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {rows.length === 0 ? (
        <p className="partner-empty">No payouts recorded yet.</p>
      ) : (
        <div className="partner-table-wrap">
          <table className="partner-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.data.periodStart} → {p.data.periodEnd}
                  </td>
                  <td>{money(Number(p.data.amount))}</td>
                  <td>{p.data.method}</td>
                  <td>{p.data.reference || p.title}</td>
                  <td>
                    <Status value={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export function SupportView({ property }: { property: Prop }) {
  const { rows, error, setError, reload } = useItems(property, "ticket");
  const blank = { title: "", category: "Booking", priority: "Normal", message: "" };
  const [form, setForm] = useState(blank);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest(base(property, "items"), {
        method: "POST",
        body: JSON.stringify({
          kind: "ticket",
          title: form.title,
          data: { category: form.category, priority: form.priority, message: form.message },
        }),
      });
      setForm(blank);
      await reload();
    } catch (reason) {
      setError(message(reason));
    }
  };
  return (
    <Panel title="Support" note="Raise a request to the Gulsaga team. Replies appear below.">
      {error ? <p role="alert">{error}</p> : null}
      <form className="partner-form pitems-form" onSubmit={submit}>
        <input
          placeholder="Subject"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          minLength={2}
        />
        <select
          aria-label="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          {["Booking", "Payout", "Technical", "Property update", "Other"].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <select
          aria-label="Priority"
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
        >
          {["Low", "Normal", "High"].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <textarea
          placeholder="Describe the issue"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
          minLength={3}
          rows={3}
        />
        <Button type="submit">Send request</Button>
      </form>
      {rows.length === 0 ? (
        <p className="partner-empty">No support requests yet.</p>
      ) : (
        <ul className="pitem-list">
          {rows.map((t) => (
            <li key={t.id}>
              <div>
                <strong>{t.title}</strong> <Status value={t.status} />
                <small>
                  {t.data.category} · {t.data.priority} · {dateOnly(t.createdAt)}
                </small>
                <small>{t.data.message}</small>
                {t.reviewNote ? <small className="pitem-note">Gulsaga: {t.reviewNote}</small> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
