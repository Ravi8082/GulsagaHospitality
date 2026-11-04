import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  CalendarDays,
  Compass,
  Gem,
  MapPin,
  Waves,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/hotel-layout";
import { hotels, pageHead } from "@/lib/hotel-data";
import { useHomeContent, type HomeMedia, type HomeNetworkPartner } from "@/lib/home-content";
import resort from "@/assets/resort.jpg";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "Gulsaga Hospitality — Holidays, beautifully yours",
      "Discover curated Indian resorts, meaningful escapes and five-year Art Residency membership with Gulsaga Hospitality.",
    ),
  component: Index,
});

function requiredAt<T>(items: readonly T[], index: number, label: string): T {
  const item = items[index];

  if (item === undefined) {
    throw new Error(`Missing ${label} at index ${index}`);
  }

  return item;
}

function getMarqueePartners(partners: readonly HomeNetworkPartner[]): HomeNetworkPartner[] {
  if (partners.length === 0) {
    return [];
  }

  const targetLength = Math.max(8, partners.length);

  return Array.from({ length: targetLength }, (_, index) =>
    requiredAt(partners, index % partners.length, "network partner"),
  );
}

function Index() {
  const { content, isHidden } = useHomeContent();
  const { hero, network, about, membership, featured, invitation } = content;
  const marqueePartners = getMarqueePartners(network.partners);

  return (
    <Layout home>
      {!isHidden("home:hero") && (
        <section className="home-hero">
          <MediaVisual
            media={hero.image}
            className="hero-backdrop"
            alt="A tranquil luxury resort at dusk"
            priority
          />
          <div className="hero-shade" />
          <div className="hero-content">
            <p className="eyebrow light">{hero.eyebrow}</p>
            <h1>
              {hero.title}
              <br />
              <span>{hero.highlight}</span>
            </h1>
            <p className="hero-copy">{hero.description}</p>
            <div className="hero-buttons">
              <Button size="lg" asChild>
                <Link to="/membership/join">
                  {hero.primaryLabel} <ArrowRight />
                </Link>
              </Button>
              <Button variant="ghost" size="lg" asChild className="hero-secondary">
                <Link to="/destinations">
                  {hero.secondaryLabel} <ArrowUpRight />
                </Link>
              </Button>
            </div>
            <p className="hero-disclaimer">
              {hero.footnote} <Link to="/membership">View details</Link>
            </p>
          </div>
          <div className="hero-bottom">
            <span>{hero.scrollEyebrow}</span>
            <a href="#hospitality-network">
              {hero.scrollLabel} <ArrowDown size={15} />
            </a>
          </div>
          <div className="hero-perks" aria-label="Membership highlights">
            <div>
              <BedDouble />
              <span>
                {hero.perks[0]}
                <small>Places worth returning to</small>
              </span>
            </div>
            <div>
              <Gem />
              <span>
                {hero.perks[1]}
                <small>Thoughtful extras along the way</small>
              </span>
            </div>
            <div>
              <CalendarDays />
              <span>
                {hero.perks[2]}
                <small>One holiday every year</small>
              </span>
            </div>
          </div>
        </section>
      )}

      {!isHidden("home:network") && (
        <section className="home-network" id="hospitality-network">
          <div className="home-section-heading">
            <p className="eyebrow">{network.eyebrow}</p>
            <h2>{network.heading}</h2>
            <p>{network.description}</p>
          </div>
          {marqueePartners.length > 0 && (
            <div className="network-marquee" role="region" aria-label="Hospitality partners">
              {[marqueePartners, [...marqueePartners].reverse()].map((rowPartners, rowIndex) => {
                const decorativeRow = rowIndex === 1;
                const trackPartners = [...rowPartners, ...rowPartners];

                return (
                  <div
                    className={`network-marquee-row${decorativeRow ? " reverse" : ""}`}
                    key={rowIndex}
                  >
                    <div className="network-marquee-track" aria-hidden={decorativeRow}>
                      {trackPartners.map((partner, itemIndex) => {
                        const duplicate =
                          itemIndex >= network.partners.length || itemIndex >= rowPartners.length;
                        const decorativeCopy = decorativeRow || duplicate;

                        return (
                          <Link
                            aria-hidden={decorativeCopy}
                            className="network-partner-card"
                            key={`${rowIndex}-${itemIndex}-${partner.id}`}
                            tabIndex={decorativeCopy ? -1 : undefined}
                            to="/network"
                          >
                            <div className="network-partner-logo">
                              <MediaVisual media={partner.logo} alt={`${partner.name} logo`} />
                            </div>
                            <h3>{partner.name}</h3>
                            <span>ASSOCIATE PARTNER</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Button variant="outline" asChild>
            <Link to="/network">
              Explore partner network <ArrowRight />
            </Link>
          </Button>
        </section>
      )}

      {!isHidden("home:about") && (
        <section className="home-about" id="about-gulsaga">
          <div className="about-copy">
            <p className="eyebrow">{about.eyebrow}</p>
            <h2>{about.heading}</h2>
            <p className="about-intro">{about.description}</p>
            {about.services.map((service, index) => {
              const ServiceIcon = requiredAt([Gem, Compass, Waves], index, "service icon");
              return (
                <div className="about-detail" key={service.title}>
                  <span>
                    <ServiceIcon />
                  </span>
                  <div>
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                  </div>
                </div>
              );
            })}
            <Button size="lg" asChild>
              <Link to="/membership/join">
                {membership.cta} <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="about-gallery" aria-label="A look at Gulsaga stays">
            {about.images.map((media, index) => {
              const hotel = requiredAt(hotels, index, "hotel");

              return (
                <MediaVisual
                  key={hotel.id}
                  media={media}
                  alt={`${hotel.name}, ${hotel.location}`}
                  className={`about-image about-image-${index + 1}`}
                />
              );
            })}
            <div className="gallery-caption">
              <span>STAYS TO REMEMBER</span>
              <span>01 — 03</span>
            </div>
          </div>
        </section>
      )}

      {!isHidden("home:membership") && (
        <section className="home-membership">
          {membership.media && (
            <>
              <MediaVisual media={membership.media} alt="" className="membership-background" />
              <div className="membership-background-shade" />
            </>
          )}
          <div className="membership-copy">
            <p className="eyebrow light">{membership.eyebrow}</p>
            <h2>{membership.heading}</h2>
            <p>{membership.description}</p>
            <ul>
              {membership.benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
            <Button size="lg" asChild>
              <Link to="/membership/join">
                {membership.cta} <ArrowRight />
              </Link>
            </Button>
            <p className="membership-terms">{membership.termsNote}</p>
          </div>
          <div className="membership-stat">
            <span>{membership.metricHeading}</span>
            <strong>{membership.years}</strong>
            <p>
              years of holidays
              <br />
              to look forward to
            </p>
            <div className="membership-stat-rule" />
            <span>FIRST 100 MEMBERS</span>
            <p>{membership.refundTerms}</p>
          </div>
        </section>
      )}

      {!isHidden("home:featured") && (
        <section className="home-featured" id="featured-resort">
          <MediaVisual
            media={featured.media}
            alt="A private resort pool nestled between palm trees and calm waters"
          />
          <div className="featured-shade" />
          <div className="featured-copy">
            <p className="eyebrow light">{featured.eyebrow}</p>
            <h2>{featured.heading}</h2>
            <p>{featured.description}</p>
            <Link to="/resorts" className="featured-link">
              {featured.cta} <ArrowUpRight size={18} />
            </Link>
          </div>
          <span className="featured-location">
            <MapPin size={15} /> {featured.location}
          </span>
        </section>
      )}

      {!isHidden("home:invitation") && (
        <section className={invitation.media ? "home-invitation has-media" : "home-invitation"}>
          {invitation.media && (
            <>
              <MediaVisual media={invitation.media} alt="" className="invitation-background" />
              <div className="invitation-background-shade" />
            </>
          )}
          <div className="home-invitation-copy">
            <p className="eyebrow">{invitation.eyebrow}</p>
            <h2>{invitation.heading}</h2>
            <p>{invitation.description}</p>
          </div>
          <Button size="lg" asChild>
            <Link to="/contact" search={{ hotel: "" }}>
              {invitation.cta} <ArrowUpRight />
            </Link>
          </Button>
        </section>
      )}
    </Layout>
  );
}

function MediaVisual({
  media,
  alt,
  className,
  priority = false,
}: {
  media: HomeMedia;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [imageSource, setImageSource] = useState(media.src);

  useEffect(() => {
    setImageSource(media.src);
  }, [media.src]);

  if (media.type === "video") {
    return (
      <video
        className={className}
        src={media.src}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        aria-label={alt}
      />
    );
  }

  return (
    <img
      className={className}
      src={imageSource}
      alt={alt}
      width={1536}
      height={1024}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      onError={() => {
        setImageSource((current) => (current === resort ? current : resort));
      }}
    />
  );
}
