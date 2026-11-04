import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  BarChart3,
  Bed,
  Building2,
  CalendarDays,
  CircleHelp,
  CreditCard,
  Gift,
  Home,
  ImageIcon,
  LogOut,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Users,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/experience-api";
import { clearToken } from "@/lib/auth-token";
import { RoomsView } from "@/components/partner-rooms";
import { AvailabilityView } from "@/components/partner-availability";
import { BookingsView } from "@/components/partner-bookings";
import { EnquiriesView } from "@/components/partner-enquiries";
import { BrandProfileView } from "@/components/partner-profile";
import { BranchesView } from "@/components/partner-branch";
import {
  ExperiencesView,
  mediaSrc,
  MediaView,
  OffersView,
  PayoutsView,
  ReportsView,
  ReviewsView,
  SupportView,
  TeamView,
} from "@/components/partner-modules";

type Property = {
  id: number;
  name: string;
  location: string;
  imageUrl: string | null;
  category: string | null;
  description: string | null;
  website: string | null;
  logoUrl?: string | null;
  listed?: boolean | number;
};
type Overview = {
  property: {
    id: number;
    name: string;
    location: string;
    category: string | null;
    imageUrl: string | null;
  };
  totals: {
    bookings: number;
    guests: number;
    revenue: number;
    occupancy: number | null;
    averageRating: number | null;
    reviews: number;
  };
  snapshot: Record<string, number>;
  monthly: { month: string; occupancy: number | null }[];
  pendingBookings: number;
  newEnquiries: number;
  recentBookings: Booking[];
  recentEnquiries: {
    id: number;
    kind: string;
    name: string;
    message: string | null;
    status: string;
    created_at: string;
  }[];
};
type Booking = {
  id: number;
  guestName: string;
  guestContact?: string;
  roomName: string | null;
  guests?: number;
  amount: number;
  status: string;
  checkIn: string;
  checkOut: string;
  paymentStatus?: string | null;
};
// Guest contact for WhatsApp bookings is the WhatsApp number/id; show it as a readable source.
const payLabel = (status?: string | null) =>
  status === "paid" ? "Paid" : status === "created" ? "Awaiting payment" : (status ?? "—");
type Room = {
  id: number;
  name: string;
  description: string | null;
  capacity: number;
  total_units: number;
  base_rate: number;
  amenities: string[];
  active: number;
};
type ChangeRequest = {
  id: number;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  payload: Record<string, string>;
};

const modules = [
  { name: "Dashboard", icon: Home },
  { name: "Property Profile", icon: ShieldCheck },
  { name: "Rooms & Inventory", icon: Bed },
  { name: "Rates & Availability", icon: CalendarDays },
  { name: "Bookings", icon: CalendarDays },
  { name: "Enquiries & Leads", icon: MessageSquare },
  { name: "Offers & Packages", icon: Tag },
  { name: "Experiences", icon: Star },
  { name: "Media & Gallery", icon: ImageIcon },
  { name: "Reviews & Ratings", icon: Star },
  { name: "Reports & Insights", icon: BarChart3 },
  { name: "Payouts & Settlements", icon: CreditCard },
  { name: "Team & Access", icon: Users },
  { name: "Branches & Products", icon: Building2 },
  { name: "Support", icon: CircleHelp },
] as const;
type Module = (typeof modules)[number]["name"];

const money = (value: number) => `₹${new Intl.NumberFormat("en-IN").format(value)}`;
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (date: string, days: number) =>
  new Date(new Date(date).getTime() + days * 86400000).toISOString().slice(0, 10);

export function PartnerDashboard() {
  const [partner, setPartner] = useState<{ name: string; email: string } | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState<number | null>(null);
  const [module, setModule] = useState<Module>("Dashboard");
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<{ partner: { name: string; email: string }; properties: Property[] }>("partner/me")
      .then(({ data }) => {
        setPartner(data.partner);
        setProperties(data.properties);
        setPropertyId(data.properties[0]?.id ?? null);
      })
      .catch((reason) => setError(message(reason)));
  }, []);
  const setLogo = (logoUrl: string) =>
    setProperties((rows) => rows.map((row) => (row.id === propertyId ? { ...row, logoUrl: logoUrl || null } : row)));

  const signOut = () => {
    clearToken("partner");
    window.location.replace("/login");
  };
  const property = properties.find((item) => item.id === propertyId) ?? null;

  return (
    <div className="partner-shell">
      <aside className="partner-side">
        <Link to="/" className="partner-brand">
          Gulsaga <small>HOSPITALITY</small>
        </Link>
        <span className="partner-badge">Partner Portal</span>
        <nav>
          {modules.map(({ name, icon: Icon }) => (
            <button key={name} data-active={module === name} onClick={() => setModule(name)}>
              <Icon size={17} /> {name}
            </button>
          ))}
        </nav>
        <Button variant="outline" className="partner-signout" onClick={signOut}>
          <LogOut size={14} /> Sign out
        </Button>
      </aside>
      <main className="partner-main">
        <header className="partner-top">
          {property?.logoUrl ? (
            <img className="partner-logo" src={mediaSrc(property.logoUrl)} alt={` logo`} />
          ) : null}
          <div>
            <h1>{property?.name ?? "Partner Dashboard"}</h1>
            <p>
              {property
                ? `Partner Dashboard${property.location ? ` · ${property.location}` : ""}`
                : "Manage your property, bookings, rates and guest enquiries with Gulsaga."}
            </p>
          </div>
          <label className="partner-switch">
            <span className="sr-only">Property</span>
            <select
              value={propertyId ?? ""}
              onChange={(event) => setPropertyId(Number(event.target.value))}
            >
              {properties.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}, {item.location}
                </option>
              ))}
            </select>
          </label>
          <span className="partner-user">{partner?.name}</span>
        </header>
        {error ? <p role="alert">{error}</p> : null}
        {!property ? (
          <p className="partner-empty">
            {partner
              ? "No property is linked to this account yet. Contact Gulsaga support."
              : "Loading…"}
          </p>
        ) : module === "Dashboard" ? (
          <OverviewView property={property} go={setModule} />
        ) : module === "Property Profile" ? (
          <>
            <BrandProfileView property={property} onLogo={setLogo} />
            <ProfileView property={property} />
          </>
        ) : module === "Branches & Products" ? (
          <BranchesView
            properties={properties}
            currentId={property.id}
            onSelect={(id) => {
              setPropertyId(id);
              setModule("Property Profile");
            }}
            onAdded={(rows, id) => {
              setProperties(rows as Property[]);
              setPropertyId(id);
              setModule("Property Profile");
            }}
          />
        ) : module === "Rooms & Inventory" ? (
          <RoomsView property={property} />
        ) : module === "Rates & Availability" ? (
          <AvailabilityView property={property} />
        ) : module === "Bookings" ? (
          <BookingsView property={property} />
        ) : module === "Enquiries & Leads" ? (
          <EnquiriesView property={property} />
        ) : module === "Offers & Packages" ? (
          <OffersView property={property} />
        ) : module === "Experiences" ? (
          <ExperiencesView property={property} />
        ) : module === "Media & Gallery" ? (
          <MediaView property={property} />
        ) : module === "Reviews & Ratings" ? (
          <ReviewsView property={property} />
        ) : module === "Reports & Insights" ? (
          <ReportsView property={property} />
        ) : module === "Payouts & Settlements" ? (
          <PayoutsView property={property} />
        ) : module === "Team & Access" ? (
          <TeamView property={property} />
        ) : (
          <SupportView property={property} />
        )}
      </main>
    </div>
  );
}

const path = (property: Property, rest: string) => `partner/properties/${property.id}/${rest}`;

function OverviewView({ property, go }: { property: Property; go: (module: Module) => void }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setData(null);
    apiRequest<Overview>(path(property, "overview"))
      .then((response) => setData(response.data))
      .catch((reason) => setError(message(reason)));
  }, [property]);
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Loading property data…</p>;
  const { totals, snapshot } = data;
  const cards: [string, string][] = [
    ["Total Bookings", String(totals.bookings)],
    ["Total Guests", String(totals.guests)],
    ["Revenue", money(totals.revenue)],
    ["Occupancy Rate", totals.occupancy === null ? "—" : `${totals.occupancy}%`],
    ["Avg. Rating", totals.averageRating === null ? "—" : `${totals.averageRating}/5`],
    ["Total Reviews", String(totals.reviews)],
  ];
  const count = (key: string) => snapshot[key] ?? 0;
  const slices: [string, number, string][] = [
    ["Confirmed", count("CONFIRMED"), "#3aa655"],
    ["Pending", count("PENDING"), "#d9a441"],
    ["Checked-In", count("CHECKED_IN"), "#2f80ed"],
    ["Checked-Out", count("CHECKED_OUT"), "#f2994a"],
    ["Cancelled", count("CANCELLED"), "#8a5cf6"],
  ];
  const total = slices.reduce((sum, [, n]) => sum + n, 0);
  let offset = 0;
  const gradient = total
    ? slices
        .map(([, n, color]) => {
          const from = offset;
          offset += (n / total) * 100;
          return `${color} ${from}% ${offset}%`;
        })
        .join(",")
    : "#ddd 0 100%";
  const points = data.monthly.map((m, i) => `${20 + i * 56},${110 - (m.occupancy ?? 0)}`).join(" ");
  return (
    <>
      <section
        className="partner-banner"
        style={
          data.property.imageUrl
            ? {
                backgroundImage: `linear-gradient(90deg,#071a33ee,#071a3355),url(${data.property.imageUrl})`,
              }
            : undefined
        }
      >
        <h2>Welcome, {data.property.name} Team</h2>
        <p>Here’s your property performance and latest updates.</p>
        <span className="partner-status">
          Property status
          <br />
          <strong>Active Partner</strong>
        </span>
      </section>
      <div className="partner-cards">
        {cards.map(([label, value]) => (
          <div key={label} className="partner-card partner-metric">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="partner-grid">
        <section className="partner-card">
          <h3>Occupancy Overview</h3>
          <svg viewBox="0 0 320 130" role="img" aria-label="Occupancy over the last six months">
            <polyline points={points} fill="none" stroke="#d9a441" strokeWidth="3" />
            {data.monthly.map((m, i) => (
              <text key={m.month} x={20 + i * 56} y="126" fontSize="10" textAnchor="middle">
                {m.month.slice(5)}
              </text>
            ))}
          </svg>
        </section>
        <section className="partner-card">
          <h3>Booking Snapshot</h3>
          <div className="partner-donut" style={{ background: `conic-gradient(${gradient})` }}>
            <span>
              {totals.bookings}
              <small>Bookings</small>
            </span>
          </div>
          <ul className="partner-legend">
            {slices.map(([label, n, color]) => (
              <li key={label}>
                <i style={{ background: color }} />
                {label} <b>{n}</b>
              </li>
            ))}
          </ul>
        </section>
        <section className="partner-card">
          <h3>Quick Actions</h3>
          <div className="partner-actions">
            <button onClick={() => go("Rates & Availability")}>Update Availability</button>
            <button onClick={() => go("Rooms & Inventory")}>Manage Rates</button>
            <button onClick={() => go("Property Profile")}>Request Profile Change</button>
            <button onClick={() => go("Bookings")}>Add Booking</button>
          </div>
        </section>
      </div>
      <div className="partner-grid">
        <section className="partner-card partner-wide">
          <h3>
            Recent Bookings{" "}
            <button className="partner-link" onClick={() => go("Bookings")}>
              View all
            </button>
          </h3>
          <BookingTable rows={data.recentBookings} />
        </section>
        <section className="partner-card">
          <h3>
            New Enquiries &amp; Leads{" "}
            <button className="partner-link" onClick={() => go("Enquiries & Leads")}>
              View all
            </button>
          </h3>
          {data.recentEnquiries.length === 0 ? (
            <p>No enquiries yet.</p>
          ) : (
            <ul className="partner-list">
              {data.recentEnquiries.map((e) => (
                <li key={e.id}>
                  <strong>
                    {e.kind} — {e.name}
                  </strong>
                  <small>{e.status}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function BookingTable({ rows }: { rows: Booking[] }) {
  if (rows.length === 0) return <p>No bookings yet.</p>;
  return (
    <table className="partner-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Guest</th>
          <th>Room</th>
          <th>Stay</th>
          <th>Amount</th>
          <th>Payment</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((b) => (
          <tr key={b.id}>
            <td>BK-{b.id}</td>
            <td>{b.guestName}</td>
            <td>{b.roomName ?? "Not assigned"}</td>
            <td>
              {b.checkIn} → {b.checkOut}
            </td>
            <td>{b.amount ? money(b.amount) : "Quote pending"}</td>
            <td>{payLabel(b.paymentStatus)}</td>
            <td>{b.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="partner-card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function useLoad<T>(property: Property, rest: string) {
  const [rows, setRows] = useState<T[]>([]);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    try {
      const { data } = await apiRequest<{ rows: T[] }>(path(property, rest));
      setRows(data.rows);
      setError("");
    } catch (reason) {
      setError(message(reason));
    }
  }, [property, rest]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { rows, error, setError, reload };
}

function ProfileView({ property }: { property: Property }) {
  const { rows, error, setError, reload } = useLoad<ChangeRequest>(property, "change-requests");
  const [form, setForm] = useState({
    description: property.description ?? "",
    website: property.website ?? "",
    imageUrl: property.imageUrl ?? "",
    category: property.category ?? "",
  });
  const [notice, setNotice] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const body = Object.fromEntries(
      Object.entries(form).filter(
        ([key, value]) => value.trim() && value !== (property[key as keyof Property] ?? ""),
      ),
    );
    try {
      await apiRequest(path(property, "change-requests"), {
        method: "POST",
        body: JSON.stringify(body),
      });
      setNotice(
        "Sent to Gulsaga for approval. The public site does not change until it is approved.",
      );
      await reload();
    } catch (reason) {
      setError(message(reason));
    }
  };
  return (
    <Panel title="Property Profile">
      <p className="partner-note">
        Changes to public details are reviewed by Gulsaga before they go live.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}
      <form className="partner-form partner-stack" onSubmit={submit}>
        <label>
          Description
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label>
          Category
          <input
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
        </label>
        <label>
          Website (https)
          <input
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
        </label>
        <label>
          Cover image link (https)
          <input
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          />
        </label>
        <Button type="submit">Submit for approval</Button>
      </form>
      <h3>Your requests</h3>
      <table className="partner-table">
        <thead>
          <tr>
            <th>Sent</th>
            <th>Fields</th>
            <th>Status</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.createdAt).toLocaleDateString()}</td>
              <td>{Object.keys(r.payload).join(", ")}</td>
              <td>{r.status}</td>
              <td>{r.reviewNote ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

export { Gift, Sparkles };
