import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/experience-api";

type Prop = { id: number; name: string };
type Room = { id: number; name: string; active: number };
type Booking = {
  id: number;
  guestName: string;
  guestContact?: string;
  roomName: string | null;
  roomId: number | null;
  guests?: number;
  amount: number;
  status: string;
  checkIn: string;
  checkOut: string;
  paymentStatus?: string | null;
  inventoryHeld?: number;
};

const STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"];
const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ");
const money = (value: number) => `₹${new Intl.NumberFormat("en-IN").format(value)}`;
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (date: string, days: number) =>
  iso(new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86400000));
const nightsOf = (b: Booking) =>
  Math.round((Date.parse(b.checkOut) - Date.parse(b.checkIn)) / 86400000);
const payLabel = (status?: string | null) =>
  status === "paid" ? "Paid" : status === "created" ? "Awaiting payment" : (status ?? "—");
const nextStep: Record<string, [string, string][]> = {
  PENDING: [["CONFIRMED", "Confirm"], ["CANCELLED", "Cancel"]],
  CONFIRMED: [["CHECKED_IN", "Check in"], ["CANCELLED", "Cancel"]],
  CHECKED_IN: [["CHECKED_OUT", "Check out"]],
  CHECKED_OUT: [],
  CANCELLED: [["PENDING", "Reopen"]],
};
const tone = (s: string) =>
  s === "CONFIRMED" || s === "CHECKED_IN" || s === "CHECKED_OUT"
    ? "APPROVED"
    : s === "CANCELLED"
      ? "REJECTED"
      : "PENDING";

export function BookingsView({ property }: { property: Prop }) {
  const base = `partner/properties/${property.id}`;
  const [rows, setRows] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [busy, setBusy] = useState<number | null>(null);
  const today = iso(new Date());
  const [form, setForm] = useState({
    guestName: "",
    guestContact: "",
    roomId: "",
    checkIn: today,
    checkOut: addDays(today, 1),
    guests: "2",
    amount: "",
    status: "CONFIRMED",
  });

  const reload = useCallback(async () => {
    try {
      const [b, r] = await Promise.all([
        apiRequest<{ rows: Booking[] }>(`${base}/bookings`),
        apiRequest<{ rows: Room[] }>(`${base}/rooms`),
      ]);
      setRows(b.data.rows);
      setRooms(r.data.rows.filter((x) => x.active));
    } catch (reason) {
      setError(message(reason));
    }
  }, [base]);
  useEffect(() => {
    void reload();
  }, [reload]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: rows.length };
    for (const s of STATUSES) c[s] = rows.filter((b) => b.status === s).length;
    return c;
  }, [rows]);
  const shown = filter === "ALL" ? rows : rows.filter((b) => b.status === filter);

  const change = async (b: Booking, status: string, roomId?: number | null) => {
    setBusy(b.id);
    try {
      await apiRequest(`${base}/bookings/${b.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, ...(roomId !== undefined ? { roomId } : {}) }),
      });
      setError("");
      setNotice(
        status === "CONFIRMED" || status === "CHECKED_IN"
          ? `BK-${b.id} ${label(status).toLowerCase()} — room dates blocked automatically.`
          : status === "CANCELLED" || status === "CHECKED_OUT"
            ? `BK-${b.id} ${label(status).toLowerCase()} — room released in Rates & Availability.`
            : `BK-${b.id} updated.`,
      );
      await reload();
    } catch (reason) {
      setNotice("");
      setError(message(reason));
    } finally {
      setBusy(null);
    }
  };

  const add = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest(`${base}/bookings`, {
        method: "POST",
        body: JSON.stringify({
          guestName: form.guestName,
          guestContact: form.guestContact,
          roomId: form.roomId ? Number(form.roomId) : null,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          guests: Number(form.guests),
          amount: Number(form.amount || 0),
          status: form.status,
        }),
      });
      setForm({ ...form, guestName: "", guestContact: "", amount: "" });
      setError("");
      setNotice("Booking added.");
      await reload();
    } catch (reason) {
      setNotice("");
      setError(message(reason));
    }
  };

  return (
    <section className="partner-card">
      <h2>Bookings</h2>
      <p className="partner-note">
        Change a booking&apos;s status and your calendar updates by itself: confirming blocks the room
        for those nights, cancelling or checking out frees it again.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p className="pcal-notice" role="status">{notice}</p> : null}

      <form className="prooms-form" onSubmit={add}>
        <h3>Add a booking</h3>
        <label>
          Guest name
          <input
            value={form.guestName}
            onChange={(e) => setForm({ ...form, guestName: e.target.value })}
            required
            minLength={2}
          />
        </label>
        <label>
          Phone or email
          <input
            value={form.guestContact}
            onChange={(e) => setForm({ ...form, guestContact: e.target.value })}
          />
        </label>
        <label>
          Room
          <select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
            <option value="">Assign later</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Check-in
          <input
            type="date"
            value={form.checkIn}
            min={today}
            onChange={(e) =>
              setForm({
                ...form,
                checkIn: e.target.value,
                checkOut: form.checkOut <= e.target.value ? addDays(e.target.value, 1) : form.checkOut,
              })
            }
            required
          />
        </label>
        <label>
          Check-out
          <input
            type="date"
            value={form.checkOut}
            min={addDays(form.checkIn, 1)}
            onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
            required
          />
        </label>
        <label>
          Guests
          <input
            type="number"
            min={1}
            value={form.guests}
            onChange={(e) => setForm({ ...form, guests: e.target.value })}
          />
        </label>
        <label>
          Total amount (₹)
          <input
            type="number"
            min={0}
            placeholder="Optional"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </label>
        <label>
          Status
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
          </select>
        </label>
        <div className="prooms-actions">
          <Button type="submit">Add booking</Button>
        </div>
      </form>

      <div className="pbk-tabs" role="tablist">
        {["ALL", ...STATUSES].map((s) => (
          <button key={s} role="tab" data-on={filter === s} onClick={() => setFilter(s)}>
            {s === "ALL" ? "All" : label(s)} <span>{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="partner-empty">No bookings here yet.</p>
      ) : (
        <div className="pbk-list">
          {shown.map((b) => (
            <article key={b.id} className="pbk-card">
              <header>
                <strong>
                  BK-{b.id} · {b.guestName}
                </strong>
                <span className="pstatus" data-s={tone(b.status)}>
                  {label(b.status)}
                </span>
              </header>
              <p className="pbk-meta">
                {b.checkIn} → {b.checkOut} · {nightsOf(b)} night{nightsOf(b) === 1 ? "" : "s"}
                {b.guests ? ` · ${b.guests} guest${b.guests > 1 ? "s" : ""}` : ""}
              </p>
              <p className="pbk-meta">
                {b.amount ? money(b.amount) : "Quote pending"} · Payment: {payLabel(b.paymentStatus)}
                {b.guestContact ? ` · ${b.guestContact}` : ""}
              </p>
              <div className="pbk-room">
                <select
                  aria-label={`Room for BK-${b.id}`}
                  value={b.roomId ?? ""}
                  disabled={busy === b.id || b.status === "CHECKED_OUT"}
                  onChange={(e) =>
                    void change(b, b.status, e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">Room not assigned</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {b.inventoryHeld ? <small>Dates blocked ✓</small> : null}
              </div>
              <div className="prooms-actions">
                {(nextStep[b.status] ?? []).map(([status, text]) => (
                  <button
                    key={status}
                    className={status === "CANCELLED" ? "partner-link danger" : "pbk-btn"}
                    disabled={busy === b.id}
                    onClick={() => {
                      if (status === "CANCELLED" && !window.confirm(`Cancel BK-${b.id}?`)) return;
                      void change(b, status);
                    }}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
