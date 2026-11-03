import goaResort from "@/assets/destinations/destination-goa.jpg";
import rajasthanResort from "@/assets/destinations/destination-rajasthan.jpg";
import uttarakhandResort from "@/assets/destinations/destination-uttarakhand.jpg";
import himachalCardResort from "@/assets/destinations/destination-himachal.jpg";
import keralaCardResort from "@/assets/destinations/destination-kerala.jpg";
import type { HomeMedia } from "@/lib/home-content";

export type DestinationPlace = { name: string; description: string; media: HomeMedia | null };
export type DestinationFaq = { question: string; answer: string };

export type DestinationStay = {
  name: string;
  location: string;
  rating: number;
  reviews: number;
  price: string;
  media: HomeMedia | null;
};
export type DestinationReview = { name: string; rating: number; text: string; role: string };

// Every field is optional so destinations saved before this page existed keep working.
// Sections with no content are simply not shown on the public page.
export type DestinationDetail = {
  tagline?: string;
  story?: string;
  highlights?: string[];
  bestTime?: string;
  weather?: string;
  nearestAirport?: string;
  nearestRailway?: string;
  idealDuration?: string;
  howToReach?: string;
  localTransport?: string;
  video?: HomeMedia | null;
  places?: DestinationPlace[];
  experiences?: string[];
  gallery?: HomeMedia[];
  faqs?: DestinationFaq[];
  stays?: DestinationStay[];
  reviews?: DestinationReview[];
  nearbyPlaces?: string[];
  latitude?: number | null;
  longitude?: number | null;
};

export type Destination = {
  id: string;
  slug?: string;
  name: string;
  subtitle: string;
  description: string;
  categories: string[];
  resortName: string;
  location: string;
  media: HomeMedia;
  mapX: number;
  mapY: number;
  detail?: DestinationDetail;
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function destinationSlug(destination: Destination) {
  return slugify(destination.slug ?? "") || slugify(destination.name) || destination.id;
}

export function findDestination(destinations: Destination[], param: string) {
  const key = param.toLowerCase();
  return (
    destinations.find((item) => destinationSlug(item) === key) ??
    destinations.find((item) => item.id === param)
  );
}

const image = (name: string, src: string): HomeMedia => ({
  src,
  type: "image",
  name,
});

export const initialDestinations: Destination[] = [
  {
    id: "uttarakhand",
    name: "Uttarakhand",
    subtitle: "Himalayan Retreats",
    description: "Find a slower pace among forested hills, fresh mountain air and serene retreats.",
    categories: ["Mountains", "Nature Retreats"],
    resortName: "The Palace Belvedere",
    location: "Nainital, Uttarakhand",
    media: image("The Palace Belvedere, Uttarakhand", uttarakhandResort),
    mapX: 48,
    mapY: 23,
  },
  {
    id: "goa",
    name: "Goa",
    subtitle: "Beachside Luxury",
    description:
      "Make room for unhurried days, garden courtyards and the easy rhythm of the coast.",
    categories: ["Beaches", "Nature Retreats"],
    resortName: "Raht Aashyana",
    location: "Candolim, Goa",
    media: image("Raht Aashyana, Goa", goaResort),
    mapX: 35,
    mapY: 62,
  },
  {
    id: "rajasthan",
    name: "Rajasthan",
    subtitle: "Heritage & Royal Stays",
    description: "Discover storied architecture, warm desert light and a memorable sense of place.",
    categories: ["Heritage", "Art & Culture"],
    resortName: "Juna Mahal",
    location: "Ranthambore, Rajasthan",
    media: image("Juna Mahal, Rajasthan", rajasthanResort),
    mapX: 37,
    mapY: 43,
  },
  {
    id: "himachal",
    name: "Himachal",
    subtitle: "Hill Retreats",
    description: "Wake to pine-scented mornings and expansive views in the Himalayan foothills.",
    categories: ["Mountains", "Nature Retreats"],
    resortName: "Manuallaya",
    location: "Manali, Himachal Pradesh",
    media: image("Manuallaya, Himachal Pradesh", himachalCardResort),
    mapX: 43,
    mapY: 16,
  },
  {
    id: "kerala",
    name: "Kerala",
    subtitle: "Lakes, Backwaters & Wellness",
    description: "Settle into tropical calm beside the backwaters, with time to simply unwind.",
    categories: ["Nature Retreats"],
    resortName: "Kumarakom Lake Resort",
    location: "Kumarakom, Kerala",
    media: image("Kumarakom Lake Resort, Kerala", keralaCardResort),
    mapX: 42,
    mapY: 82,
  },
];
