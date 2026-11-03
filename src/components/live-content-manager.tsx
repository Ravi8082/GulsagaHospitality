import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Database, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AUTH_EVENT } from "@/lib/auth-token";
import { apiRequest } from "@/lib/experience-api";

type FieldKind = "text" | "textarea" | "number" | "boolean" | "select";
type Field = {
  key: string;
  label: string;
  kind?: FieldKind;
  options?: string[];
  required?: boolean;
};
type Row = Record<string, unknown> & { id: number };

type LiveCollection = {
  id: string;
  title: string;
  nameKey: string;
  fields: Field[];
};

const slugField: Field = { key: "slug", label: "Slug (lowercase-with-dashes)", required: true };
const orderField: Field = { key: "sort_order", label: "Sort order", kind: "number" };

const liveCollections: Record<string, LiveCollection> = {
  network_partners: {
    id: "network_partners",
    title: "Network partners",
    nameKey: "name",
    fields: [
      slugField,
      { key: "name", label: "Partner name", required: true },
      { key: "category", label: "Category", required: true },
      { key: "city", label: "City" },
      { key: "country", label: "Country" },
      { key: "property_type", label: "Property type" },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "logo_url", label: "Logo URL (https)" },
      { key: "image_url", label: "Image URL (https)" },
      { key: "website", label: "Website link (https)" },
      { key: "lat", label: "Latitude", kind: "number" },
      { key: "lng", label: "Longitude", kind: "number" },
      { key: "verified", label: "Verified partner", kind: "boolean" },
      { key: "featured", label: "Featured", kind: "boolean" },
      { key: "published", label: "Published", kind: "boolean" },
      orderField,
    ],
  },
  experience_catalog: {
    id: "experience_catalog",
    title: "Curated experiences",
    nameKey: "title",
    fields: [
      slugField,
      { key: "title", label: "Title", required: true },
      { key: "category", label: "Category" },
      { key: "summary", label: "Summary" },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "image_url", label: "Image URL (https)" },
      { key: "link_url", label: "Link (https or /path)" },
      { key: "featured", label: "Featured", kind: "boolean" },
      { key: "published", label: "Published", kind: "boolean" },
      orderField,
    ],
  },
  resorts: {
    id: "resorts",
    title: "Resorts",
    nameKey: "name",
    fields: [
      slugField,
      { key: "name", label: "Resort name", required: true },
      { key: "location", label: "Location", required: true },
      { key: "stars", label: "Stars (1-5)", kind: "number" },
      { key: "category", label: "Category" },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "image_url", label: "Image URL (https)" },
      { key: "website", label: "Website link (https)" },
      { key: "featured", label: "Featured", kind: "boolean" },
      orderField,
    ],
  },
  destinations: {
    id: "destinations",
    title: "Destinations",
    nameKey: "name",
    fields: [
      slugField,
      { key: "name", label: "Destination name", required: true },
      { key: "region", label: "Region", required: true },
      { key: "theme", label: "Theme", required: true },
      { key: "tagline", label: "Tagline" },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "image_url", label: "Image URL (https)" },
      { key: "rating", label: "Rating (0-5)", kind: "number" },
      { key: "lat", label: "Latitude", kind: "number" },
      { key: "lng", label: "Longitude", kind: "number" },
      { key: "featured", label: "Featured", kind: "boolean" },
      orderField,
    ],
  },
  contact_channels: {
    id: "contact_channels",
    title: "Contact details",
    nameKey: "label",
    fields: [
      {
        key: "kind",
        label: "Type",
        kind: "select",
        options: ["phone", "email", "whatsapp", "address", "hours", "map", "social"],
        required: true,
      },
      { key: "label", label: "Label", required: true },
      { key: "value", label: "Value", required: true },
      { key: "url", label: "Link (https, mailto:, tel: or /path)" },
      { key: "published", label: "Published", kind: "boolean" },
      orderField,
    ],
  },
  site_links: {
    id: "site_links",
    title: "Website links",
    nameKey: "label",
    fields: [
      {
        key: "area",
        label: "Area",
        kind: "select",
        options: ["header", "footer", "legal", "social", "cta"],
        required: true,
      },
      { key: "label", label: "Label", required: true },
      { key: "url", label: "Link (https, mailto:, tel: or /path)", required: true },
      { key: "published", label: "Published", kind: "boolean" },
      orderField,
    ],
  },
};

type Draft = Record<string, string | boolean>;

function toDraft(collection: LiveCollection, row?: Row): Draft {
  const draft: Draft = {};
  for (const field of collection.fields) {
    const value = row?.[field.key];
    if (field.kind === "boolean")
      draft[field.key] = value === undefined ? field.key === "published" : Boolean(value);
    else
      draft[field.key] =
        value === null || value === undefined
          ? field.kind === "select"
            ? (field.options?.[0] ?? "")
            : ""
          : String(value);
  }
  return draft;
}

function toPayload(collection: LiveCollection, draft: Draft) {
  const payload: Record<string, unknown> = {};
  for (const field of collection.fields) {
    const value = draft[field.key];
    if (field.kind === "boolean") payload[field.key] = Boolean(value);
    else if (field.kind === "number") {
      const text = String(value).trim();
      payload[field.key] = text === "" ? (field.key === "sort_order" ? 0 : null) : Number(text);
    } else {
      const text = String(value).trim();
      payload[field.key] = text === "" && !field.required ? null : text;
    }
  }
  return payload;
}

export function LiveContentManager({ collectionId }: { collectionId: string }) {
  const collection = liveCollections[collectionId] as LiveCollection;
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await apiRequest<{ rows: Row[] }>(`admin/hospitality/${collection.id}`);
      setRows(data.rows);
      setSignedIn(true);
      setMessage("");
    } catch (error) {
      setSignedIn(false);
      setMessage(error instanceof Error ? error.message : "Could not reach the database service.");
    }
  }, [collection.id]);

  useEffect(() => {
    setDraft(null);
    setEditingId(null);
    void load();
    window.addEventListener(AUTH_EVENT, load);
    return () => window.removeEventListener(AUTH_EVENT, load);
  }, [load]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiRequest("auth/admin/login", { method: "POST", body: JSON.stringify(credentials) });
      setCredentials({ email: "", password: "" });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    try {
      await apiRequest(`admin/hospitality/${collection.id}${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(toPayload(collection, draft)),
      });
      setDraft(null);
      setEditingId(null);
      setMessage("Saved to the database.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Row) {
    if (!window.confirm(`Delete "${String(row[collection.nameKey])}" from the database?`)) return;
    try {
      await apiRequest(`admin/hospitality/${collection.id}/${row.id}`, { method: "DELETE" });
      setMessage("Deleted from the database.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    }
  }

  return (
    <section className="live-content" aria-label={`${collection.title} database manager`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <Database size={14} /> LIVE DATABASE
          </p>
          <h2>{collection.title}</h2>
        </div>
        {signedIn ? (
          <Button
            onClick={() => {
              setEditingId(null);
              setDraft(toDraft(collection));
            }}
          >
            <Plus /> Add new
          </Button>
        ) : null}
      </div>
      <p className="preview-note">
        These changes are saved to the MySQL database through the Gulsaga API. They require the
        backend to be running and a Super Admin sign-in.
      </p>
      {message ? <p role="status">{message}</p> : null}

      {signedIn === false ? (
        <form className="live-content-form" onSubmit={signIn}>
          <label>
            Admin email
            <input
              type="email"
              required
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.currentTarget.value })}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.currentTarget.value })}
            />
          </label>
          <Button type="submit" disabled={busy}>
            Sign in
          </Button>
        </form>
      ) : null}

      {draft ? (
        <form className="live-content-form" onSubmit={save}>
          {collection.fields.map((field) => (
            <label key={field.key} className={field.kind === "textarea" ? "wide" : undefined}>
              {field.label}
              {field.kind === "textarea" ? (
                <textarea
                  rows={4}
                  value={String(draft[field.key])}
                  onChange={(e) => setDraft({ ...draft, [field.key]: e.currentTarget.value })}
                />
              ) : field.kind === "boolean" ? (
                <input
                  type="checkbox"
                  checked={Boolean(draft[field.key])}
                  onChange={(e) => setDraft({ ...draft, [field.key]: e.currentTarget.checked })}
                />
              ) : field.kind === "select" ? (
                <select
                  value={String(draft[field.key])}
                  onChange={(e) => setDraft({ ...draft, [field.key]: e.currentTarget.value })}
                >
                  {(field.options ?? []).map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.kind === "number" ? "number" : "text"}
                  step={field.kind === "number" ? "any" : undefined}
                  required={field.required}
                  value={String(draft[field.key])}
                  onChange={(e) => setDraft({ ...draft, [field.key]: e.currentTarget.value })}
                />
              )}
            </label>
          ))}
          <div className="live-content-actions">
            <Button type="submit" disabled={busy}>
              {editingId ? "Save changes" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {signedIn ? (
        <ul className="live-content-list">
          {rows.length === 0 ? <li>No records yet. Use “Add new”.</li> : null}
          {rows.map((row) => (
            <li key={row.id}>
              <strong>{String(row[collection.nameKey])}</strong>
              <span>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={`Edit ${String(row[collection.nameKey])}`}
                  onClick={() => {
                    setEditingId(row.id);
                    setDraft(toDraft(collection, row));
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={`Delete ${String(row[collection.nameKey])}`}
                  onClick={() => void remove(row)}
                >
                  <Trash2 />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
