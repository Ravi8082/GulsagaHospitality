import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/hotel-layout";
import { apiBase, apiRequest } from "@/lib/experience-api";
import { pageHead } from "@/lib/hotel-data";
import "@/policies.css";

type Policy = { slug: string; title: string; version: number; hasPdf: boolean; body?: string; updatedAt: string };

export const Route = createFileRoute("/policies")({
  validateSearch: (search: Record<string, unknown>) => ({
    doc: typeof search["doc"] === "string" ? search["doc"] : "terms",
  }),
  head: () => pageHead("Terms & Policies", "Gulsaga Terms & Conditions and Privacy Policy."),
  component: Policies,
});

function Policies() {
  const { doc } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [list, setList] = useState<Policy[]>([]);
  const [current, setCurrent] = useState<Policy | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<Policy[]>("public/policies")
      .then((r) => setList(r.data))
      .catch(() => setError("Policies could not be loaded right now."));
  }, []);

  useEffect(() => {
    setCurrent(null);
    apiRequest<Policy>(`public/policies/${encodeURIComponent(doc)}`)
      .then((r) => setCurrent(r.data))
      .catch(() => setError("This policy could not be found."));
  }, [doc]);

  return (
    <Layout>
      <main className="info-page">
        <section className="info-hero">
          <div className="info-hero-shade" />
          <div className="info-hero-content">
            <p className="info-eyebrow">Legal</p>
            <h1>Terms &amp; Policies</h1>
            <p>The rules that keep every enquiry, booking and membership clear and fair.</p>
          </div>
        </section>
        <div className="policy-page">
        <div className="policy-tabs" role="tablist">
          {list.map((p) => (
            <button
              key={p.slug}
              type="button"
              role="tab"
              aria-selected={p.slug === doc}
              className={p.slug === doc ? "on" : ""}
              onClick={() => void navigate({ search: { doc: p.slug } })}
            >
              {p.title}
            </button>
          ))}
        </div>
        {error && !current ? <p className="policy-note">{error}</p> : null}
        {current ? (
          <article className="policy-card">
            <header>
              <h2>{current.title}</h2>
              <small>
                Version {current.version} · Updated {new Date(current.updatedAt).toLocaleDateString()}
              </small>
            </header>
            {current.body ? <div className="policy-body">{current.body}</div> : null}
            {current.hasPdf ? (
              <>
                <a className="policy-pdf" href={`${apiBase}/public/policies/${current.slug}/pdf`} target="_blank" rel="noreferrer">
                  Open the full {current.title} (PDF)
                </a>
                <iframe className="policy-frame" title={current.title} src={`${apiBase}/public/policies/${current.slug}/pdf`} />
              </>
            ) : null}
          </article>
        ) : null}
      </div>
      </main>
    </Layout>
  );
}
