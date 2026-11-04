import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CirclePlay,
  MapPin,
  Navigation,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/hotel-layout";
import { DestinationPitch } from "@/components/destination-pitch";
import { PreviewImage } from "@/components/preview-image";
import { useHomeContent, type HomeMedia } from "@/lib/home-content";
import { pageHead } from "@/lib/hotel-data";

export const Route = createFileRoute("/resorts/$resortId")({
  head: () => pageHead("Resort details", "Explore a Gulsaga resort and enquire about your stay."),
  component: ResortDetails,
});

function ResortDetails() {
  const { resortId } = Route.useParams();
  const { resorts } = useHomeContent();
  const resort = resorts.find((item) => item.id === resortId);
  const [selectedMedia, setSelectedMedia] = useState<HomeMedia | null>(null);
  const [checkIn, setCheckIn] = useState("");

  if (!resort) {
    return (
      <Layout resortMode>
        <section className="resort-detail-not-found">
          <p className="eyebrow">STAY NOT FOUND</p>
          <h1>This resort is not in the collection.</h1>
          <Button variant="outline" asChild>
            <Link to="/resorts">
              <ArrowLeft /> Back to resorts
            </Link>
          </Button>
        </section>
      </Layout>
    );
  }

  function localDateString(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function nextDateString(date: string) {
    const [year, month, day] = date.split("-").map(Number);
    const nextDate = new Date(year ?? 0, (month ?? 1) - 1, (day ?? 1) + 1);
    return localDateString(nextDate);
  }

  const detail = resort.detail;
  const heroMedia =
    detail.gallery.find((media) => media.src === selectedMedia?.src) ??
    (detail.video?.src === selectedMedia?.src ? detail.video : null) ??
    detail.gallery[0] ??
    resort.media;
  const imageAlt = heroMedia.name || `${resort.name}, ${resort.location}`;
  const mapQuery = encodeURIComponent(`${resort.name}, ${resort.location}`);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
  const handleAvailabilityEnquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const subject = encodeURIComponent(`Availability enquiry — ${resort.name}`);
    const body = encodeURIComponent(
      [
        `Resort: ${resort.name}`,
        `Check-in: ${formData.get("checkIn")}`,
        `Check-out: ${formData.get("checkOut")}`,
        `Guests: ${formData.get("guests")}`,
        "",
        "Please confirm current availability, room options and applicable membership terms.",
      ].join("\n"),
    );
    window.location.href = `mailto:LuxuryTravel@gulsaga.com?subject=${subject}&body=${body}`;
  };

  return (
    <Layout resortMode>
      <div className="resort-detail-page">
        <div className="resort-detail-breadcrumb">
          <Link to="/resorts">Resorts</Link>
          <ChevronRight size={13} />
          <Link to="/destinations">{resort.region}</Link>
          <ChevronRight size={13} />
          <span>{resort.name}</span>
        </div>

        <section className="resort-detail-hero">
          <div className="resort-detail-gallery">
            <div className="resort-detail-main-image">
              {heroMedia.type === "video" ? (
                <video
                  aria-label={imageAlt}
                  controls
                  playsInline
                  preload="metadata"
                  src={heroMedia.src}
                />
              ) : (
                <PreviewImage
                  src={heroMedia.src}
                  alt={imageAlt}
                  width={1300}
                  height={780}
                  loading="eager"
                />
              )}
              <div className="resort-detail-image-shade" />
              <span className="resort-detail-photo-count">
                <Camera size={15} /> Illustrative preview · confirm property imagery
              </span>
            </div>
            <div className="resort-detail-side-images">
              {detail.gallery.slice(0, 3).map((media, index) => (
                <button
                  aria-label={`View gallery image ${index + 1}: ${media.name}`}
                  aria-pressed={heroMedia.src === media.src}
                  className="resort-detail-gallery-thumb"
                  key={`${media.src}-${index}`}
                  onClick={() => setSelectedMedia(media)}
                  type="button"
                >
                  {media.type === "video" ? (
                    <span className="resort-detail-video-thumb">
                      <CirclePlay size={24} /> Video preview
                    </span>
                  ) : (
                    <PreviewImage
                      src={media.src}
                      alt={`${media.name} - resort gallery preview`}
                      width={360}
                      height={220}
                      loading="lazy"
                    />
                  )}
                  <span>{index === 0 ? "Property" : `Gallery ${index + 1}`}</span>
                </button>
              ))}
              {detail.video && (
                <button
                  aria-label="View resort video"
                  aria-pressed={heroMedia.src === detail.video.src}
                  className="resort-detail-gallery-thumb resort-detail-video-button"
                  onClick={() => setSelectedMedia(detail.video)}
                  type="button"
                >
                  <CirclePlay size={25} />
                  <span>Resort video</span>
                </button>
              )}
            </div>
          </div>

          <div className="resort-detail-summary">
            <p className="eyebrow">{detail.category || "CURATED STAY"}</p>
            <h1>{resort.name}</h1>
            <p className="resort-detail-location">
              <MapPin size={16} /> {resort.location}
            </p>
            {detail.verifiedPartner ? (
              <span className="resort-detail-verified">
                <BadgeCheck size={15} /> Verified Gulsaga partner
              </span>
            ) : (
              <div className="resort-detail-trust-note">
                <ShieldCheck size={17} />
                <span>Property details and partner verification are confirmed on enquiry.</span>
              </div>
            )}
            <p className="resort-detail-summary-copy">{resort.description}</p>
            <div className="resort-detail-tags">
              {resort.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <div className="resort-detail-summary-actions">
              <Button size="lg" asChild>
                <Link to="/contact" search={{ hotel: resort.name }}>
                  Enquire about this stay <ArrowRight />
                </Link>
              </Button>
              <Link to="/contact" search={{ hotel: resort.name }}>
                <CalendarDays size={16} /> Ask about availability
              </Link>
            </div>
            <p className="resort-detail-no-rating">
              <Star size={15} /> Guest ratings appear when verified reviews are available.
            </p>
          </div>
        </section>

        <nav className="resort-detail-nav" aria-label="Resort details">
          {[
            ["Overview", "#overview"],
            ["Rooms & suites", "#rooms"],
            ["Amenities", "#amenities"],
            ["Experiences", "#experiences"],
            ["Location", "#location"],
            ["Nearby", "#getting-here"],
            ["Reviews", "#reviews"],
          ].map(([label, href]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </nav>

        <main className="resort-detail-content">
          <div className="resort-detail-primary">
            <DestinationPitch place={`${resort.region} ${resort.location}`} />
            <section className="resort-detail-section" id="overview">
              <p className="eyebrow">A GULSAGA STAY</p>
              <h2>The {resort.name} experience</h2>
              <p>{detail.longDescription}</p>
              <p className="resort-detail-preview-disclaimer">
                This page is a property preview. Confirm exact facilities, inclusions and
                availability with Gulsaga before making travel plans.
              </p>
            </section>

            <section className="resort-detail-section" id="rooms">
              <div className="resort-detail-section-heading">
                <div>
                  <p className="eyebrow">STAY YOUR WAY</p>
                  <h2>Rooms & suites</h2>
                </div>
                <span>Details confirmed on enquiry</span>
              </div>
              <div className="resort-detail-rooms">
                {detail.rooms.map((room, index) => (
                  <article className="resort-detail-room-card" key={`${room.name}-${index}`}>
                    <div className="resort-detail-room-image">
                      <PreviewImage
                        src={room.image.src}
                        alt={`${room.name} illustrative room preview`}
                        width={500}
                        height={300}
                        loading="lazy"
                      />
                      <span>Room preview</span>
                    </div>
                    <div className="resort-detail-room-copy">
                      <h3>{room.name}</h3>
                      <p className="resort-detail-room-capacity">
                        <UsersRound size={13} /> {room.capacity}
                      </p>
                      <p>{room.description}</p>
                      <div className="resort-detail-room-amenities">
                        {room.amenities.map((amenity) => (
                          <span key={amenity}>{amenity}</span>
                        ))}
                      </div>
                      <div className="resort-detail-room-footer">
                        <span>
                          {room.previewOnly
                            ? "Sample details · confirm with property"
                            : "Rate confirmed on enquiry"}
                        </span>
                        <Link to="/contact" search={{ hotel: resort.name }}>
                          Enquire <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <p className="resort-detail-preview-disclaimer">
                No nightly prices are shown because verified live rates are not connected in this
                preview.
              </p>
            </section>

            <section className="resort-detail-section" id="amenities">
              <p className="eyebrow">PROPERTY DETAILS</p>
              <h2>Facilities & amenities</h2>
              <div className="resort-detail-amenities">
                {detail.amenities.map((amenity) => (
                  <div key={amenity}>
                    <Check size={18} />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
              <p className="resort-detail-preview-disclaimer">
                Items marked to confirm are not verified on-site facilities.
              </p>
            </section>

            <section className="resort-detail-section" id="experiences">
              <p className="eyebrow">MAKE IT MEMORABLE</p>
              <h2>Experiences to explore</h2>
              <div className="resort-detail-experiences">
                {detail.experiences.map((experience, index) => (
                  <article className="resort-detail-experience-card" key={experience}>
                    <PreviewImage
                      src={
                        detail.gallery[index % Math.max(detail.gallery.length, 1)]?.src ??
                        resort.media.src
                      }
                      alt={`${experience} illustrative preview`}
                      width={500}
                      height={260}
                      loading="lazy"
                    />
                    <div>
                      <Sparkles size={15} />
                      <span>{experience}</span>
                    </div>
                  </article>
                ))}
              </div>
              <p className="resort-detail-preview-disclaimer">
                Experience ideas are illustrative; confirm what the property offers and seasonal
                availability.
              </p>
            </section>

            <section className="resort-detail-section" id="getting-here">
              <p className="eyebrow">PLAN YOUR JOURNEY</p>
              <h2>Nearby & how to reach</h2>
              <ul className="resort-detail-nearby-list">
                {detail.nearbyAttractions.map((place) => (
                  <li key={place}>
                    <MapPin size={15} /> {place}
                  </li>
                ))}
              </ul>
              <p>{detail.howToReach}</p>
              <a
                className="resort-detail-directions-link"
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation size={15} /> Open route search <ArrowUpRight size={14} />
              </a>
            </section>
          </div>

          <aside className="resort-detail-sidebar">
            <section className="resort-detail-location-card" id="location">
              <p className="eyebrow">FIND YOUR WAY</p>
              <h2>Location</h2>
              <p>
                <MapPin size={15} /> {resort.name}, {resort.location}
              </p>
              <div className="resort-detail-map-preview">
                <MapPin size={30} />
                <span>Map search preview</span>
              </div>
              <a href={mapUrl} target="_blank" rel="noreferrer">
                Search on Google Maps <ArrowUpRight size={15} />
              </a>
              <small>Map search results may not indicate an exact property pin.</small>
            </section>

            <section className="resort-detail-review-card" id="reviews">
              <p className="eyebrow">GUEST VOICES</p>
              <h2>Guest reviews</h2>
              <div className="resort-detail-review-empty">
                <BadgeCheck size={24} />
                <strong>No verified reviews yet</strong>
                <p>Guest ratings and verified-stay reviews will appear here when available.</p>
              </div>
              <Link to="/experiences">
                Explore member stories <ArrowRight size={14} />
              </Link>
              <p className="resort-detail-preview-disclaimer">
                Only approved community stories are shown as reviews; a stay is never marked
                verified without booking confirmation.
              </p>
            </section>

            <section className="resort-detail-availability-card">
              <p className="eyebrow">PLAN A STAY</p>
              <h2>Check availability</h2>
              <form onSubmit={handleAvailabilityEnquiry}>
                <label>
                  Check-in
                  <input
                    min={localDateString(new Date())}
                    name="checkIn"
                    onChange={(event) => setCheckIn(event.currentTarget.value)}
                    onInput={(event) => setCheckIn(event.currentTarget.value)}
                    type="date"
                    required
                  />
                </label>
                <label>
                  Check-out
                  <input
                    min={checkIn ? nextDateString(checkIn) : localDateString(new Date())}
                    name="checkOut"
                    type="date"
                    required
                  />
                </label>
                <label>
                  Guests
                  <select name="guests" defaultValue="2 adults">
                    <option>1 adult</option>
                    <option>2 adults</option>
                    <option>2 adults, 1 child</option>
                    <option>2 adults, 2 children</option>
                    <option>3+ guests - confirm with Gulsaga</option>
                  </select>
                </label>
                <Button type="submit">
                  Ask about availability <ArrowRight size={15} />
                </Button>
              </form>
              <small>This opens an email enquiry; live availability is not connected here.</small>
            </section>

            <section className="resort-detail-membership-card">
              <div className="resort-detail-membership-copy">
                <p className="eyebrow">GULSAGA MEMBERSHIP</p>
                <h2>Make more of every escape.</h2>
                <ul>
                  {detail.membershipBenefits.map((benefit) => (
                    <li key={benefit}>
                      <Check size={14} /> {benefit}
                    </li>
                  ))}
                </ul>
                <Link to="/membership">
                  Explore membership <ArrowRight size={15} />
                </Link>
              </div>
            </section>
          </aside>
        </main>

        <section className="resort-detail-footer">
          <div>
            <p className="eyebrow">PLAN YOUR NEXT ESCAPE</p>
            <h2>Curious about {resort.name}?</h2>
            <p>Tell us what you have in mind and our team can help you explore this stay.</p>
          </div>
          <Button size="lg" asChild>
            <Link to="/contact" search={{ hotel: resort.name }}>
              Enquire with Gulsaga <ArrowRight />
            </Link>
          </Button>
        </section>
      </div>
    </Layout>
  );
}
