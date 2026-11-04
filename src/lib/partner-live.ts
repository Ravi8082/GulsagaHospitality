import { apiBase } from "@/lib/experience-api";
import { slugify, type Destination } from "@/lib/destination-data";
import type { Resort } from "@/lib/resort-data";
import type { HomeMedia, HomeNetworkPartner } from "@/lib/home-content";
import resortPool from "@/assets/destinations/resort-pool.jpg";

export type LiveProperty = {
  id: number;
  name: string;
  slug: string;
  location: string;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  logoUrl: string | null;
  tagline: string | null;
  city: string | null;
  state: string | null;
};

export const livePrefix = "partner-";
export const isLiveEntry = (id: string) => id.startsWith(livePrefix);

const src = (url: string) => (url.startsWith("/api/") ? apiBase + url.slice(4) : url);
const image = (name: string, url: string): HomeMedia => ({ name, src: src(url), type: "image" });

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// A partner belongs to an existing destination when the destination name appears in its state or location.
function findHome(destinations: Destination[], p: LiveProperty) {
  const text = `${p.state ?? ""} ${p.location}`.toLowerCase();
  return destinations.find((d) => text.includes(d.name.toLowerCase()));
}

export function mergeLive(
  base: { resorts: Resort[]; destinations: Destination[]; partners: HomeNetworkPartner[] },
  live: LiveProperty[],
) {
  const resorts = [...base.resorts];
  const destinations = base.destinations.map((d) => ({ ...d }));
  const partners = [...base.partners];

  for (const p of live) {
    if (resorts.some((r) => same(r.name, p.name))) continue;
    const cover = p.imageUrl
      ? image(`${p.name} cover`, p.imageUrl)
      : p.logoUrl
        ? image(`${p.name} logo`, p.logoUrl)
        : image(p.name, resortPool);
    const place = [p.city, p.state].filter(Boolean).join(", ") || p.location;
    let home = findHome(destinations, p);

    if (!home) {
      home = {
        id: `${livePrefix}dest-${slugify(p.state || p.location)}`,
        name: p.state || p.location,
        subtitle: "New Partner Destination",
        description: p.tagline || `Discover ${p.name} in ${p.state || p.location}, now part of the Gulsaga network.`,
        categories: [p.category || "Partner Stay"],
        resortName: p.name,
        location: place,
        media: cover,
        mapX: 50,
        mapY: 50,
      };
      destinations.push(home);
    }

    const stay = {
      name: p.name,
      location: place,
      rating: 0,
      reviews: 0,
      price: "On request",
      media: cover,
    };
    home.detail = { ...home.detail, stays: [...(home.detail?.stays ?? []), stay] };

    resorts.push({
      id: `${livePrefix}${p.slug}`,
      name: p.name,
      region: home.name,
      location: place,
      description:
        p.description || p.tagline || `${p.name} is a Gulsaga partner property in ${place}.`,
      tags: [p.category || "Partner Stay", p.tagline ? "Verified partner" : "New partner"],
      media: cover,
      detail: {
        category: p.category || "Partner Stay",
        longDescription:
          p.description ||
          `${p.name} has joined the Gulsaga network. Please confirm facilities and availability with Gulsaga.`,
        gallery: [cover],
        video: null,
        verifiedPartner: true,
        rooms: [],
        amenities: [],
        experiences: [],
        nearbyAttractions: [],
        howToReach: "Ask Gulsaga for the best route and transfers to the property.",
        membershipBenefits: ["Applicable membership privileges, subject to your plan"],
      },
    });

    if (p.logoUrl && !partners.some((x) => same(x.name, p.name))) {
      partners.push({
        id: `${livePrefix}${p.slug}`,
        name: p.name,
        logo: image(`${p.name} logo`, p.logoUrl),
      });
    }
  }

  return { resorts, destinations, partners };
}
