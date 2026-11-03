import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BedDouble,
  Flower2,
  Heart,
  Leaf,
  MapPin,
  Mountain,
  Palmtree,
  Sailboat,
  UsersRound,
  Grid2X2,
} from "lucide-react";
import { useState } from "react";
import { Layout } from "@/components/hotel-layout";
import { PreviewImage } from "@/components/preview-image";
import { useHomeContent } from "@/lib/home-content";
import { pageHead } from "@/lib/hotel-data";

const featuredRegions = ["Uttarakhand", "Goa", "Rajasthan", "Himachal", "Kerala"];
const regionIcons = [Mountain, Palmtree, Flower2, Mountain, Sailboat];

export const Route = createFileRoute("/resorts/")({
  head: () =>
    pageHead(
      "Curated Resorts",
      "Explore Gulsaga's curated luxury resorts, boutique stays and retreats across India.",
    ),
  component: Resorts,
});

function Resorts() {
  const { resorts, resortPageContent } = useHomeContent();
  const [activeRegion, setActiveRegion] = useState("All Resorts");
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const regions = ["All Resorts", ...featuredRegions, "Others"];
  const filteredResorts =
    activeRegion === "All Resorts"
      ? resorts
      : activeRegion === "Others"
        ? resorts.filter((resort) => !featuredRegions.includes(resort.region))
        : resorts.filter((resort) => resort.region === activeRegion);

  const toggleFavorite = (resortId: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(resortId)) {
        next.delete(resortId);
      } else {
        next.add(resortId);
      }
      return next;
    });
  };

  return (
    <Layout home>
      <div className="resorts-page">
        <section className="resorts-hero">
          {resortPageContent.heroMedia.type === "video" ? (
            <video
              aria-label={resortPageContent.heroMedia.name}
              autoPlay
              className="resorts-hero-media"
              loop
              muted
              playsInline
              preload="none"
              src={resortPageContent.heroMedia.src}
            />
          ) : (
            <PreviewImage
              src={resortPageContent.heroMedia.src}
              alt="Luxury mountain resort and infinity pool at sunset"
              width={1920}
              height={610}
              loading="eager"
            />
          )}
          <div className="resorts-hero-shade" />
          <div className="resorts-hero-copy">
            <p className="eyebrow">{resortPageContent.eyebrow}</p>
            <h1>{resortPageContent.heading}</h1>
            <p>{resortPageContent.description}</p>
            <div className="resorts-hero-actions">
              <a className="resorts-gold-button" href="#featured-resorts">
                {resortPageContent.primaryLabel} <ArrowRight size={17} />
              </a>
              <Link className="resorts-watch-link" to="/experiences">
                <span aria-hidden="true">▶</span>
                {resortPageContent.secondaryLabel}
              </Link>
            </div>
          </div>
        </section>

        <section className="resorts-highlights" aria-label="Resort benefits">
          <div className="resorts-highlights-inner">
            <div>
              <BedDouble />
              <span>{resortPageContent.highlights[0]}</span>
            </div>
            <div>
              <Flower2 />
              <span>{resortPageContent.highlights[1]}</span>
            </div>
            <div>
              <Leaf />
              <span>{resortPageContent.highlights[2]}</span>
            </div>
            <div>
              <UsersRound />
              <span>{resortPageContent.highlights[3]}</span>
            </div>
          </div>
        </section>

        <section className="resorts-collection" id="featured-resorts">
          <div className="resorts-title">
            <span />
            <h2>{resortPageContent.collectionHeading}</h2>
            <span />
          </div>

          <div className="resorts-filters" aria-label="Filter resorts by destination">
            {regions.map((region, index) => {
              const RegionIcon =
                region === "All Resorts"
                  ? Grid2X2
                  : region === "Others"
                    ? Grid2X2
                    : (regionIcons[featuredRegions.indexOf(region)] ?? MapPin);

              return (
                <button
                  aria-pressed={activeRegion === region}
                  className={activeRegion === region ? "active" : ""}
                  key={region}
                  onClick={() => setActiveRegion(region)}
                  type="button"
                >
                  {index === 0 ? null : <RegionIcon aria-hidden="true" />}
                  {region}
                </button>
              );
            })}
          </div>

          {filteredResorts.length > 0 ? (
            <div className="resorts-cards">
              {filteredResorts.map((resort) => {
                const isFavorite = favorites.has(resort.id);

                return (
                  <article className="resort-card" key={resort.id}>
                    <Link
                      aria-label={`View ${resort.name} in ${resort.location}. ${resort.description}`}
                      className="resort-card-link"
                      params={{ resortId: resort.id }}
                      to="/resorts/$resortId"
                    >
                      {resort.media.type === "video" ? (
                        <video
                          aria-label={resort.media.name}
                          autoPlay
                          className="resort-card-media"
                          loop
                          muted
                          playsInline
                          preload="none"
                          src={resort.media.src}
                        />
                      ) : (
                        <PreviewImage
                          src={resort.media.src}
                          alt={resort.media.name}
                          width={620}
                          height={420}
                        />
                      )}
                      <div className="resort-card-shade" />
                      <div className="resort-card-copy">
                        <h3>{resort.name}</h3>
                        <p>
                          <MapPin aria-hidden="true" />
                          {resort.location}
                        </p>
                        <div className="resort-card-tags">
                          {resort.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      </div>
                      <span className="resort-card-arrow" aria-hidden="true">
                        <ArrowRight />
                      </span>
                    </Link>
                    <button
                      aria-label={`${isFavorite ? "Remove" : "Add"} ${resort.name} ${
                        isFavorite ? "from" : "to"
                      } favorites`}
                      aria-pressed={isFavorite}
                      className={`resort-favorite${isFavorite ? " active" : ""}`}
                      onClick={() => toggleFavorite(resort.id)}
                      type="button"
                    >
                      <Heart aria-hidden="true" />
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="resorts-empty">No resorts are listed in this destination yet.</p>
          )}
        </section>
      </div>
    </Layout>
  );
}
