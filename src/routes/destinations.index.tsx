import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BedDouble,
  BriefcaseBusiness,
  Flower2,
  Heart,
  Leaf,
  Map,
  MapPin,
  Mountain,
  Waves,
} from "lucide-react";
import { useState } from "react";
import { Layout } from "@/components/hotel-layout";
import { PreviewImage } from "@/components/preview-image";
import { useHomeContent } from "@/lib/home-content";
import { destinationSlug } from "@/lib/destination-data";
import { pageHead } from "@/lib/hotel-data";

const featuredCategories = [
  "All Destinations",
  "Mountains",
  "Beaches",
  "Nature Retreats",
  "Heritage",
  "Art & Culture",
];

export const Route = createFileRoute("/destinations/")({
  head: () =>
    pageHead(
      "Destinations",
      "Explore Gulsaga destinations, from Himalayan mountain retreats to coastal stays and heritage resorts.",
    ),
  component: Destinations,
});

function Destinations() {
  const { destinations, destinationPageContent, isHidden } = useHomeContent();
  const [activeCategory, setActiveCategory] = useState("All Destinations");
  const categories = [
    "All Destinations",
    ...new Set([
      ...featuredCategories.filter((category) => category !== "All Destinations"),
      ...destinations.flatMap((destination) => destination.categories),
    ]),
  ];
  const filteredDestinations =
    activeCategory === "All Destinations"
      ? destinations
      : destinations.filter((destination) => destination.categories.includes(activeCategory));

  return (
    <Layout home>
      <div className="reference-destinations-page">
        {!isHidden("destinations:hero") && (
          <section className="reference-destination-hero">
            {destinationPageContent.heroMedia.type === "video" ? (
              <video
                aria-label={destinationPageContent.heroMedia.name}
                autoPlay
                className="reference-destination-hero-media"
                loop
                muted
                playsInline
                preload="none"
                src={destinationPageContent.heroMedia.src}
              />
            ) : (
              <PreviewImage
                src={destinationPageContent.heroMedia.src}
                alt="Luxury mountain resort and infinity pool at sunset"
                width={1920}
                height={610}
                loading="eager"
              />
            )}
            <div className="reference-destination-hero-shade" />
            <div className="reference-destination-hero-copy">
              <p className="eyebrow">{destinationPageContent.eyebrow}</p>
              <h1>{destinationPageContent.heading}</h1>
              <p>{destinationPageContent.description}</p>
              <div className="reference-destination-hero-actions">
                <a className="reference-gold-button" href="#all-destinations">
                  {destinationPageContent.primaryLabel} <ArrowRight size={17} />
                </a>
                <a
                  className="reference-watch-link"
                  href="/hotels"
                  aria-label={`${destinationPageContent.secondaryLabel}: explore our resort experiences`}
                >
                  <span aria-hidden="true">â–¶</span>
                  {destinationPageContent.secondaryLabel}
                </a>
              </div>
            </div>
          </section>
        )}

        {!isHidden("destinations:highlights") && (
          <section className="reference-destination-highlights" aria-label="Gulsaga experiences">
            <div className="reference-destination-highlights-inner">
              <div>
                <BedDouble />
                <span>Luxury Stays</span>
              </div>
              <div>
                <Flower2 />
                <span>Art Residencies</span>
              </div>
              <div>
                <Heart />
                <span>Destination Weddings</span>
              </div>
              <div>
                <Mountain />
                <span>Curated Holiday Experiences</span>
              </div>
            </div>
          </section>
        )}

        {!isHidden("destinations:collection") && (
          <section className="reference-destination-collection" id="all-destinations">
            <div className="reference-destination-title">
              <span />
              <h2>{destinationPageContent.collectionHeading}</h2>
              <span />
            </div>

            <div
              className="reference-destination-filters"
              aria-label="Filter destinations by category"
            >
              {categories.map((category) => (
                <button
                  aria-pressed={activeCategory === category}
                  className={activeCategory === category ? "active" : ""}
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  type="button"
                >
                  {category === "All Destinations" ? null : category === "Mountains" ? (
                    <Mountain />
                  ) : category === "Beaches" ? (
                    <Waves />
                  ) : category === "Nature Retreats" ? (
                    <Leaf />
                  ) : category === "Heritage" ? (
                    <BriefcaseBusiness />
                  ) : category === "Art & Culture" ? (
                    <Flower2 />
                  ) : (
                    <MapPin />
                  )}
                  {category}
                </button>
              ))}
            </div>

            {filteredDestinations.length > 0 ? (
              <div className="reference-destination-cards">
                {filteredDestinations.map((destination) => (
                  <Link
                    aria-label={`Explore ${destination.name}: ${destination.subtitle}`}
                    className="reference-destination-card"
                    key={destination.id}
                    params={{ destinationId: destinationSlug(destination) }}
                    to="/destinations/$destinationId"
                  >
                    {destination.media.type === "video" ? (
                      <video
                        aria-label={destination.media.name}
                        className="reference-destination-card-media"
                        controls
                        loop
                        muted
                        playsInline
                        preload="none"
                        src={destination.media.src}
                      />
                    ) : (
                      <PreviewImage
                        src={destination.media.src}
                        alt={destination.media.name}
                        width={620}
                        height={420}
                      />
                    )}
                    <div className="reference-destination-card-shade" />
                    <div className="reference-destination-card-copy">
                      <h3>{destination.name}</h3>
                      <p>
                        <MapPin aria-hidden="true" />
                        {destination.subtitle}
                      </p>
                    </div>
                    <span className="reference-destination-card-arrow">
                      <ArrowRight aria-hidden="true" />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="destination-empty">No destinations match this category yet.</p>
            )}
          </section>
        )}

        {!isHidden("destinations:map") && (
          <section
            aria-label="Explore destinations on the map"
            className="reference-destination-map"
            id="destination-map"
          >
            {destinationPageContent.mapImage.type === "video" ? (
              <video
                aria-label={destinationPageContent.mapImage.name}
                className="reference-destination-map-media"
                controls
                loop
                muted
                playsInline
                preload="none"
                src={destinationPageContent.mapImage.src}
              />
            ) : (
              <PreviewImage
                src={destinationPageContent.mapImage.src}
                alt="A cinematic mountain map highlighting Gulsaga destinations across India"
                width={1920}
                height={300}
              />
            )}
            <div className="reference-destination-map-shade" />
            <a className="reference-map-card" href="#all-destinations">
              <Map aria-hidden="true" />
              <span>
                <strong>Explore on Map</strong>
                <small>
                  Discover all our destinations
                  <br />
                  across India and beyond.
                </small>
              </span>
              <ArrowRight aria-hidden="true" />
            </a>
          </section>
        )}
      </div>
    </Layout>
  );
}
