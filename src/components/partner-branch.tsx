import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/experience-api";
import { AddressMap } from "@/components/partner-profile";
import { mediaSrc } from "@/components/partner-modules";

export type BranchProperty = {
  id: number;
  name: string;
  location: string;
  logoUrl?: string | null;
  listed?: boolean | number;
};

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";
const CATEGORIES = ["Resort", "Hotel", "Boutique stay", "Villa", "Homestay", "Art residency", "Experience / product"];

export function BranchesView({
  properties,
  currentId,
  onSelect,
  onAdded,
}: {
  properties: BranchProperty[];
  currentId: number;
  onSelect: (id: number) => void;
  onAdded: (properties: BranchProperty[], newId: number) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    location: "",
    category: "Resort",
    address: "",
    city: "",
    state: "",
    pincode: "",
    lat: null as number | null,
    lng: null as number | null,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { data } = await apiRequest<{ id: number; properties: BranchProperty[] }>("partner/properties", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          location: form.location,
          category: form.category,
          profile: {
            address: form.address,
            city: form.city || form.location,
            state: form.state,
            pincode: form.pincode,
            lat: form.lat,
            lng: form.lng,
          },
        }),
      });
      setForm({ ...form, name: "", location: "", address: "", city: "", state: "", pincode: "", lat: null, lng: null });
      setError("");
      onAdded(data.properties, data.id);
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="partner-card pprof">
      <h2>Branches &amp; Products</h2>
      <p className="partner-note">
        Launching a new branch or product? Add it here with its address and map pin. It gets its own
        rooms, rates, bookings and profile, and goes live on Gulsaga after approval.
      </p>

      <div className="pprof-branches">
        {properties.map((p) => (
          <button
            key={p.id}
            type="button"
            className="pprof-branch"
            data-on={p.id === currentId}
            onClick={() => onSelect(p.id)}
          >
            {p.logoUrl ? <img src={mediaSrc(p.logoUrl)} alt="" /> : <span>{p.name.slice(0, 1)}</span>}
            <strong>{p.name}</strong>
            <small>{p.location}</small>
            <em data-live={Boolean(p.listed)}>{p.listed ? "Live on Gulsaga" : "Awaiting approval"}</em>
          </button>
        ))}
      </div>

      {error ? <p role="alert">{error}</p> : null}
      <form className="pprof-sec" onSubmit={submit}>
        <h3>Add a new branch or product</h3>
        <div className="pprof-grid">
          <label>
            Name
            <input value={form.name} required minLength={2} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            Location (city / area)
            <input value={form.location} required minLength={2} placeholder="e.g. Manali" onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </label>
          <label>
            Type
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="pprof-wide">
            Full address
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          <label>
            State
            <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </label>
          <label>
            Pincode
            <input value={form.pincode} maxLength={12} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
          </label>
        </div>
        <AddressMap
          lat={form.lat}
          lng={form.lng}
          query={[form.address, form.location, form.state, form.pincode].filter(Boolean).join(", ")}
          onChange={(lat, lng) => {
            setError("");
            setForm({ ...form, lat, lng });
          }}
          onError={setError}
        />
        <div className="pprof-save">
          <Button type="submit" disabled={busy}>
            {busy ? "Adding…" : "Add branch"}
          </Button>
        </div>
      </form>
    </section>
  );
}
