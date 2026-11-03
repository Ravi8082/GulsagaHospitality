import resortHero from "@/assets/resort.jpg";
import resortInterior from "@/assets/resort.jpg";
import resortPool from "@/assets/resort-pool.jpg";
import resortRiver from "@/assets/resort-river.jpg";
import resortVilla from "@/assets/resort-villa.jpg";
import junaMahal from "@/assets/destinations/juna-mahal.webp";
import rajasthan from "@/assets/destinations/rajasthan.jpg";
import { initialDestinations } from "@/lib/destination-data";
import type { HomeMedia } from "@/lib/home-content";

export type ResortRoom = {
  name: string;
  capacity: string;
  description: string;
  amenities: string[];
  image: HomeMedia;
  previewOnly: boolean;
};

export type ResortDetailContent = {
  category: string;
  longDescription: string;
  gallery: HomeMedia[];
  video: HomeMedia | null;
  verifiedPartner: boolean;
  rooms: ResortRoom[];
  amenities: string[];
  experiences: string[];
  nearbyAttractions: string[];
  howToReach: string;
  membershipBenefits: string[];
};

export type Resort = {
  id: string;
  name: string;
  region: string;
  location: string;
  description: string;
  tags: [string, string];
  media: HomeMedia;
  detail: ResortDetailContent;
};

function destinationAt(id: string) {
  const destination = initialDestinations.find((item) => item.id === id);

  if (!destination) {
    throw new Error(`Missing resort destination: ${id}`);
  }

  return destination;
}

function resort(
  id: string,
  name: string,
  destinationId: string,
  description: string,
  tags: [string, string],
): Resort {
  const destination = destinationAt(destinationId);
  const junaGallery = [
    media("Juna Mahal heritage preview", junaMahal),
    media("Rajasthan destination preview", rajasthan),
    media("Resort pool preview", resortPool),
    media("Resort villa preview", resortVilla),
    media("Resort landscape preview", resortRiver),
    media("Resort stay preview", resortInterior),
  ];

  return {
    id,
    name,
    region: destination.name,
    location: destination.location,
    description,
    tags,
    media: destination.media,
    detail: {
      category: tags[0],
      longDescription: `${description} This resort profile is a preview; please confirm property details, facilities and availability with Gulsaga.`,
      gallery:
        id === "juna-mahal"
          ? junaGallery
          : [
              destination.media,
              media(`${name} stay preview`, resortPool),
              media(`${name} retreat preview`, resortVilla),
            ],
      video: null,
      verifiedPartner: false,
      rooms: [
        {
          name: "Stay option preview",
          capacity: "Capacity to confirm",
          description: "Ask Gulsaga about room categories and current availability.",
          amenities: ["Room amenities to confirm"],
          image: media(`${name} room preview`, resortInterior),
          previewOnly: true,
        },
        {
          name: "Suite option preview",
          capacity: "Capacity to confirm",
          description: "Room configuration and inclusions depend on the property.",
          amenities: ["Suite amenities to confirm"],
          image: media(`${name} suite preview`, resortVilla),
          previewOnly: true,
        },
      ],
      amenities: [
        "Dining options to confirm",
        "Wellness facilities to confirm",
        "Guest services to confirm",
        "Accessibility details to confirm",
      ],
      experiences: [
        "Local culture & discovery",
        "Nature and destination experiences",
        "Special occasions and celebrations",
      ],
      nearbyAttractions: [
        `Explore local highlights around ${destination.location}`,
        "Ask Gulsaga for current recommendations nearby",
      ],
      howToReach:
        "Travel routes, airport or station access and transfers should be confirmed with the property for your dates.",
      membershipBenefits: [
        "Applicable membership privileges, subject to your plan",
        "Support from the Gulsaga team while planning",
        "Property experiences subject to availability and terms",
      ],
    },
  };
}

function media(name: string, src: string): HomeMedia {
  return { name, src, type: "image" };
}

export const initialResorts: Resort[] = [
  resort(
    "palace-belvedere",
    "The Palace Belvedere",
    "uttarakhand",
    "A refined Himalayan retreat in the hills of Nainital.",
    ["Luxury Stay", "Mountain View"],
  ),
  resort(
    "raht-aashyana",
    "Raht Aashyana",
    "goa",
    "A peaceful garden hideaway close to the beaches of Goa.",
    ["Beachfront", "Private Villas"],
  ),
  resort(
    "juna-mahal",
    "Juna Mahal",
    "rajasthan",
    "A heritage stay surrounded by the stories and landscapes of Rajasthan.",
    ["Heritage Stay", "Royal Experience"],
  ),
  resort(
    "manuallaya",
    "Manuallaya",
    "himachal",
    "A mountain retreat with sweeping views across the Manali valley.",
    ["Hill Retreat", "Nature Trails"],
  ),
  resort(
    "kumarakom-lake-resort",
    "Kumarakom Lake Resort",
    "kerala",
    "A serene lakeside escape beside Kerala's celebrated backwaters.",
    ["Lakeside Stay", "Wellness & Spa"],
  ),
];

export type ResortPageContent = {
  eyebrow: string;
  heading: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
  collectionHeading: string;
  heroMedia: HomeMedia;
  highlights: [string, string, string, string];
};

export const initialResortPageContent: ResortPageContent = {
  eyebrow: "OUR CURATED",
  heading: "Resorts",
  description:
    "A handpicked collection of luxury resorts, retreats and boutique stays across India's most beautiful destinations.",
  primaryLabel: "Explore All Resorts",
  secondaryLabel: "Resort Experience",
  collectionHeading: "Featured Resorts",
  heroMedia: {
    src: resortHero,
    type: "image",
    name: "Gulsaga resort hero",
  },
  highlights: ["Curated Stays", "Premium Amenities", "Nature Immersion", "Exclusive Member Access"],
};
