import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BedDouble,
  Check,
  ChevronDown,
  Compass,
  Gem,
  Globe2,
  Handshake,
  HeartHandshake,
  MapPin,
  Mountain,
  ShieldCheck,
  Sparkles,
  Waves,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/hotel-layout";
import { useHomeContent, type HomeNetworkPartner } from "@/lib/home-content";
import { destinationSlug, type Destination } from "@/lib/destination-data";
import { pageHead } from "@/lib/hotel-data";

type PartnerCategory =
  "Luxury Hotels" | "Resorts" | "Boutique Stays" | "Wellness" | "Wedding Venues";

const categories: Array<{ label: string; icon: typeof BedDouble }> = [
  { label: "All Partners", icon: Globe2 },
  { label: "Luxury Hotels", icon: Gem },
  { label: "Resorts", icon: Waves },
  { label: "Boutique Stays", icon: Sparkles },
  { label: "Wellness", icon: HeartHandshake },
  { label: "Wedding Venues", icon: Compass },
];

const travellerValueIcons = [Compass, Gem, ShieldCheck] as const;
const partnerValueIcons = [Globe2, Sparkles, HeartHandshake] as const;

const partnerCategories: Record<string, PartnerCategory[]> = {
  ihg: ["Luxury Hotels", "Resorts", "Boutique Stays", "Wellness", "Wedding Venues"],
  "six-senses": ["Luxury Hotels", "Resorts", "Wellness", "Wedding Venues"],
  regent: ["Luxury Hotels", "Resorts"],
  intercontinental: ["Luxury Hotels", "Wedding Venues"],
  "vignette-collection": ["Luxury Hotels", "Boutique Stays"],
  kimpton: ["Luxury Hotels", "Boutique Stays", "Wedding Venues"],
  "hotel-indigo": ["Boutique Stays"],
  voco: ["Luxury Hotels", "Boutique Stays"],
  hualuxe: ["Luxury Hotels", "Wellness"],
  "crowne-plaza": ["Luxury Hotels", "Wedding Venues"],
  iberostar: ["Resorts", "Wellness", "Wedding Venues"],
  even: ["Wellness"],
  "holiday-inn-express": ["Resorts"],
  "holiday-inn": ["Resorts", "Wedding Venues"],
  avid: ["Boutique Stays"],
  "atwell-suites": ["Boutique Stays"],
  "staybridge-suites": ["Resorts"],
  "holiday-inn-club-vacations": ["Resorts", "Wedding Venues"],
  "candlewood-suites": ["Resorts"],
};

const partnerDescriptions: Record<string, string> = {
  ihg: "A global hospitality group bringing together a diverse portfolio of hotel experiences.",
  "six-senses": "Distinctive retreats shaped by thoughtful wellbeing and a strong sense of place.",
  regent: "Refined stays with considered design, attentive service and memorable settings.",
  intercontinental: "World-spanning hotels for guests seeking comfort, culture and connection.",
  "vignette-collection": "Distinctive independent-minded hotels, each with its own character.",
  kimpton: "Boutique hospitality known for expressive design and warm, personal service.",
  "hotel-indigo": "Neighbourhood-inspired hotels rooted in the character of their locations.",
  voco: "Welcoming stays with a relaxed spirit and thoughtful touches.",
  hualuxe: "Contemporary luxury hospitality inspired by local traditions and culture.",
  "crowne-plaza": "Full-service hotels suited to meaningful gatherings and well-planned stays.",
  iberostar: "Resort experiences with a focus on coastal escapes and responsible tourism.",
  even: "Wellbeing-minded hospitality designed to help guests keep their balance while away.",
  "holiday-inn-express": "Straightforward, comfortable stays for easy travel.",
  "holiday-inn": "Familiar hospitality for getaways, family trips and celebrations.",
  avid: "Modern essentials and an uncomplicated guest experience.",
  "atwell-suites": "Flexible, suite-style accommodation for longer and more independent stays.",
  "staybridge-suites": "Extended-stay suites designed to feel comfortable over time.",
  "holiday-inn-club-vacations": "Resort-style vacation stays for families and longer breaks.",
  "candlewood-suites": "Practical extended-stay suites with room to settle in.",
};

const curatingPillars = [
  {
    icon: BedDouble,
    title: "Quality & Experience",
    description: "Handpicked hospitality brands with a focus on guest experience.",
  },
  {
    icon: Mountain,
    title: "Diverse Destinations",
    description: "Mountain, coast, heritage and restorative escapes.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted Partner Brands",
    description: "Explore the partner brands in Gulsaga's hospitality collection.",
  },
  {
    icon: Gem,
    title: "Member-First Benefits",
    description: "Discover member privileges available through your membership.",
  },
];

function getCategories(partner: HomeNetworkPartner): PartnerCategory[] {
  return partnerCategories[partner.id] ?? ["Boutique Stays"];
}

function getDescription(partner: HomeNetworkPartner) {
  return (
    partnerDescriptions[partner.id] ?? "Explore this hospitality brand in the Gulsaga network."
  );
}

function PartnerLogo({ partner }: { partner: HomeNetworkPartner }) {
  return <img src={partner.logo.src} alt={`${partner.name} logo`} loading="lazy" />;
}

export const Route = createFileRoute("/network")({
  head: () =>
    pageHead(
      "Our Hospitality Network",
      "Explore Gulsaga's hospitality partner brands, destination collection and curated stays.",
    ),
  component: NetworkPage,
});

function NetworkPage() {
  const { content, networkPageContent, destinations } = useHomeContent();
  const partners = content.network.partners;
  const [category, setCategory] = useState("All Partners");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("All destinations");
  const [propertyType, setPropertyType] = useState("All property types");
  const [selectedPartner, setSelectedPartner] = useState<HomeNetworkPartner | null>(null);
  const [pickedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const selectedDestination: Destination | undefined =
    destinations.find((destination) => destination.id === pickedDestination?.id) ?? destinations[0];
  const [formMessage, setFormMessage] = useState("");

  const cities = useMemo(
    () => [...new Set(destinations.map((destination) => destination.name))],
    [destinations],
  );
  const filteredPartners = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return partners.filter((partner) => {
      const matchesCategory =
        category === "All Partners" || getCategories(partner).includes(category as PartnerCategory);
      const matchesSearch =
        !term ||
        partner.name.toLocaleLowerCase().includes(term) ||
        getDescription(partner).toLocaleLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [category, partners, search]);
  const filteredDestinations = useMemo(
    () =>
      city === "All destinations"
        ? destinations
        : destinations.filter((destination) => destination.name === city),
    [city, destinations],
  );

  const handlePartnerEnquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const subject = encodeURIComponent("Hospitality partnership enquiry â€” Gulsaga");
    const body = encodeURIComponent(
      [
        `Name: ${formData.get("name")}`,
        `Company: ${formData.get("company")}`,
        `Email: ${formData.get("email")}`,
        `City: ${formData.get("city")}`,
        `Property type: ${formData.get("propertyType")}`,
        "",
        String(formData.get("message") || ""),
      ].join("\n"),
    );
    setFormMessage("Your email app will open with the partnership enquiry details.");
    window.location.href = `mailto:LuxuryTravel@gulsaga.com?subject=${subject}&body=${body}`;
  };

  return (
    <Layout networkMode>
      <div className="network-page">
        <section
          className="network-hero"
          style={{ backgroundImage: `url("${networkPageContent.heroMedia.src}")` }}
        >
          <div className="network-hero-shade" />
          <div className="network-hero-content">
            <p className="eyebrow">{networkPageContent.heroEyebrow}</p>
            <h1>
              {networkPageContent.heroTitle} <em>{networkPageContent.heroHighlight}</em>
            </h1>
            <p>{networkPageContent.heroDescription}</p>
            <div className="network-hero-actions">
              <a className="network-gold-button" href="#partners">
                Explore Partners <ArrowRight size={17} />
              </a>
              <a className="network-watch-link" href="#network-map">
                <span>â–¶</span> Explore the network
              </a>
            </div>
          </div>
          <div className="network-hero-stats">
            <div>
              <BedDouble />
              <strong>{partners.length}+</strong>
              <span>Partner brands</span>
            </div>
            <div>
              <MapPin />
              <strong>{destinations.length}+</strong>
              <span>Destinations</span>
            </div>
            <div>
              <Handshake />
              <strong>5</strong>
              <span>Ways to stay</span>
            </div>
            <div>
              <Gem />
              <strong>Member</strong>
              <span>Experiences</span>
            </div>
          </div>
        </section>

        <section className="network-value-section" aria-label="Benefits of the Gulsaga network">
          {(
            [
              {
                key: "traveller",
                value: content.network.valuePropositions.traveller,
                icons: travellerValueIcons,
                link: (
                  <Link className="network-value-link" to="/membership">
                    {content.network.valuePropositions.traveller.ctaLabel} <ArrowRight size={15} />
                  </Link>
                ),
              },
              {
                key: "partner",
                value: content.network.valuePropositions.partner,
                icons: partnerValueIcons,
                link: (
                  <a className="network-value-link" href="#become-partner">
                    {content.network.valuePropositions.partner.ctaLabel} <ArrowRight size={15} />
                  </a>
                ),
              },
            ] as const
          ).map(({ key, value, icons, link }) => (
            <article
              className={`network-value-card network-value-${key}`}
              key={key}
              aria-label={value.heading}
            >
              <p className="eyebrow">{value.eyebrow}</p>
              <h2>{value.heading}</h2>
              <p className="network-value-intro">{value.description}</p>
              <div className="network-value-points">
                {value.points.map((point, index) => {
                  const Icon = icons[index] ?? Compass;
                  return (
                    <div key={`${key}-value-${index}`}>
                      <Icon size={19} />
                      <span>
                        <strong>{point.title}</strong>
                        <small>{point.description}</small>
                      </span>
                    </div>
                  );
                })}
              </div>
              {link}
            </article>
          ))}
        </section>

        <div className="network-content-grid">
          <main className="network-main">
            <section className="network-map-section" id="network-map">
              <div className="network-map-copy">
                <p className="eyebrow">FIND YOUR NEXT ESCAPE</p>
                <h2>Our Network Across India</h2>
                <p>
                  Explore the destinations featured across our curated hospitality collection.
                  Select a pin to discover a destination. Map markers show destination previews, not
                  verified property locations.
                </p>
                <div className="network-map-stats">
                  <div>
                    <BedDouble />
                    <strong>{partners.length}</strong>
                    <span>Partner brands</span>
                  </div>
                  <div>
                    <Mountain />
                    <strong>{destinations.length}</strong>
                    <span>Destinations</span>
                  </div>
                  <div>
                    <Handshake />
                    <strong>{categories.length - 1}</strong>
                    <span>Partner types</span>
                  </div>
                </div>
                <a className="network-outline-link" href="#featured">
                  Discover destinations <ArrowRight size={15} />
                </a>
              </div>
              <div className="network-map-wrap">
                <div className="network-map-grid" aria-hidden="true" />
                <svg
                  className="network-india-map"
                  viewBox="0 0 360 390"
                  role="img"
                  aria-label="Illustrated map of India with curated destination markers"
                >
                  <defs>
                    <linearGradient id="network-map-fill" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stopColor="#efd18f" />
                      <stop offset="100%" stopColor="#b97827" />
                    </linearGradient>
                    <filter id="network-map-glow">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <path
                    className="network-map-country"
                    d="M92 25 126 36 148 28 171 43 198 47 218 63 250 65 270 82 296 86 302 101 324 105 316 121 336 128 324 143 337 158 324 171 336 185 322 199 326 218 310 235 301 257 286 274 279 298 264 313 253 337 235 346 226 371 211 362 199 339 184 320 178 297 164 280 151 257 143 237 129 220 119 201 105 182 93 164 81 143 70 125 61 108 66 91 55 74 66 60 63 44 79 38Z"
                  />
                  <path
                    className="network-map-state-line"
                    d="m88 96 209 11M104 139l220 16M125 183l190 16M145 226l156 10M166 267l116 7M111 81l48 195M169 50l18 267M229 69l-8 255"
                  />
                  {destinations.map((destination) => (
                    <g
                      className={`network-map-pin${selectedDestination.id === destination.id ? " selected" : ""}`}
                      key={destination.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Show ${destination.name}`}
                      onClick={() => setSelectedDestination(destination)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedDestination(destination);
                        }
                      }}
                    >
                      <circle
                        cx={(destination.mapX / 100) * 260 + 40}
                        cy={(destination.mapY / 100) * 285 + 48}
                        r={selectedDestination.id === destination.id ? 13 : 9}
                      />
                      <circle
                        className="network-map-pin-core"
                        cx={(destination.mapX / 100) * 260 + 40}
                        cy={(destination.mapY / 100) * 285 + 48}
                        r="3.5"
                      />
                    </g>
                  ))}
                </svg>
                {selectedDestination && (
                  <div className="network-map-selection">
                    <MapPin size={15} />
                    <span>
                      <strong>{selectedDestination.name}</strong>
                      <small>{selectedDestination.subtitle}</small>
                    </span>
                    <Link
                      to="/destinations/$destinationId"
                      params={{ destinationId: destinationSlug(selectedDestination) }}
                    >
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>
                )}
              </div>
              {selectedDestination && (
                <div className="network-map-selected-card">
                  <img
                    src={selectedDestination.media.src}
                    alt={selectedDestination.media.name}
                    loading="lazy"
                  />
                  <div>
                    <small>DESTINATION PREVIEW</small>
                    <strong>{selectedDestination.name}</strong>
                    <span>{selectedDestination.description}</span>
                  </div>
                </div>
              )}
            </section>

            <section className="network-partners-section" id="partners">
              <div className="network-section-title">
                <span />
                <div>
                  <p className="eyebrow">OUR HOSPITALITY PARTNERS</p>
                  <h2>Partner Brands</h2>
                </div>
                <span />
              </div>
              <div className="network-category-row" aria-label="Filter partner brands">
                {categories.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    className={category === label ? "active" : ""}
                    type="button"
                    onClick={() => {
                      setCategory(label);
                      setPropertyType(label === "All Partners" ? "All property types" : label);
                    }}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
              <div className="network-filter-row">
                <label className="network-search">
                  <Compass size={17} />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search partner brands"
                    aria-label="Search partner brands"
                  />
                </label>
                <label>
                  <span className="sr-only">Filter destination previews</span>
                  <select
                    value={city}
                    onChange={(event) => {
                      const nextCity = event.target.value;
                      setCity(nextCity);
                      const destination = destinations.find((item) => item.name === nextCity);
                      if (destination) setSelectedDestination(destination);
                    }}
                  >
                    <option>All destinations</option>
                    {cities.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} />
                </label>
                <label>
                  <span className="sr-only">Filter by property type</span>
                  <select
                    value={propertyType}
                    onChange={(event) => {
                      setPropertyType(event.target.value);
                      setCategory(
                        event.target.value === "All property types"
                          ? "All Partners"
                          : event.target.value,
                      );
                    }}
                  >
                    <option>All property types</option>
                    {categories.slice(1).map(({ label }) => (
                      <option key={label}>{label}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} />
                </label>
              </div>
              {city !== "All destinations" && (
                <p className="network-filter-note">
                  Showing the {city} destination preview. Partner brands are not linked to specific
                  property locations here; availability should be confirmed directly.
                </p>
              )}
              {propertyType !== "All property types" && propertyType !== category && (
                <span className="sr-only">Partner category filter is active: {category}</span>
              )}
              {filteredPartners.length ? (
                <div className="network-partner-grid">
                  {filteredPartners.map((partner) => (
                    <button
                      className="network-partner-tile"
                      key={partner.id}
                      type="button"
                      onClick={() => setSelectedPartner(partner)}
                    >
                      <span className="network-partner-tile-logo">
                        <PartnerLogo partner={partner} />
                      </span>
                      <strong>{partner.name}</strong>
                      <small>{getCategories(partner)[0]}</small>
                      <ArrowUpRight className="network-partner-open" size={16} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="network-empty">
                  <Compass />
                  <strong>No partners match this search.</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setCategory("All Partners");
                      setPropertyType("All property types");
                      setCity("All destinations");
                      setSelectedDestination(null);
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
              <p className="network-admin-note">
                Partner details and both audience benefit sections are editable in{" "}
                <strong>Admin â†’ Home page â†’ Hospitality network</strong>.
              </p>
            </section>

            <section className="network-featured-section" id="featured">
              <div className="network-section-title">
                <span />
                <div>
                  <p className="eyebrow">PLACES TO DISCOVER</p>
                  <h2>Featured Destinations</h2>
                </div>
                <span />
              </div>
              <div className="network-featured-rail">
                {filteredDestinations.map((destination) => (
                  <article className="network-featured-card" key={destination.id}>
                    <Link
                      to="/destinations/$destinationId"
                      params={{ destinationId: destinationSlug(destination) }}
                      className="network-featured-image"
                    >
                      <img
                        src={destination.media.src}
                        alt={destination.media.name}
                        loading="lazy"
                      />
                      <span>
                        <MapPin size={13} /> {destination.location}
                      </span>
                    </Link>
                    <div className="network-featured-copy">
                      <small>DESTINATION PREVIEW</small>
                      <h3>{destination.name}</h3>
                      <p>{destination.description}</p>
                      <Link
                        to="/destinations/$destinationId"
                        params={{ destinationId: destinationSlug(destination) }}
                      >
                        Explore destination <ArrowRight size={14} />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
              {filteredDestinations.length === 0 && (
                <div className="network-empty">
                  <Compass />
                  <strong>No destination previews match this selection.</strong>
                </div>
              )}
            </section>

            <section className="network-partner-cta">
              <div>
                <p className="eyebrow">GROW WITH GULSAGA</p>
                <h2>Partner With Gulsaga</h2>
                <p>
                  Join our hospitality network and reach a community of discerning travellers,
                  artists and event planners.
                </p>
              </div>
              <a className="network-gold-button" href="#become-partner">
                Become a Partner <ArrowRight size={17} />
              </a>
            </section>
          </main>

          <aside className="network-sidebar">
            <section className="network-curation-card">
              <p className="eyebrow">THE GULSAGA STANDARD</p>
              <h2>
                How We Curate
                <br />
                Our Network
              </h2>
              {curatingPillars.map(({ icon: Icon, title, description }) => (
                <div className="network-curation-item" key={title}>
                  <span>
                    <Icon size={21} />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <p>{description}</p>
                  </div>
                </div>
              ))}
            </section>
            <section className="network-improve-card">
              <h2>
                <Sparkles size={20} /> Our Network, Thoughtfully
              </h2>
              {[
                "Explore destinations on an interactive map.",
                "Discover partner brands and curated destinations.",
                "Ask about a property or partnership.",
                "Member benefits depend on your membership terms.",
              ].map((item) => (
                <p key={item}>
                  <Check size={16} /> {item}
                </p>
              ))}
            </section>
            <section className="network-updates-card">
              <p className="eyebrow">BECOME A PARTNER</p>
              <h2>Letâ€™s create memorable stays together.</h2>
              <a href="#become-partner">
                Start a conversation <ArrowRight size={14} />
              </a>
            </section>
          </aside>
        </div>

        <section className="network-enquiry-section" id="become-partner">
          <div className="network-enquiry-copy">
            <p className="eyebrow">PARTNERSHIP ENQUIRY</p>
            <h2>
              Letâ€™s build something
              <br />
              <em>remarkable together.</em>
            </h2>
            <p>Tell us about your property and our partnerships team will get in touch.</p>
            <div className="network-enquiry-points">
              <span>
                <BadgeCheck size={17} /> Hospitality partners
              </span>
              <span>
                <HeartHandshake size={17} /> Destination experiences
              </span>
              <span>
                <ArrowDownRight size={17} /> Personal response from our team
              </span>
            </div>
          </div>
          <form className="network-enquiry-form" onSubmit={handlePartnerEnquiry}>
            <div className="network-enquiry-form-heading">
              <span>
                <Handshake size={20} />
              </span>
              <div>
                <h3>Become a Partner</h3>
                <p>Share a few details to begin.</p>
              </div>
            </div>
            <div className="network-form-row">
              <label>
                Full name
                <input name="name" required placeholder="Your name" />
              </label>
              <label>
                Property / company
                <input name="company" required placeholder="Property name" />
              </label>
            </div>
            <div className="network-form-row">
              <label>
                Email address
                <input name="email" type="email" required placeholder="you@hotel.com" />
              </label>
              <label>
                City
                <input name="city" required placeholder="City, country" />
              </label>
            </div>
            <label>
              Property type
              <select name="propertyType" required defaultValue="">
                <option value="" disabled>
                  Select a category
                </option>
                {categories.slice(1).map(({ label }) => (
                  <option key={label}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              Tell us about your property
              <textarea
                name="message"
                rows={3}
                placeholder="Property overview, experiences and partnership goalsâ€¦"
              />
            </label>
            <Button type="submit">
              Send partnership enquiry <ArrowRight size={16} />
            </Button>
            {formMessage && (
              <p className="network-form-message" role="status">
                {formMessage}
              </p>
            )}
            <small>
              This preview opens an email draft; the enquiry is not stored in this website.
            </small>
          </form>
        </section>

        <section className="network-faq-section">
          <div className="network-section-title">
            <span />
            <div>
              <p className="eyebrow">GOOD TO KNOW</p>
              <h2>Network FAQs</h2>
            </div>
            <span />
          </div>
          <div className="network-faq-grid">
            {[
              [
                "Are all the properties shown available to members?",
                "Availability and member benefits vary by property and membership terms. Please enquire with Gulsaga before making travel plans.",
              ],
              [
                "How do I enquire about a partner stay?",
                "Use the contact page or speak with the Gulsaga team to discuss your destination, dates and membership benefits.",
              ],
              [
                "Can my hotel or resort join the network?",
                "Yes. Submit the partnership form above with your property details. Our team will review your enquiry and follow up.",
              ],
              [
                "Can partners manage their own listings?",
                "Partner self-service dashboards and property update workflows are not connected in this website preview. Partner brand names and logos can be managed by an administrator in the Home page editor.",
              ],
            ].map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <ChevronDown size={17} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        {selectedPartner && (
          <div
            className="network-dialog-backdrop"
            role="presentation"
            onMouseDown={() => setSelectedPartner(null)}
          >
            <section
              className="network-partner-dialog"
              role="dialog"
              aria-modal="true"
              aria-label={`${selectedPartner.name} partner details`}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                className="network-dialog-close"
                type="button"
                aria-label="Close partner details"
                onClick={() => setSelectedPartner(null)}
              >
                <X />
              </button>
              <span className="network-dialog-logo">
                <PartnerLogo partner={selectedPartner} />
              </span>
              <p className="eyebrow">GULSAGA PARTNER BRAND</p>
              <h2>{selectedPartner.name}</h2>
              <p>{getDescription(selectedPartner)}</p>
              <div className="network-dialog-categories">
                {getCategories(selectedPartner).map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              <p className="network-dialog-note">
                Specific property locations, facilities, amenities and availability are confirmed
                with Gulsaga when planning a stay.
              </p>
              <Button asChild>
                <Link to="/contact" search={{ hotel: selectedPartner.name }}>
                  Ask about this partner <ArrowRight size={16} />
                </Link>
              </Button>
            </section>
          </div>
        )}
      </div>
    </Layout>
  );
}
