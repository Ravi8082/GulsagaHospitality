import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Binoculars,
  Clock,
  Leaf,
  MapPin,
  Mountain,
  Plane,
  Play,
  Star,
  Sun,
  Thermometer,
  TrainFront,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/hotel-layout";
import { PreviewImage } from "@/components/preview-image";
import { useHomeContent } from "@/lib/home-content";
import type { HomeMedia } from "@/lib/home-content";
import { destinationSlug, findDestination } from "@/lib/destination-data";
import { pageHead } from "@/lib/hotel-data";

export const Route = createFileRoute("/destinations/$destinationId")({
  head: () =>
    pageHead("Destination details", "Explore a Gulsaga destination, its places and partner stays."),
  component: DestinationDetails,
});

const highlightIcons = [Waves, Leaf, Mountain, Binoculars];

function MediaView({ media, eager = false }: { media: HomeMedia; eager?: boolean }) {
  return media.type === "video" ? (
    <video aria-label={media.name} controls muted playsInline preload="none" src={media.src} />
  ) : (
    <PreviewImage
      src={media.src}
      alt={media.name}
      width={900}
      height={600}
      loading={eager ? "eager" : "lazy"}
    />
  );
}

function DestinationDetails() {
  const { destinationId } = Route.useParams();
  const { destinations, resorts } = useHomeContent();
  const destination = findDestination(destinations, destinationId);

  if (!destination) {
    return (
      <Layout>
        <section className="destination-not-found">
          <p className="eyebrow">DESTINATION NOT FOUND</p>
          <h1>This destination is not in the collection.</h1>
          <Button variant="outline" asChild>
            <Link to="/destinations">
              <ArrowLeft /> Back to destinations
            </Link>
          </Button>
        </section>
      </Layout>
    );
  }

  const detail = destination.detail ?? {};
  const savedStays = (detail.stays ?? []).filter((stay) => stay.name);
  const stays = savedStays.length
    ? savedStays
    : resorts
        .filter((resort) => resort.region.toLowerCase() === destination.name.toLowerCase())
        .map((resort) => ({
          name: resort.name,
          location: resort.location,
          rating: 0,
          reviews: 0,
          price: "",
          media: resort.media as HomeMedia | null,
        }));
  const similar = destinations.filter((item) => item.id !== destination.id).slice(0, 3);
  const places = (detail.places ?? []).filter((place) => place.name);
  const experiences = (detail.experiences ?? []).filter(Boolean);
  const gallery = (detail.gallery ?? []).filter((item) => item.src);
  const faqs = (detail.faqs ?? []).filter((faq) => faq.question);
  const reviews = (detail.reviews ?? []).filter((review) => review.text);
  const nearby = detail.nearbyPlaces?.length ? detail.nearbyPlaces : places.map((p) => p.name);
  const facts = [
    { icon: Sun, label: "Best time to visit", value: detail.bestTime },
    { icon: Thermometer, label: "Weather", value: detail.weather },
    { icon: Plane, label: "Nearest airport", value: detail.nearestAirport },
    { icon: TrainFront, label: "Nearest railway", value: detail.nearestRailway },
    { icon: Clock, label: "Ideal trip duration", value: detail.idealDuration },
  ].filter((fact) => fact.value);
  const hasTravelInfo = Boolean(detail.howToReach || detail.localTransport);
  const lat = detail.latitude;
  const lng = detail.longitude;
  const hasMap = typeof lat === "number" && typeof lng === "number";
  const aboutMedia = detail.video ?? gallery[0] ?? null;

  return (
    <Layout home>
      <div className="dd-page">
        <section className="dd-hero">
          {destination.media.type === "video" ? (
            <video
              aria-label={destination.media.name}
              autoPlay
              loop
              muted
              playsInline
              src={destination.media.src}
            />
          ) : (
            <PreviewImage
              src={destination.media.src}
              alt={destination.media.name}
              width={1920}
              height={1080}
              loading="eager"
            />
          )}
          <div className="dd-hero-shade" />
          <div className="dd-hero-copy">
            <Link className="dd-back" to="/destinations">
              <ArrowLeft size={16} /> All destinations
            </Link>
            <p className="dd-eyebrow">EXPLORE DESTINATION</p>
            <h1>{destination.name}</h1>
            <p className="dd-tagline">{detail.tagline || destination.subtitle}</p>
            <p className="dd-intro">{destination.description}</p>
            <div className="dd-actions">
              <a className="dd-gold" href="#dd-resorts">
                Explore Resorts <ArrowRight size={16} />
              </a>
              {detail.video ? (
                <a className="dd-ghost" href="#dd-video">
                  <Play size={15} /> Watch Destination Video
                </a>
              ) : null}
            </div>
          </div>
          {detail.highlights?.length ? (
            <ul className="dd-highlights">
              {detail.highlights.map((item, index) => {
                const Icon = highlightIcons[index % highlightIcons.length] ?? Leaf;
                return (
                  <li key={item}>
                    <Icon size={22} /> {item}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        <section className="dd-section dd-about">
          <div>
            <h2>About {destination.name}</h2>
            <p>{detail.story || destination.description}</p>
          </div>
          {facts.length ? (
            <div className="dd-facts">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label}>
                  <Icon size={24} />
                  <span>
                    <small>{label}</small>
                    <strong>{value}</strong>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          {aboutMedia ? (
            <div className="dd-video" id="dd-video">
              <MediaView media={aboutMedia} />
              {aboutMedia.type === "image" ? (
                <span className="dd-play">
                  <Play size={26} />
                </span>
              ) : null}
            </div>
          ) : null}
        </section>

        {places.length ? (
          <section className="dd-section">
            <h2>Top Attractions in {destination.name}</h2>
            <div className="dd-grid dd-grid-4">
              {places.map((place) => (
                <article className="dd-card" key={place.name}>
                  {place.media ? <MediaView media={place.media} /> : null}
                  <div className="dd-card-row">
                    <div>
                      <h3>{place.name}</h3>
                      <p>{place.description}</p>
                    </div>
                    <span className="dd-arrow">
                      <ArrowRight size={16} />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="dd-section" id="dd-resorts">
          <div className="dd-head-row">
            <div>
              <h2>Stay in Nature&apos;s Lap</h2>
              <p className="dd-sub">Handpicked resorts in {destination.name}</p>
            </div>
            <Link className="dd-pill" to="/resorts">
              View All Resorts
            </Link>
          </div>
          {stays.length ? (
            <div className="dd-grid dd-grid-3">
              {stays.map((stay) => (
                <article className="dd-card" key={stay.name}>
                  {stay.media ? <MediaView media={stay.media} /> : null}
                  <div className="dd-card-row">
                    <div>
                      <h3>{stay.name}</h3>
                      {stay.rating ? (
                        <p className="dd-rating">
                          <Star size={14} fill="currentColor" /> {stay.rating.toFixed(1)} (
                          {stay.reviews} Reviews)
                        </p>
                      ) : (
                        <p className="dd-meta">
                          <MapPin size={14} /> {stay.location}
                        </p>
                      )}
                      {stay.price ? <p className="dd-price">From {stay.price} / night</p> : null}
                    </div>
                    <Link className="dd-arrow" to="/resorts" aria-label={`View ${stay.name}`}>
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="dd-empty">
              Partner resorts for this destination will be listed here soon.
            </p>
          )}
        </section>

        {experiences.length ? (
          <section className="dd-section">
            <h2>Experiences You&apos;ll Love</h2>
            <ul className="dd-experiences">
              {experiences.map((item, index) => {
                const image = gallery.length ? gallery[index % gallery.length] : null;
                return (
                  <li key={item}>
                    {image ? (
                      <PreviewImage src={image.src} alt="" width={120} height={120} />
                    ) : null}
                    <span>{item}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {gallery.length ? (
          <section className="dd-section">
            <h2>Destination Gallery</h2>
            <div className="dd-gallery">
              {gallery.map((item, index) => (
                <MediaView key={`${item.src}-${index}`} media={item} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="dd-section">
          <h2>Member Experiences &amp; Reviews</h2>
          {reviews.length ? (
            <div className="dd-grid dd-grid-3">
              {reviews.map((review) => (
                <figure className="dd-review" key={review.name}>
                  <span className="dd-avatar">{review.name.charAt(0)}</span>
                  <blockquote>&ldquo;{review.text}&rdquo;</blockquote>
                  <figcaption>
                    <strong>{review.name}</strong>
                    <span className="dd-rating">
                      <Star size={14} fill="currentColor" /> {review.rating.toFixed(1)}
                    </span>
                    <small>{review.role}</small>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p>Verified member reviews and photos appear after admin approval.</p>
          )}
          <div className="dd-actions">
            <Link className="dd-gold" to="/experiences/share" search={{ edit: undefined }}>
              Share Your Experience
            </Link>
          </div>
        </section>

        {hasMap || nearby.length ? (
          <section className="dd-section">
            <h2>Explore on Map</h2>
            <div className="dd-map-wrap">
              {hasMap ? (
                <iframe
                  className="dd-map"
                  title={`${destination.name} map`}
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.6}%2C${lat - 0.4}%2C${lng + 0.6}%2C${lat + 0.4}&layer=mapnik&marker=${lat}%2C${lng}`}
                />
              ) : null}
              <ul className="dd-pins">
                <li>
                  <MapPin size={16} /> {destination.location}
                </li>
                {nearby.map((name) => (
                  <li key={name}>
                    <MapPin size={16} /> {name}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {hasTravelInfo ? (
          <section className="dd-section">
            <h2>Travel Information</h2>
            {detail.howToReach ? (
              <p>
                <strong>How to reach: </strong>
                {detail.howToReach}
              </p>
            ) : null}
            {detail.localTransport ? (
              <p>
                <strong>Local transport: </strong>
                {detail.localTransport}
              </p>
            ) : null}
          </section>
        ) : null}

        {faqs.length ? (
          <section className="dd-section">
            <h2>Frequently Asked Questions</h2>
            {faqs.map((faq) => (
              <details className="dd-faq" key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </section>
        ) : null}

        <section className="dd-cta">
          <h2>Your Next Escape Awaits</h2>
          <p>
            Discover exclusive stays and memorable experiences in {destination.name} with Gulsaga
            Hospitality.
          </p>
          <div className="dd-actions">
            <Link className="dd-gold" to="/resorts">
              Explore Partner Resorts
            </Link>
            <Link className="dd-ghost" to="/membership">
              Explore Membership Benefits
            </Link>
            <Link className="dd-ghost" to="/contact" search={{ hotel: destination.resortName }}>
              Travel Enquiry
            </Link>
          </div>
        </section>

        {similar.length ? (
          <section className="dd-section">
            <h2>Similar Destinations</h2>
            <div className="dd-grid dd-grid-3">
              {similar.map((item) => (
                <Link
                  className="dd-card"
                  key={item.id}
                  to="/destinations/$destinationId"
                  params={{ destinationId: destinationSlug(item) }}
                >
                  <MediaView media={item.media} />
                  <div className="dd-card-row">
                    <div>
                      <h3>{item.name}</h3>
                      <p>{item.subtitle}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </Layout>
  );
}
