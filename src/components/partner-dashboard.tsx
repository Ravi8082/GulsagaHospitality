import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  BarChart3,
  Bed,
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

type Property = {
  id: number;
  name: string;
  location: string;
  imageUrl: string | null;
  category: string | null;
  description: string | null;
  website: string | null;
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
          <div>
            <h1>Partner Dashboard</h1>
            <p>Manage your property, bookings, rates and guest enquiries with Gulsaga.</p>
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
          <ProfileView property={property} />
        ) : module === "Rooms & Inventory" ? (
          <RoomsView property={property} />
        ) : module === "Rates & Availability" ? (
          <AvailabilityView property={property} />
        ) : module === "Bookings" ? (
          <BookingsView property={property} />
        ) : module === "Enquiries & Leads" ? (
          <EnquiriesView property={property} />
        ) : (
          <section className="partner-card">
            <h2>{module}</h2>
            <p>
              <Sparkles size={15} /> This module is not connected yet. No data is shown for it, and
              nothing here is saved.
            </p>
          </section>
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

function RoomsView({ property }: { property: Property }) {
  const { rows, error, setError, reload } = useLoad<Room>(property, "rooms");
  const blank = {
    name: "",
    capacity: "2",
    totalUnits: "1",
    baseRate: "0",
    amenities: "",
    description: "",
  };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<number | null>(null);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const body = {
      name: form.name,
      description: form.description,
      capacity: Number(form.capacity),
      totalUnits: Number(form.totalUnits),
      baseRate: Number(form.baseRate),
      amenities: form.amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      active: true,
    };
    try {
      await apiRequest(path(property, editing ? `rooms/${editing}` : "rooms"), {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      setForm(blank);
      setEditing(null);
      await reload();
    } catch (reason) {
      setError(message(reason));
    }
  };
  const remove = async (room: Room) => {
    if (!window.confirm(`Delete ${room.name}? Its availability data is deleted too.`)) return;
    try {
      await apiRequest(path(property, `rooms/${room.id}`), { method: "DELETE" });
      await reload();
    } catch (reason) {
      setError(message(reason));
    }
  };
  return (
    <Panel title="Rooms & Inventory">
      <p className="partner-note">
        Room details and base rates are for your own planning. Nothing here is published on the
        public site.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <form className="partner-form" onSubmit={save}>
        <input
          placeholder="Room type (e.g. Royal Suite)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          type="number"
          min={1}
          placeholder="Guests"
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
        />
        <input
          type="number"
          min={1}
          placeholder="Rooms"
          value={form.totalUnits}
          onChange={(e) => setForm({ ...form, totalUnits: e.target.value })}
        />
        <input
          type="number"
          min={0}
          placeholder="Base rate ₹"
          value={form.baseRate}
          onChange={(e) => setForm({ ...form, baseRate: e.target.value })}
        />
        <input
          placeholder="Amenities, comma separated"
          value={form.amenities}
          onChange={(e) => setForm({ ...form, amenities: e.target.value })}
        />
        <Button type="submit">{editing ? "Save room" : "Add room"}</Button>
      </form>
      <table className="partner-table">
        <thead>
          <tr>
            <th>Room</th>
            <th>Guests</th>
            <th>Units</th>
            <th>Base rate</th>
            <th>Amenities</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((room) => (
            <tr key={room.id}>
              <td>{room.name}</td>
              <td>{room.capacity}</td>
              <td>{room.total_units}</td>
              <td>{money(room.base_rate)}</td>
              <td>{room.amenities.join(", ")}</td>
              <td>
                <button
                  className="partner-link"
                  onClick={() => {
                    setEditing(room.id);
                    setForm({
                      name: room.name,
                      capacity: String(room.capacity),
                      totalUnits: String(room.total_units),
                      baseRate: String(room.base_rate),
                      amenities: room.amenities.join(", "),
                      description: room.description ?? "",
                    });
                  }}
                >
                  Edit
                </button>{" "}
                <button className="partner-link" onClick={() => void remove(room)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function AvailabilityView({ property }: { property: Property }) {
  const rooms = useLoad<Room>(property, "rooms");
  const [roomId, setRoomId] = useState<number | null>(null);
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(addDays(today(), 13));
  const [units, setUnits] = useState("1");
  const [stopSell, setStopSell] = useState(false);
  const [minStay, setMinStay] = useState("1");
  const [rows, setRows] = useState<
    { date: string; availableUnits: number; stopSell: number; minStay: number }[]
  >([]);
  const [error, setError] = useState("");
  const room = rooms.rows.find((item) => item.id === roomId) ?? rooms.rows[0];

  const load = useCallback(async () => {
    if (!room) return;
    try {
      const { data } = await apiRequest<{ rows: typeof rows }>(
        path(property, `rooms/${room.id}/inventory?from=${from}&to=${addDays(from, 29)}`),
      );
      setRows(data.rows);
    } catch (reason) {
      setError(message(reason));
    }
  }, [property, room, from]);
  useEffect(() => {
    void load();
  }, [load]);

  const dates = useMemo(() => {
    const list: string[] = [];
    for (let d = from; d <= to && list.length < 366; d = addDays(d, 1)) list.push(d);
    return list;
  }, [from, to]);
  const apply = async (event: FormEvent) => {
    event.preventDefault();
    if (!room) return;
    try {
      await apiRequest(path(property, `rooms/${room.id}/inventory`), {
        method: "PUT",
        body: JSON.stringify({
          dates,
          availableUnits: Number(units),
          stopSell,
          minStay: Number(minStay),
        }),
      });
      setError("");
      await load();
    } catch (reason) {
      setError(message(reason));
    }
  };
  if (!room)
    return (
      <Panel title="Rates & Availability">
        <p>Add a room in Rooms &amp; Inventory first.</p>
      </Panel>
    );
  return (
    <Panel title="Rates & Availability">
      {error ? <p role="alert">{error}</p> : null}
      <form className="partner-form" onSubmit={apply}>
        <select value={room.id} onChange={(e) => setRoomId(Number(e.target.value))}>
          {rooms.rows.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        <input
          type="number"
          min={0}
          max={room.total_units}
          value={units}
          onChange={(e) => setUnits(e.target.value)}
          aria-label="Available units"
        />
        <input
          type="number"
          min={1}
          max={30}
          value={minStay}
          onChange={(e) => setMinStay(e.target.value)}
          aria-label="Minimum stay"
        />
        <label>
          <input
            type="checkbox"
            checked={stopSell}
            onChange={(e) => setStopSell(e.target.checked)}
          />{" "}
          Stop sell
        </label>
        <Button type="submit">Apply to {dates.length} day(s)</Button>
      </form>
      <table className="partner-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Available</th>
            <th>Min stay</th>
            <th>Stop sell</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date}>
              <td>{r.date}</td>
              <td>
                {r.availableUnits}/{room.total_units}
              </td>
              <td>{r.minStay}</td>
              <td>{r.stopSell ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p>No saved availability in these 30 days. Dates you set appear here.</p>
      ) : null}
    </Panel>
  );
}

function BookingsView({ property }: { property: Property }) {
  const { rows, error, setError, reload } = useLoad<Booking>(property, "bookings");
  const rooms = useLoad<Room>(property, "rooms");
  const [form, setForm] = useState({
    guestName: "",
    guestContact: "",
    roomId: "",
    checkIn: today(),
    checkOut: addDays(today(), 1),
    guests: "2",
    amount: "0",
  });
  const add = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest(path(property, "bookings"), {
        method: "POST",
        body: JSON.stringify({
          guestName: form.guestName,
          guestContact: form.guestContact,
          roomId: form.roomId ? Number(form.roomId) : null,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          guests: Number(form.guests),
          amount: Number(form.amount),
          status: "CONFIRMED",
        }),
      });
      setForm({ ...form, guestName: "", guestContact: "" });
      await reload();
    } catch (reason) {
      setError(message(reason));
    }
  };
  const setStatus = async (id: number, status: string) => {
    try {
      await apiRequest(path(property, `bookings/${id}`), {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await reload();
    } catch (reason) {
      setError(message(reason));
    }
  };
  return (
    <Panel title="Bookings">
      {error ? <p role="alert">{error}</p> : null}
      <form className="partner-form" onSubmit={add}>
        <input
          placeholder="Guest name"
          value={form.guestName}
          onChange={(e) => setForm({ ...form, guestName: e.target.value })}
          required
        />
        <input
          placeholder="Phone or email"
          value={form.guestContact}
          onChange={(e) => setForm({ ...form, guestContact: e.target.value })}
        />
        <select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
          <option value="">Room (optional)</option>
          {rooms.rows.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={form.checkIn}
          onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
        />
        <input
          type="date"
          value={form.checkOut}
          min={addDays(form.checkIn, 1)}
          onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
        />
        <input
          type="number"
          min={1}
          value={form.guests}
          onChange={(e) => setForm({ ...form, guests: e.target.value })}
          aria-label="Guests"
        />
        <input
          type="number"
          min={0}
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          aria-label="Amount"
        />
        <Button type="submit">Add booking</Button>
      </form>
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
              <td>
                <select value={b.status} onChange={(e) => void setStatus(b.id, e.target.value)}>
                  {["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function EnquiriesView({ property }: { property: Property }) {
  const { rows, error, setError, reload } = useLoad<Enquiry>(property, "enquiries");
  const [form, setForm] = useState({ kind: "General", name: "", contact: "", message: "" });
  const add = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest(path(property, "enquiries"), { method: "POST", body: JSON.stringify(form) });
      setForm({ ...form, name: "", contact: "", message: "" });
      await reload();
    } catch (reason) {
      setError(message(reason));
    }
  };
  const update = async (id: number, body: object) => {
    try {
      await apiRequest(path(property, `enquiries/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await reload();
    } catch (reason) {
      setError(message(reason));
    }
  };
  return (
    <Panel title="Enquiries & Leads">
      {error ? <p role="alert">{error}</p> : null}
      <form className="partner-form" onSubmit={add}>
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
          {["General", "Wedding", "Corporate", "Group", "Art Residency"].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          placeholder="Phone or email"
          value={form.contact}
          onChange={(e) => setForm({ ...form, contact: e.target.value })}
        />
        <input
          placeholder="Notes"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
        <Button type="submit">Log enquiry</Button>
      </form>
      <table className="partner-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Name</th>
            <th>Contact</th>
            <th>Notes</th>
            <th>Follow-up</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id}>
              <td>{e.kind}</td>
              <td>{e.name}</td>
              <td>{e.contact}</td>
              <td>{e.message}</td>
              <td>
                <input
                  type="date"
                  value={e.followUpOn ?? ""}
                  onChange={(ev) => void update(e.id, { followUpOn: ev.target.value || null })}
                />
              </td>
              <td>
                <select
                  value={e.status}
                  onChange={(ev) => void update(e.id, { status: ev.target.value })}
                >
                  {["NEW", "IN_PROGRESS", "RESOLVED"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
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

export { Gift };
