import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/experience-api";

type Prop = { id: number; name: string };
type RoomLite = { id: number; name: string; total_units: number; base_rate: number; active: number };
type Day = {
  date: string;
  availableUnits: number;
  stopSell: number;
  minStay: number;
  rate: number | null;
};

const money = (value: number) => `₹${new Intl.NumberFormat("en-IN").format(value)}`;
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";
const iso = (d: Date) => d.toISOString().slice(0, 10);
const monthStartOf = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const monthLabel = (d: Date) =>
  d.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AvailabilityView({ property }: { property: Prop }) {
  const [rooms, setRooms] = useState<RoomLite[]>([]);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [month, setMonth] = useState(() => monthStartOf(new Date()));
  const [saved, setSaved] = useState<Record<string, Day>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [units, setUnits] = useState("");
  const [rate, setRate] = useState("");
  const [minStay, setMinStay] = useState("1");
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const base = `partner/properties/${property.id}/rooms`;
  const today = iso(new Date());

  useEffect(() => {
    apiRequest<{ rows: RoomLite[] }>(base)
      .then(({ data }) => setRooms(data.rows.filter((r) => r.active)))
      .catch((reason) => setError(message(reason)));
  }, [base]);
  const room = rooms.find((r) => r.id === roomId) ?? rooms[0];

  const first = iso(month);
  const last = iso(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)));
  const load = useCallback(async () => {
    if (!room) return;
    try {
      const { data } = await apiRequest<{ rows: Day[] }>(
        `${base}/${room.id}/inventory?from=${first}&to=${last}`,
      );
      setSaved(Object.fromEntries(data.rows.map((r) => [r.date, r])));
      setError("");
    } catch (reason) {
      setError(message(reason));
    }
  }, [base, room, first, last]);
  useEffect(() => {
    setSelected([]);
    void load();
  }, [load]);

  const days = useMemo(() => {
    const count = Number(last.slice(8));
    return Array.from({ length: count }, (_, i) => iso(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), i + 1))));
  }, [month, last]);
  const lead = month.getUTCDay();

  const stats = useMemo(() => {
    let open = 0;
    let stopped = 0;
    let custom = 0;
    for (const d of days) {
      const s = saved[d];
      if (s?.stopSell || s?.availableUnits === 0) stopped++;
      else open++;
      if (s?.rate != null) custom++;
    }
    return { open, stopped, custom };
  }, [days, saved]);

  const pick = (filter: (date: string, dow: number) => boolean) =>
    setSelected(
      days.filter((d) => d >= today && filter(d, new Date(`${d}T00:00:00Z`).getUTCDay())),
    );
  const toggle = (date: string) =>
    setSelected((s) => (s.includes(date) ? s.filter((d) => d !== date) : [...s, date]));

  const submit = async (payload: {
    availableUnits: number;
    stopSell: boolean;
    minStay: number;
    rate: number | null;
  }) => {
    if (!room || selected.length === 0) return;
    setBusy(true);
    try {
      await apiRequest(`${base}/${room.id}/inventory`, {
        method: "PUT",
        body: JSON.stringify({ dates: selected, ...payload }),
      });
      setNotice(`Updated ${selected.length} day${selected.length > 1 ? "s" : ""}.`);
      setSelected([]);
      await load();
      setError("");
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy(false);
    }
  };
  const apply = () => {
    if (!room) return;
    const available = units === "" ? room.total_units : Number(units);
    void submit({
      availableUnits: closed ? 0 : available,
      stopSell: closed,
      minStay: Number(minStay) || 1,
      rate: rate === "" ? null : Number(rate),
    });
  };
  const reset = () =>
    room
      ? submit({ availableUnits: room.total_units, stopSell: false, minStay: 1, rate: null })
      : undefined;

  if (!room) {
    return (
      <section className="partner-card">
        <h2>Rates & Availability</h2>
        {error ? <p role="alert">{error}</p> : <p className="partner-empty">Add an active room in Rooms & Inventory first.</p>}
      </section>
    );
  }

  return (
    <section className="partner-card">
      <h2>Rates & Availability</h2>
      <p className="partner-note">
        Pick the dates on the calendar, then set rooms, nightly rate and rules. Dates you do not
        change keep the room&apos;s base rate and full availability.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p className="pcal-notice" role="status">{notice}</p> : null}

      <div className="pcal-top">
        <select
          aria-label="Room"
          value={room.id}
          onChange={(e) => {
            setRoomId(Number(e.target.value));
            setNotice("");
          }}
        >
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · {money(r.base_rate)}
            </option>
          ))}
        </select>
        <div className="pcal-nav">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setMonth(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 1, 1)))}
          >
            ‹
          </button>
          <strong>{monthLabel(month)}</strong>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setMonth(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1)))}
          >
            ›
          </button>
        </div>
      </div>

      <div className="pcal-legend">
        <span><i data-k="open" /> Open ({stats.open})</span>
        <span><i data-k="closed" /> Closed / sold out ({stats.stopped})</span>
        <span><i data-k="custom" /> Custom rate ({stats.custom})</span>
      </div>

      <div className="pcal-grid" role="grid">
        {weekdays.map((w) => (
          <div key={w} className="pcal-head">{w}</div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`b${i}`} />
        ))}
        {days.map((d) => {
          const s = saved[d];
          const isClosed = Boolean(s?.stopSell) || s?.availableUnits === 0;
          const past = d < today;
          return (
            <button
              type="button"
              key={d}
              className="pcal-day"
              data-closed={isClosed}
              data-custom={s?.rate != null}
              data-selected={selected.includes(d)}
              disabled={past}
              onClick={() => toggle(d)}
              aria-pressed={selected.includes(d)}
              aria-label={d}
            >
              <b>{Number(d.slice(8))}</b>
              <span className="pcal-rate">{money(s?.rate ?? room.base_rate)}</span>
              <small>
                {isClosed ? "Closed" : `${s?.availableUnits ?? room.total_units}/${room.total_units} rooms`}
                {s && s.minStay > 1 ? ` · ${s.minStay}N` : ""}
              </small>
            </button>
          );
        })}
      </div>

      <div className="pcal-quick">
        <span>Select:</span>
        <button type="button" onClick={() => pick(() => true)}>Whole month</button>
        <button type="button" onClick={() => pick((_, w) => w === 5 || w === 6 || w === 0)}>Fri–Sun</button>
        <button type="button" onClick={() => pick((_, w) => w >= 1 && w <= 4)}>Mon–Thu</button>
        <button type="button" onClick={() => setSelected([])}>Clear</button>
      </div>

      <div className="pcal-panel" data-active={selected.length > 0}>
        <h3>
          {selected.length
            ? `${selected.length} day${selected.length > 1 ? "s" : ""} selected`
            : "Select dates on the calendar to edit them"}
        </h3>
        <div className="pcal-fields">
          <label>
            Nightly rate (₹)
            <input
              type="number"
              min={0}
              placeholder={`Base ${room.base_rate}`}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </label>
          <label>
            Rooms available
            <input
              type="number"
              min={0}
              max={room.total_units}
              placeholder={`All ${room.total_units}`}
              value={units}
              disabled={closed}
              onChange={(e) => setUnits(e.target.value)}
            />
          </label>
          <label>
            Minimum stay (nights)
            <input
              type="number"
              min={1}
              max={30}
              value={minStay}
              onChange={(e) => setMinStay(e.target.value)}
            />
          </label>
          <label className="pcal-switch">
            <input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} />
            Close these dates (stop sell)
          </label>
        </div>
        <div className="prooms-actions">
          <Button type="button" disabled={busy || selected.length === 0} onClick={apply}>
            Apply to {selected.length || "selected"} day{selected.length === 1 ? "" : "s"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || selected.length === 0}
            onClick={() => void reset()}
          >
            Reset to default
          </Button>
        </div>
      </div>
    </section>
  );
}
