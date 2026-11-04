import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/experience-api";
import { ImageField, mediaSrc } from "@/components/partner-modules";

type Prop = { id: number; name: string };
type Room = {
  id: number;
  name: string;
  description: string | null;
  capacity: number;
  total_units: number;
  base_rate: number;
  amenities: string[];
  active: number;
  image_url: string | null;
  occupiedTonight: number;
  upcomingBookings: number;
};

const money = (value: number) => `₹${new Intl.NumberFormat("en-IN").format(value)}`;
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";
const suggested = [
  "Wi-Fi",
  "AC",
  "Breakfast",
  "Pool view",
  "Balcony",
  "Bathtub",
  "TV",
  "Mini bar",
  "Parking",
  "Room service",
];
const blank = {
  name: "",
  capacity: "2",
  totalUnits: "1",
  baseRate: "",
  amenities: [] as string[],
  description: "",
  imageUrl: "",
};

export function RoomsView({ property }: { property: Prop }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState(blank);
  const [custom, setCustom] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const base = `partner/properties/${property.id}/rooms`;

  const reload = useCallback(async () => {
    try {
      const { data } = await apiRequest<{ rows: Room[] }>(base);
      setRooms(data.rows);
      setError("");
    } catch (reason) {
      setError(message(reason));
    }
  }, [base]);
  useEffect(() => {
    void reload();
  }, [reload]);

  const stats = useMemo(() => {
    const active = rooms.filter((r) => r.active);
    const units = active.reduce((s, r) => s + r.total_units, 0);
    const occupied = active.reduce((s, r) => s + r.occupiedTonight, 0);
    const avg = active.length
      ? Math.round(active.reduce((s, r) => s + r.base_rate, 0) / active.length)
      : 0;
    return { types: active.length, units, occupied, avg, free: Math.max(0, units - occupied) };
  }, [rooms]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      await reload();
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy(false);
    }
  };
  const body = (room?: Room, active = true) => ({
    name: room ? room.name : form.name,
    description: room ? (room.description ?? "") : form.description,
    capacity: room ? room.capacity : Number(form.capacity),
    totalUnits: room ? room.total_units : Number(form.totalUnits),
    baseRate: room ? room.base_rate : Number(form.baseRate || 0),
    amenities: room ? room.amenities : form.amenities,
    imageUrl: room ? (room.image_url ?? "") : form.imageUrl,
    active,
  });
  const save = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await apiRequest(editing ? `${base}/${editing}` : base, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(
          body(undefined, editing ? Boolean(rooms.find((r) => r.id === editing)?.active) : true),
        ),
      });
      setForm(blank);
      setEditing(null);
    });
  };
  const toggle = (room: Room) =>
    run(() =>
      apiRequest(`${base}/${room.id}`, {
        method: "PUT",
        body: JSON.stringify(body(room, !room.active)),
      }),
    );
  const duplicate = (room: Room) =>
    run(() =>
      apiRequest(base, {
        method: "POST",
        body: JSON.stringify({ ...body(room), name: `${room.name} (copy)` }),
      }),
    );
  const remove = (room: Room) =>
    window.confirm(`Delete ${room.name}? Its availability data is deleted too.`)
      ? run(() => apiRequest(`${base}/${room.id}`, { method: "DELETE" }))
      : undefined;
  const adjust = (room: Room, percent: number) =>
    run(() =>
      apiRequest(`${base}/${room.id}/rate`, { method: "PATCH", body: JSON.stringify({ percent }) }),
    );
  const edit = (room: Room) => {
    setEditing(room.id);
    setForm({
      name: room.name,
      capacity: String(room.capacity),
      totalUnits: String(room.total_units),
      baseRate: String(room.base_rate),
      amenities: room.amenities,
      description: room.description ?? "",
      imageUrl: room.image_url ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const toggleAmenity = (name: string) =>
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(name)
        ? f.amenities.filter((a) => a !== name)
        : [...f.amenities, name],
    }));
  const addCustom = () => {
    const value = custom.trim();
    if (value && !form.amenities.includes(value)) {
      setForm({ ...form, amenities: [...form.amenities, value] });
    }
    setCustom("");
  };
  const chips = [...suggested, ...form.amenities.filter((a) => !suggested.includes(a))];

  return (
    <section className="partner-card">
      <h2>Rooms & Inventory</h2>
      <p className="partner-note">
        Your room types, rates and live occupancy. Rooms are private to this portal and are not
        published on the public site.
      </p>
      {error ? <p role="alert">{error}</p> : null}

      <div className="partner-cards prooms-stats">
        <div className="partner-card partner-metric">
          <span>Room types</span>
          <strong>{stats.types}</strong>
        </div>
        <div className="partner-card partner-metric">
          <span>Total rooms</span>
          <strong>{stats.units}</strong>
        </div>
        <div className="partner-card partner-metric">
          <span>Occupied tonight</span>
          <strong>
            {stats.occupied} / {stats.units}
          </strong>
        </div>
        <div className="partner-card partner-metric">
          <span>Average rate</span>
          <strong>{money(stats.avg)}</strong>
        </div>
      </div>

      <form className="prooms-form" onSubmit={save}>
        <h3>{editing ? "Edit room" : "Add a room type"}</h3>
        <label className="prooms-wide">
          Room type
          <input
            placeholder="e.g. Royal Suite"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            minLength={2}
          />
        </label>
        <label>
          Max guests
          <input
            type="number"
            min={1}
            max={50}
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            required
          />
        </label>
        <label>
          Number of rooms
          <input
            type="number"
            min={1}
            max={500}
            value={form.totalUnits}
            onChange={(e) => setForm({ ...form, totalUnits: e.target.value })}
            required
          />
        </label>
        <label>
          Base rate per night (₹)
          <input
            type="number"
            min={0}
            placeholder="e.g. 6500"
            value={form.baseRate}
            onChange={(e) => setForm({ ...form, baseRate: e.target.value })}
            required
          />
        </label>
        <div className="prooms-wide">
          <span className="prooms-label">Photo</span>
          <ImageField
            property={property}
            label="Room photo"
            value={form.imageUrl}
            onChange={(imageUrl) => setForm({ ...form, imageUrl })}
            onError={setError}
          />
        </div>
        <div className="prooms-wide">
          <span className="prooms-label">Amenities</span>
          <div className="prooms-chips">
            {chips.map((name) => (
              <button
                type="button"
                key={name}
                data-on={form.amenities.includes(name)}
                onClick={() => toggleAmenity(name)}
              >
                {name}
              </button>
            ))}
            <input
              placeholder="+ Add other"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              onBlur={addCustom}
            />
          </div>
        </div>
        <label className="prooms-wide">
          Description
          <textarea
            rows={2}
            placeholder="Short note about the room (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <div className="prooms-actions prooms-wide">
          <Button type="submit" disabled={busy}>
            {editing ? "Save changes" : "Add room"}
          </Button>
          {editing ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(null);
                setForm(blank);
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </form>

      {rooms.length === 0 ? (
        <p className="partner-empty">No rooms yet. Add your first room type above.</p>
      ) : (
        <div className="prooms-grid">
          {rooms.map((room) => (
            <article key={room.id} className="prooms-card" data-off={!room.active}>
              {room.image_url ? (
                <img src={mediaSrc(room.image_url)} alt={room.name} loading="lazy" />
              ) : (
                <div className="prooms-noimg">No photo</div>
              )}
              <div className="prooms-body">
                <header>
                  <h4>{room.name}</h4>
                  <span className="pstatus" data-s={room.active ? "APPROVED" : "REJECTED"}>
                    {room.active ? "Active" : "Paused"}
                  </span>
                </header>
                <p className="prooms-rate">
                  {money(room.base_rate)} <small>/ night</small>
                </p>
                <p className="prooms-meta">
                  Up to {room.capacity} guests · {room.total_units} room
                  {room.total_units > 1 ? "s" : ""}
                </p>
                <div className="prooms-occ" title="Occupied tonight">
                  <i
                    style={{
                      width: `${Math.round((room.occupiedTonight / Math.max(1, room.total_units)) * 100)}%`,
                    }}
                  />
                </div>
                <p className="prooms-meta">
                  {room.occupiedTonight}/{room.total_units} occupied tonight · {room.upcomingBookings}{" "}
                  upcoming booking{room.upcomingBookings === 1 ? "" : "s"}
                </p>
                {room.amenities.length ? (
                  <p className="prooms-tags">
                    {room.amenities.map((a) => (
                      <span key={a}>{a}</span>
                    ))}
                  </p>
                ) : null}
                <div className="prooms-rate-tools">
                  <span>Adjust rate</span>
                  {[-10, 10, 20].map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={busy}
                      onClick={() => void adjust(room, p)}
                    >
                      {p > 0 ? `+${p}%` : `${p}%`}
                    </button>
                  ))}
                </div>
                <div className="prooms-actions">
                  <button className="partner-link" onClick={() => edit(room)}>
                    Edit
                  </button>
                  <button className="partner-link" onClick={() => void toggle(room)}>
                    {room.active ? "Pause" : "Activate"}
                  </button>
                  <button className="partner-link" onClick={() => void duplicate(room)}>
                    Duplicate
                  </button>
                  <button className="partner-link danger" onClick={() => void remove(room)}>
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
