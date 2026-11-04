import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/experience-api";
import { ImageField } from "@/components/partner-modules";

type Prop = { id: number; name: string };
type Row = Record<string, string>;
type Details = {
  totalRooms: number | null;
  checkIn: string;
  checkOut: string;
  roomTypes: string[];
  roomAmenities: string[];
  distances: Row[];
  dining: Row[];
  banquet: { available: boolean; capacity: number | null; description: string };
  recreation: string[];
  sightseeing: Row[];
  policies: string;
};
export type Profile = {
  logoUrl: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
  contactPhone: string;
  contactEmail: string;
  details: Details;
};

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

const AMENITIES = ["Wi-Fi", "Air conditioning", "LED TV", "Mini bar", "Tea/coffee maker", "Electronic safe", "Hot water", "Balcony"];
const RECREATION = ["Swimming pool", "Fitness centre", "Spa", "Game room", "Kids play area", "Bonfire", "Yoga"];
const DISTANCE_PRESETS = ["Nearest airport", "Railway station", "Bus stand", "City centre"];

// Pull coordinates out of a pasted Google Maps link (short maps.app.goo.gl links cannot be read in the browser).
function parseMapsLink(text: string) {
  const m =
    text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ??
    text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ??
    text.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
}

export function AddressMap({
  lat,
  lng,
  query,
  onChange,
  onError,
}: {
  lat: number | null;
  lng: number | null;
  query: string;
  onChange: (lat: number | null, lng: number | null) => void;
  onError: (message: string) => void;
}) {
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const has = lat !== null && lng !== null;
  const embed = has
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.012},${lat - 0.008},${lng + 0.012},${lat + 0.008}&layer=mapnik&marker=${lat},${lng}`
    : "";

  const find = async () => {
    if (!query.trim()) return onError("Type the address, city or state first.");
    setBusy(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      );
      const rows = (await res.json()) as { lat: string; lon: string }[];
      const first = rows[0];
      if (!first) return onError("Address not found on the map. Try a nearby landmark or paste a Google Maps link.");
      onChange(Number(Number(first.lat).toFixed(6)), Number(Number(first.lon).toFixed(6)));
    } catch {
      onError("Could not reach the map service. Paste a Google Maps link or enter the coordinates.");
    } finally {
      setBusy(false);
    }
  };
  const here = () => {
    if (!navigator.geolocation) return onError("This browser cannot share your location.");
    navigator.geolocation.getCurrentPosition(
      (p) => onChange(Number(p.coords.latitude.toFixed(6)), Number(p.coords.longitude.toFixed(6))),
      () => onError("Location permission was denied."),
    );
  };
  const fromLink = () => {
    const found = parseMapsLink(link);
    if (!found) return onError("No coordinates found in that link. Open the place in Google Maps and copy the full address-bar link.");
    onChange(found.lat, found.lng);
    setLink("");
  };

  return (
    <div className="pprof-map">
      <div className="pprof-row-btns">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void find()}>
          {busy ? "Searching…" : "Find address on map"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={here}>
          Use my current location
        </Button>
        {has ? (
          <a className="penq-act" href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer">
            Open in Google Maps
          </a>
        ) : null}
      </div>
      <div className="pprof-link">
        <input
          placeholder="Or paste a Google Maps link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          aria-label="Google Maps link"
        />
        <button type="button" className="penq-act" onClick={fromLink} disabled={!link.trim()}>
          Use link
        </button>
      </div>
      <div className="pprof-coords">
        <label>
          Latitude
          <input
            type="number"
            step="any"
            value={lat ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value), lng)}
          />
        </label>
        <label>
          Longitude
          <input
            type="number"
            step="any"
            value={lng ?? ""}
            onChange={(e) => onChange(lat, e.target.value === "" ? null : Number(e.target.value))}
          />
        </label>
      </div>
      {embed ? (
        <iframe className="pprof-frame" title="Property location" src={embed} loading="lazy" />
      ) : (
        <p className="partner-empty">No pin yet. Find the address, use your location or paste a Google Maps link.</p>
      )}
    </div>
  );
}

function Chips({
  values,
  onChange,
  suggestions = [],
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  suggestions?: string[];
  placeholder: string;
}) {
  const [text, setText] = useState("");
  const add = (value: string) => {
    const v = value.trim();
    if (v && !values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setText("");
  };
  return (
    <div className="pprof-chips">
      <div className="pprof-chiplist">
        {values.map((v) => (
          <span key={v} className="pprof-chip">
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="pprof-link">
        <input
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(text);
            }
          }}
        />
        <button type="button" className="penq-act" onClick={() => add(text)} disabled={!text.trim()}>
          Add
        </button>
      </div>
      {suggestions.filter((s) => !values.includes(s)).length ? (
        <div className="pprof-chiplist">
          {suggestions
            .filter((s) => !values.includes(s))
            .map((s) => (
              <button key={s} type="button" className="pprof-suggest" onClick={() => add(s)}>
                + {s}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}

function ListEditor({
  rows,
  fields,
  addLabel,
  presets,
  onChange,
}: {
  rows: Row[];
  fields: { key: string; label: string; placeholder?: string }[];
  addLabel: string;
  presets?: { key: string; values: string[] };
  onChange: (rows: Row[]) => void;
}) {
  const blank = Object.fromEntries(fields.map((f) => [f.key, ""]));
  return (
    <div className="pprof-list">
      {rows.map((row, i) => (
        <div className="pprof-itemrow" key={i}>
          {fields.map((f) => (
            <label key={f.key}>
              {f.label}
              <input
                value={row[f.key] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) =>
                  onChange(rows.map((r, j) => (j === i ? { ...r, [f.key]: e.target.value } : r)))
                }
              />
            </label>
          ))}
          <button
            type="button"
            className="pprof-x"
            aria-label="Remove row"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <div className="pprof-chiplist">
        <button type="button" className="penq-act" onClick={() => onChange([...rows, { ...blank }])}>
          + {addLabel}
        </button>
        {presets
          ? presets.values
              .filter((v) => !rows.some((r) => r[presets.key] === v))
              .map((v) => (
                <button
                  key={v}
                  type="button"
                  className="pprof-suggest"
                  onClick={() => onChange([...rows, { ...blank, [presets.key]: v }])}
                >
                  + {v}
                </button>
              ))
          : null}
      </div>
    </div>
  );
}

export function BrandProfileView({
  property,
  onLogo,
}: {
  property: Prop;
  onLogo: (logoUrl: string) => void;
}) {
  const base = `partner/properties/${property.id}/profile`;
  const [p, setP] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setP(null);
    apiRequest<{ profile: Profile }>(base)
      .then(({ data }) => {
        setP(data.profile);
        setError("");
      })
      .catch((reason) => setError(message(reason)));
  }, [base]);

  const todo = useMemo(() => {
    if (!p) return [];
    const d = p.details;
    return [
      [Boolean(p.logoUrl), "Logo"],
      [Boolean(p.tagline.trim()), "Tagline"],
      [Boolean(p.address.trim() && p.city.trim()), "Address"],
      [p.lat !== null && p.lng !== null, "Map pin"],
      [Boolean(p.contactPhone.trim() || p.contactEmail.trim()), "Contact"],
      [d.totalRooms !== null && d.roomTypes.length > 0, "Rooms"],
      [d.roomAmenities.length > 0, "Amenities"],
      [d.distances.some((r) => r["label"]), "Distances"],
      [d.dining.some((r) => r["name"]), "Dining"],
      [d.sightseeing.some((r) => r["name"]), "Sightseeing"],
    ] as [boolean, string][];
  }, [p]);

  if (!p) return error ? <p role="alert">{error}</p> : <p className="partner-empty">Loading profile…</p>;
  const d = p.details;
  const set = (patch: Partial<Profile>) => setP({ ...p, ...patch });
  const setD = (patch: Partial<Details>) => setP({ ...p, details: { ...d, ...patch } });
  const done = todo.filter(([ok]) => ok).length;
  const percent = Math.round((done / (todo.length || 1)) * 100);

  const save = async () => {
    setSaving(true);
    setNotice("");
    try {
      const body: Profile = {
        ...p,
        details: {
          ...d,
          distances: d.distances.filter((r) => r["label"]?.trim()),
          dining: d.dining.filter((r) => r["name"]?.trim()),
          sightseeing: d.sightseeing.filter((r) => r["name"]?.trim()),
        },
      };
      await apiRequest(base, { method: "PUT", body: JSON.stringify(body) });
      setP(body);
      onLogo(body.logoUrl);
      setError("");
      setNotice("Profile saved.");
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="partner-card pprof">
      <h2>Property Profile</h2>
      <p className="partner-note">
        Your brand, location and the details guests look for. Saved to your portal; the public site only
        changes when Gulsaga publishes it.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? (
        <p className="pcal-notice" role="status">
          {notice}
        </p>
      ) : null}

      <div className="pprof-progress">
        <div>
          <strong>{percent}% complete</strong>
          <span>
            {todo
              .filter(([ok]) => !ok)
              .map(([, label]) => label)
              .join(" · ") || "Everything is filled in."}
          </span>
        </div>
        <i style={{ width: `${percent}%` }} />
      </div>

      <div className="pprof-sec">
        <h3>Brand</h3>
        <ImageField
          property={property}
          label="Logo (shown on your dashboard)"
          value={p.logoUrl}
          onChange={(logoUrl) => set({ logoUrl })}
          onError={setError}
        />
        <label>
          Tagline
          <input
            value={p.tagline}
            maxLength={200}
            placeholder="e.g. A quiet hill retreat above the clouds"
            onChange={(e) => set({ tagline: e.target.value })}
          />
        </label>
      </div>

      <div className="pprof-sec">
        <h3>Contact &amp; address</h3>
        <div className="pprof-grid">
          <label>
            Phone
            <input value={p.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} />
          </label>
          <label>
            Email
            <input type="email" value={p.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} />
          </label>
          <label className="pprof-wide">
            Full address
            <input value={p.address} onChange={(e) => set({ address: e.target.value })} />
          </label>
          <label>
            City
            <input value={p.city} onChange={(e) => set({ city: e.target.value })} />
          </label>
          <label>
            State
            <input value={p.state} onChange={(e) => set({ state: e.target.value })} />
          </label>
          <label>
            Pincode
            <input value={p.pincode} maxLength={12} onChange={(e) => set({ pincode: e.target.value })} />
          </label>
        </div>
        <AddressMap
          lat={p.lat}
          lng={p.lng}
          query={[p.address, p.city, p.state, p.pincode].filter(Boolean).join(", ")}
          onChange={(lat, lng) => {
            setError("");
            set({ lat, lng });
          }}
          onError={setError}
        />
      </div>

      <div className="pprof-sec">
        <h3>Rooms &amp; stay</h3>
        <div className="pprof-grid">
          <label>
            Total rooms
            <input
              type="number"
              min={0}
              value={d.totalRooms ?? ""}
              onChange={(e) => setD({ totalRooms: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </label>
          <label>
            Check-in time
            <input value={d.checkIn} placeholder="2:00 PM" onChange={(e) => setD({ checkIn: e.target.value })} />
          </label>
          <label>
            Check-out time
            <input value={d.checkOut} placeholder="11:00 AM" onChange={(e) => setD({ checkOut: e.target.value })} />
          </label>
        </div>
        <span className="pprof-label">Room categories</span>
        <Chips
          values={d.roomTypes}
          onChange={(roomTypes) => setD({ roomTypes })}
          placeholder="e.g. Superior Double Room with Mountain View"
        />
        <span className="pprof-label">Amenities in every room</span>
        <Chips
          values={d.roomAmenities}
          onChange={(roomAmenities) => setD({ roomAmenities })}
          suggestions={AMENITIES}
          placeholder="Add an amenity"
        />
      </div>

      <div className="pprof-sec">
        <h3>How to reach</h3>
        <ListEditor
          rows={d.distances}
          fields={[
            { key: "label", label: "From", placeholder: "Nearest airport" },
            { key: "distance", label: "Distance", placeholder: "137 km" },
            { key: "time", label: "Travel time", placeholder: "3 h 30 m" },
          ]}
          addLabel="Add distance"
          presets={{ key: "label", values: DISTANCE_PRESETS }}
          onChange={(distances) => setD({ distances })}
        />
      </div>

      <div className="pprof-sec">
        <h3>Food &amp; beverage</h3>
        <ListEditor
          rows={d.dining}
          fields={[
            { key: "name", label: "Restaurant / bar", placeholder: "Keys Cafe" },
            { key: "description", label: "What it offers", placeholder: "All-day multi-cuisine dining" },
          ]}
          addLabel="Add restaurant"
          onChange={(dining) => setD({ dining })}
        />
      </div>

      <div className="pprof-sec">
        <h3>Banquets &amp; meetings</h3>
        <label className="pprof-check">
          <input
            type="checkbox"
            checked={d.banquet.available}
            onChange={(e) => setD({ banquet: { ...d.banquet, available: e.target.checked } })}
          />
          Banquet / meeting spaces available
        </label>
        {d.banquet.available ? (
          <div className="pprof-grid">
            <label>
              Capacity (guests)
              <input
                type="number"
                min={0}
                value={d.banquet.capacity ?? ""}
                onChange={(e) =>
                  setD({ banquet: { ...d.banquet, capacity: e.target.value === "" ? null : Number(e.target.value) } })
                }
              />
            </label>
            <label className="pprof-wide">
              Details
              <input
                value={d.banquet.description}
                placeholder="Wi-Fi, sound system, lawn, projector…"
                onChange={(e) => setD({ banquet: { ...d.banquet, description: e.target.value } })}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="pprof-sec">
        <h3>Recreation &amp; wellness</h3>
        <Chips
          values={d.recreation}
          onChange={(recreation) => setD({ recreation })}
          suggestions={RECREATION}
          placeholder="Add an activity or facility"
        />
      </div>

      <div className="pprof-sec">
        <h3>Nearby sightseeing</h3>
        <ListEditor
          rows={d.sightseeing}
          fields={[
            { key: "name", label: "Place", placeholder: "Naldehra" },
            { key: "distance", label: "Distance", placeholder: "25 km" },
            { key: "description", label: "Why visit", placeholder: "Golf course in deodar forest" },
          ]}
          addLabel="Add place"
          onChange={(sightseeing) => setD({ sightseeing })}
        />
      </div>

      <div className="pprof-sec">
        <h3>Policies</h3>
        <label>
          Cancellation, children, pets, ID rules
          <textarea
            rows={3}
            maxLength={2000}
            value={d.policies}
            onChange={(e) => setD({ policies: e.target.value })}
          />
        </label>
      </div>

      <div className="pprof-save">
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </section>
  );
}
