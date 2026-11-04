import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useContentPersistence, type SaveStatus } from "@/lib/content-persistence";
import alpineResort from "@/assets/destinations/alpine-resort.jpg";
import destinationHero from "@/assets/destinations/destination-hero-reference.jpg";
import adminBannerImage from "@/assets/destinations/juna-mahal.webp";
import destinationMap from "@/assets/destinations/destination-map-background.jpg";
import gulsagaLogo from "@/assets/destinations/gulsaga-reference-logo.png";
import resort from "@/assets/destinations/resort-pool.jpg";
import { initialDestinations, type Destination } from "@/lib/destination-data";
import { hotels } from "@/lib/hotel-data";
import { initialNetworkPartners } from "@/lib/partner-data";
import { apiRequest } from "@/lib/experience-api";
import { isLiveEntry, mergeLive, type LiveProperty } from "@/lib/partner-live";
import {
  initialResortPageContent,
  initialResorts,
  type Resort,
  type ResortDetailContent,
  type ResortPageContent,
  type ResortRoom,
} from "@/lib/resort-data";
import {
  initialMembershipOfferMedia,
  initialMembershipPageContent,
  type MembershipPageContent,
} from "@/lib/membership-data";

export type { Resort, ResortDetailContent, ResortPageContent, ResortRoom } from "@/lib/resort-data";
export type {
  MembershipBenefit,
  MembershipPageContent,
  MembershipStep,
} from "@/lib/membership-data";

export type HomeMedia = {
  src: string;
  type: "image" | "video";
  name: string;
};

export type HomeNetworkPartner = {
  id: string;
  name: string;
  logo: HomeMedia;
};

export type NetworkValuePoint = {
  title: string;
  description: string;
};

export type NetworkValueSection = {
  eyebrow: string;
  heading: string;
  description: string;
  points: [NetworkValuePoint, NetworkValuePoint, NetworkValuePoint];
  ctaLabel: string;
};

export type DestinationPageContent = {
  eyebrow: string;
  heading: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
  collectionHeading: string;
  heroMedia: HomeMedia;
  mapImage: HomeMedia;
};

export type ExperiencePageContent = {
  heroEyebrow: string;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;
  heroMedia: HomeMedia;
  dashboardEyebrow: string;
  dashboardTitle: string;
  dashboardHighlight: string;
  dashboardDescription: string;
  dashboardCta: string;
  dashboardEmptyTitle: string;
  dashboardEmptyText: string;
  dashboardMedia: HomeMedia | null;
};

export type AdminDashboardContent = {
  heroMedia: HomeMedia;
};

export type NetworkPageContent = {
  heroEyebrow: string;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;
  heroMedia: HomeMedia;
};

export type FooterQuickLink = {
  label: string;
  href: string;
};

export type FooterExperience = {
  label: string;
  icon: "bed" | "lotus" | "rings" | "mountain" | "crown";
};

export type FooterSocialLink = {
  label: string;
  href: string;
  icon: "linkedin" | "instagram" | "youtube" | "facebook";
};

export type FooterContent = {
  background: HomeMedia;
  description: string;
  quickLinksTitle: string;
  quickLinks: FooterQuickLink[];
  experiencesTitle: string;
  experiences: FooterExperience[];
  contactTitle: string;
  phone: string;
  email: string;
  location: string;
  whatsappLabel: string;
  whatsappNumber: string;
  newsletterTitle: string;
  newsletterDescription: string;
  socials: FooterSocialLink[];
  copyright: string;
  legalLinks: FooterQuickLink[];
};

export type ContactInquiryCategory = {
  label: string;
  description: string;
  icon: "bed" | "crown" | "rings" | "handshake" | "calendar";
};

export type ContactPageContent = {
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  contactHeading: string;
  contactDescription: string;
  officeHeading: string;
  officeName: string;
  officeHours: string;
  mapLabel: string;
  heroMedia: HomeMedia;
  officeImage: HomeMedia | null;
  inquiryCategories: ContactInquiryCategory[];
};

export type AboutPageContent = {
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroMedia: HomeMedia;
  storyHeading: string;
  story: string;
  storyImage: HomeMedia;
  journeyVideo: HomeMedia | null;
  vision: string;
  mission: string;
  values: string[];
  achievements: { metric: string; label: string }[];
  services: { title: string; description: string }[];
  founderName: string;
  founderTitle: string;
  founderMessage: string;
  founderImage: HomeMedia | null;
  milestones: { chapter: string; title: string; description: string }[];
  sustainabilityHeading: string;
  sustainabilityDescription: string;
  testimonials: { quote: string; name: string; detail: string }[];
  pressLinks: FooterQuickLink[];
  ctaHeading: string;
  ctaDescription: string;
  ctaLabel: string;
};

export type HomeContent = {
  brand: {
    name: string;
    logo: HomeMedia | null;
    navigation: string[];
    membershipLabel: string;
    announcement: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    highlight: string;
    description: string;
    primaryLabel: string;
    secondaryLabel: string;
    footnote: string;
    scrollLabel: string;
    scrollEyebrow: string;
    image: HomeMedia;
    globe: HomeMedia;
    perks: [string, string, string];
  };
  network: {
    eyebrow: string;
    heading: string;
    description: string;
    valuePropositions: {
      traveller: NetworkValueSection;
      partner: NetworkValueSection;
    };
    partners: HomeNetworkPartner[];
  };
  about: {
    eyebrow: string;
    heading: string;
    description: string;
    images: [HomeMedia, HomeMedia, HomeMedia];
    services: [
      { title: string; description: string },
      { title: string; description: string },
      { title: string; description: string },
    ];
  };
  membership: {
    eyebrow: string;
    heading: string;
    description: string;
    benefits: [string, string, string];
    cta: string;
    years: string;
    metricHeading: string;
    refundTerms: string;
    termsNote: string;
    media: HomeMedia | null;
  };
  featured: {
    eyebrow: string;
    heading: string;
    description: string;
    location: string;
    cta: string;
    media: HomeMedia;
  };
  invitation: {
    eyebrow: string;
    heading: string;
    description: string;
    cta: string;
    media: HomeMedia | null;
  };
};

const image = (name: string, src = resort): HomeMedia => ({
  src,
  type: "image",
  name,
});

export const initialDestinationPageContent: DestinationPageContent = {
  eyebrow: "EXPLORE OUR",
  heading: "Destinations",
  description:
    "Discover curated resorts, art retreats and luxury holiday experiences across breathtaking locations.",
  primaryLabel: "Explore All Destinations",
  secondaryLabel: "Watch Experience",
  collectionHeading: "Popular Destinations",
  heroMedia: image("Gulsaga destination hero", destinationHero),
  mapImage: image("Gulsaga destination map", destinationMap),
};

export const initialExperiencePageContent: ExperiencePageContent = {
  heroEyebrow: "MEMBER EXPERIENCES",
  heroTitle: "Real Stays,",
  heroHighlight: "Real Stories.",
  heroDescription:
    "Discover authentic experiences shared by our members from their holidays, art residencies and destination weddings.",
  heroMedia: image("Member experiences hero", destinationHero),
  dashboardEyebrow: "YOUR MEMBER SPACE",
  dashboardTitle: "My",
  dashboardHighlight: "Experiences.",
  dashboardDescription: "Follow every story from the moment you share it to the day it goes live.",
  dashboardCta: "Add New Experience",
  dashboardEmptyTitle: "Your first story belongs here.",
  dashboardEmptyText: "Share a stay, a creative retreat or a celebration with the Gulsaga community.",
  dashboardMedia: null,
};

export const initialAdminDashboardContent: AdminDashboardContent = {
  heroMedia: image("Admin dashboard banner", adminBannerImage),
};

export const initialNetworkPageContent: NetworkPageContent = {
  heroEyebrow: "OUR NETWORK",
  heroTitle: "A Curated Network of",
  heroHighlight: "Premium Partners",
  heroDescription:
    "A growing ecosystem of hospitality brands, curated stays and destinations for holidays, art residencies and celebrations.",
  heroMedia: image("Gulsaga network hero", destinationHero),
};

export const initialFooterContent: FooterContent = {
  background: image("Mountain resort footer panorama", alpineResort),
  description:
    "A lifestyle hospitality brand that brings together luxury holidays, art residencies and destination weddings at extraordinary locations.",
  quickLinksTitle: "Quick Links",
  quickLinks: [
    { label: "Home", href: "/" },
    { label: "Membership", href: "/membership" },
    { label: "Destinations", href: "/destinations" },
    { label: "Resorts", href: "/resorts" },
    { label: "Experiences", href: "/experiences" },
    { label: "Our Network", href: "/#hospitality-network" },
    { label: "About Us", href: "/about" },
    { label: "Contact Us", href: "/contact" },
    { label: "FAQs", href: "/faqs" },
    { label: "Help & Support", href: "/support" },
    { label: "Partner with Gulsaga", href: "/partner-registration" },
  ],
  experiencesTitle: "Our Experiences",
  experiences: [
    { label: "Curated Resort Stays", icon: "bed" },
    { label: "Art Residency Programs", icon: "lotus" },
    { label: "Destination Weddings", icon: "rings" },
    { label: "Luxury Holiday Experiences", icon: "mountain" },
    { label: "Exclusive Member Privileges", icon: "crown" },
  ],
  contactTitle: "Get in Touch",
  phone: "+91 7499 658 454",
  email: "LuxuryTravel@gulsaga.com",
  location: "Mumbai, Maharashtra, India",
  whatsappLabel: "Chat on WhatsApp",
  whatsappNumber: "+91 7499 658 454",
  newsletterTitle: "Stay Updated",
  newsletterDescription:
    "Verify your email for updates on destinations and experiences. This preview doesn't store subscriptions.",
  socials: [
    { label: "LinkedIn", href: "", icon: "linkedin" },
    { label: "Instagram", href: "", icon: "instagram" },
    { label: "YouTube", href: "", icon: "youtube" },
    { label: "Facebook", href: "", icon: "facebook" },
  ],
  copyright: "All Rights Reserved.",
  legalLinks: [
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Cancellation & Refunds", href: "/cancellation" },
  ],
};

export const initialContactPageContent: ContactPageContent = {
  heroEyebrow: "CONTACT US",
  heroTitle: "Let’s Plan Your\nNext Hospitality Experience.",
  heroDescription:
    "Have a question, a partnership idea, or a special request? We’d love to hear from you.",
  contactHeading: "Get in Touch",
  contactDescription:
    "Our team is here to help with your stays, memberships, events, partnerships and more.",
  officeHeading: "Our Office",
  officeName: "Gulsaga Hospitality",
  officeHours: "Contact us by phone, email or WhatsApp.",
  mapLabel: "View on Google Maps",
  heroMedia: image("Contact page resort panorama", alpineResort),
  officeImage: null,
  inquiryCategories: [
    { label: "Resort Bookings", description: "Inquire about stays & availability", icon: "bed" },
    { label: "Membership", description: "Learn about membership plans & benefits", icon: "crown" },
    {
      label: "Destination Weddings",
      description: "Plan your special celebration with us",
      icon: "rings",
    },
    {
      label: "Partnerships",
      description: "Collaborate with Gulsaga as a hotel or experience partner",
      icon: "handshake",
    },
    {
      label: "General Enquiry",
      description: "For any other questions or support",
      icon: "calendar",
    },
  ],
};

export const initialAboutPageContent: AboutPageContent = {
  heroEyebrow: "ABOUT GULSAGA",
  heroTitle: "Crafting Meaningful\nHospitality Experiences",
  heroDescription:
    "A hospitality brand rooted in heritage, culture, art and exceptional stays across inspiring destinations.",
  heroMedia: image("About Gulsaga cinematic resort", alpineResort),
  storyHeading: "Our Story",
  story:
    "Gulsaga brings together considered stays, creative experiences and places with a strong sense of character. We believe hospitality can be more than a place to stay: it can connect people with culture, art and the communities around them.",
  storyImage: image("A welcoming heritage-inspired stay", destinationHero),
  journeyVideo: null,
  vision:
    "To be a thoughtful curator of hospitality, art and cultural experiences across India and beyond.",
  mission:
    "To connect guests with distinctive stays and meaningful experiences that celebrate place, nature and people.",
  values: ["Authenticity", "Thoughtful hospitality", "Cultural connection", "Inclusive growth"],
  achievements: [],
  services: [
    {
      title: "Curated Resort Stays",
      description: "Discover distinctive places to pause, reconnect and explore.",
    },
    {
      title: "Art Residencies",
      description: "Make room for creative exchange in inspiring settings.",
    },
    {
      title: "Destination Weddings",
      description: "Bring people together for celebrations shaped by place.",
    },
    {
      title: "Travel Experiences",
      description: "Find thoughtful ways to experience a destination.",
    },
    {
      title: "Membership",
      description: "Explore a considered approach to planning future escapes.",
    },
    {
      title: "Hospitality Partnerships",
      description: "Connect with a collection built around shared values.",
    },
  ],
  founderName: "XYZ",
  founderTitle: "Founder & Director",
  founderMessage:
    "Gulsaga is a vision for more thoughtful travel—bringing together meaningful stays, creative experiences and the people who make every place memorable.",
  founderImage: null,
  milestones: [
    {
      chapter: "THE IDEA",
      title: "A more meaningful way to travel",
      description: "A point of view shaped by place, culture and thoughtful hospitality.",
    },
    {
      chapter: "THE COLLECTION",
      title: "Places with character",
      description: "A growing focus on stays and experiences with their own sense of identity.",
    },
    {
      chapter: "THE COMMUNITY",
      title: "Experiences, shared",
      description: "Making space for travellers, artists and hospitality partners to connect.",
    },
  ],
  sustainabilityHeading: "Hospitality with a sense of place",
  sustainabilityDescription:
    "Our approach is evolving. We aspire to create experiences that respect the character, culture and community of every place.",
  testimonials: [],
  pressLinks: [],
  ctaHeading: "Be a Part of the Gulsaga Journey",
  ctaDescription: "Join a community of travellers, artists, partners and experience seekers.",
  ctaLabel: "Join Membership",
};

function hotelAt(index: number) {
  const hotel = hotels[index];

  if (!hotel) {
    throw new Error(`Missing hotel collection entry at index ${index}`);
  }

  return hotel;
}

const firstHotel = hotelAt(0);
const secondHotel = hotelAt(1);
const thirdHotel = hotelAt(2);

export const initialHomeContent: HomeContent = {
  brand: {
    name: "Gulsaga",
    logo: image("Gulsaga Hospitality logo", gulsagaLogo),
    navigation: [
      "Home",
      "Membership",
      "Destinations",
      "Resorts",
      "Experiences",
      "Our Network",
      "About Us",
      "Contact",
    ],
    membershipLabel: "Join membership",
    announcement: "A little escape. A lifetime of memories.",
  },
  hero: {
    eyebrow: "GULSAGA · ART RESIDENCY",
    title: "Holiday for 5 years.",
    highlight: "Get 50% back.*",
    description:
      "A luxury holiday membership with stays at curated resorts, art residencies and destination wedding experiences.",
    primaryLabel: "Become a Member",
    secondaryLabel: "Explore Destinations",
    image: image("Gulsaga mountain resort", alpineResort),
    globe: image("Floating resort globe"),
    perks: ["Curated Resort Stays", "Exclusive Member Benefits", "Flexible Holiday Planning"],
    footnote: "*Membership refund terms apply.",
    scrollLabel: "Discover the collection",
    scrollEyebrow: "EXTRAORDINARY PLACES. MEANINGFUL MOMENTS.",
  },
  network: {
    eyebrow: "A COLLECTION WITH CHARACTER",
    heading: "Our hospitality network",
    description:
      "Stay, celebrate and create with our curated network of trusted hospitality partners.",
    valuePropositions: {
      traveller: {
        eyebrow: "FOR TRAVELLERS & MEMBERS",
        heading: "Why explore with Gulsaga?",
        description:
          "Bring stays, meaningful experiences and destination ideas together in one considered place.",
        points: [
          {
            title: "Find a stay that fits your journey",
            description: "Explore different destinations, hotel styles and ways to get away.",
          },
          {
            title: "Plan more than just a room",
            description: "Discover ideas for holidays, creative stays and celebrations.",
          },
          {
            title: "Understand your membership",
            description: "Ask our team which privileges and terms apply before you book.",
          },
        ],
        ctaLabel: "Explore membership",
      },
      partner: {
        eyebrow: "FOR HOTELS & HOSPITALITY PARTNERS",
        heading: "Why partner with Gulsaga?",
        description:
          "Give your property a place in a hospitality collection built around considered stays and memorable occasions.",
        points: [
          {
            title: "Introduce your property to new audiences",
            description: "Share what makes your location and guest experience distinctive.",
          },
          {
            title: "Showcase the experiences you offer",
            description: "Highlight stays, wellness, creative retreats or event possibilities.",
          },
          {
            title: "Start a direct partnership conversation",
            description: "Discuss fit, presentation and commercial terms with our team.",
          },
        ],
        ctaLabel: "Discuss a partnership",
      },
    },
    partners: initialNetworkPartners,
  },
  about: {
    eyebrow: "A MORE PERSONAL WAY TO GET AWAY",
    heading: "About Gulsaga",
    description:
      "A lifestyle hospitality brand that brings together luxury holidays, art residency memberships and destination weddings at extraordinary locations.",
    images: [
      image(firstHotel.name, firstHotel.image),
      image(secondHotel.name, secondHotel.image),
      image(thirdHotel.name, thirdHotel.image),
    ],
    services: [
      {
        title: "Art Residency Membership",
        description: "Stay, create and showcase your work at inspiring destinations.",
      },
      {
        title: "Destination Weddings",
        description: "Celebrate your special day at stunning, handpicked locations.",
      },
      {
        title: "Curated Holiday Experiences",
        description: "Personalized stays, unique activities and memorable getaways.",
      },
    ],
  },
  membership: {
    eyebrow: "ART RESIDENCY · FIRST 100 MEMBERS",
    heading: "A little time away, every year.",
    description:
      "Five annual holidays, stays across India and considered member benefits. Make memories at your own pace.",
    benefits: [
      "Five holidays over five years",
      "Six nights and seven days each year",
      "Choose from 25 destinations across India",
    ],
    cta: "Discover membership",
    years: "5",
    metricHeading: "YOUR NEXT FIVE YEARS",
    refundTerms: "50% refund after 61 months*",
    termsNote: "Subject to availability and membership terms.",
    media: null,
  },
  featured: {
    eyebrow: "A GULSAGA MOMENT",
    heading: "Find your stillness.",
    description: "Golden evenings, unhurried mornings and a little more room to reconnect.",
    location: "KERALA, INDIA",
    cta: "Find your next escape",
    media: image("Featured Kerala resort"),
  },
  invitation: {
    eyebrow: "YOUR NEXT CHAPTER",
    heading: "Where will you wake up?",
    description: "Let’s find a place that feels a little like yours.",
    cta: "Plan your holiday",
    media: null,
  },
};

export type LoginPageContent = {
  background: HomeMedia;
  headline: string;
  intro: string;
  highlights: string[];
  formTitle: string;
  formSubtitle: string;
};

export const initialLoginPageContent: LoginPageContent = {
  background: image("Resort terrace at sunset", destinationHero),
  headline: "Welcome Back",
  intro:
    "Sign in to your Gulsaga account and continue your journey of exclusive stays, experiences and memberships.",
  highlights: ["Book Curated Stays", "Manage Membership", "Save Your Favorites", "Track Bookings"],
  formTitle: "Login to Your Account",
  formSubtitle: "Access bookings, membership benefits and more.",
};

export type SiteVisibility = { hidden: string[] };
export const initialSiteVisibility: SiteVisibility = { hidden: [] };

export const visibilityPages = [
  { id: "/membership", label: "Membership" },
  { id: "/destinations", label: "Destinations" },
  { id: "/resorts", label: "Resorts" },
  { id: "/experiences", label: "Experiences" },
  { id: "/network", label: "Our Network" },
  { id: "/about", label: "About" },
  { id: "/contact", label: "Contact" },
  { id: "/support", label: "Support" },
  { id: "/faqs", label: "FAQs" },
] as const;

export const visibilitySections = [
  { id: "home:hero", label: "Hero (top banner)" },
  { id: "home:network", label: "Hospitality network" },
  { id: "home:about", label: "About Gulsaga" },
  { id: "home:membership", label: "Membership" },
  { id: "home:featured", label: "Featured resort" },
  { id: "home:invitation", label: "Closing invitation" },
] as const;

export const destinationSections = [
  { id: "destinations:hero", label: "Hero banner" },
  { id: "destinations:highlights", label: "Highlights strip (Luxury Stays, Art Residencies…)" },
  { id: "destinations:collection", label: "Popular destinations list" },
  { id: "destinations:map", label: "Map image above the footer" },
] as const;

export const footerSections = [
  { id: "footer:scenic", label: "Footer scenic image (top of footer)" },
] as const;

export const footerPages = [
  { id: "footer:/", label: "Home" },
  { id: "footer:/membership", label: "Membership" },
  { id: "footer:/destinations", label: "Destinations" },
  { id: "footer:/resorts", label: "Resorts" },
  { id: "footer:/experiences", label: "Experiences" },
  { id: "footer:/network", label: "Our Network" },
  { id: "footer:/about", label: "About" },
  { id: "footer:/contact", label: "Contact" },
  { id: "footer:/support", label: "Support" },
  { id: "footer:/faqs", label: "FAQs" },
  { id: "footer:/hotels", label: "Hotels" },
  { id: "footer:/partner-registration", label: "Partner registration" },
  { id: "footer:/privacy", label: "Privacy" },
  { id: "footer:/terms", label: "Terms" },
  { id: "footer:/cancellation", label: "Cancellation & refunds" },
] as const;

type HomeContentContextValue = {
  visibility: SiteVisibility;
  updateVisibility: (visibility: SiteVisibility) => void;
  isHidden: (id: string) => boolean;
  loginPageContent: LoginPageContent;
  updateLoginPageContent: (content: LoginPageContent) => void;
  content: HomeContent;
  updateContent: (content: HomeContent) => void;
  footerContent: FooterContent;
  updateFooterContent: (content: FooterContent) => void;
  contactPageContent: ContactPageContent;
  updateContactPageContent: (content: ContactPageContent) => void;
  aboutPageContent: AboutPageContent;
  updateAboutPageContent: (content: AboutPageContent) => void;
  destinationPageContent: DestinationPageContent;
  updateDestinationPageContent: (content: DestinationPageContent) => void;
  experiencesPageContent: ExperiencePageContent;
  updateExperiencesPageContent: (content: ExperiencePageContent) => void;
  adminDashboardContent: AdminDashboardContent;
  updateAdminDashboardContent: (content: AdminDashboardContent) => void;
  networkPageContent: NetworkPageContent;
  updateNetworkPageContent: (content: NetworkPageContent) => void;
  destinations: Destination[];
  updateDestinations: (destinations: Destination[]) => void;
  resortPageContent: ResortPageContent;
  updateResortPageContent: (content: ResortPageContent) => void;
  resorts: Resort[];
  updateResorts: (resorts: Resort[]) => void;
  membershipPageContent: MembershipPageContent;
  updateMembershipPageContent: (content: MembershipPageContent) => void;
  membershipOfferMedia: HomeMedia;
  updateMembershipOfferMedia: (media: HomeMedia) => void;
  createPreviewMedia: (file: File) => HomeMedia;
  contentLoaded: boolean;
  saveStatus: SaveStatus;
};

const HomeContentContext = createContext<HomeContentContextValue | null>(null);

function usePersisted<T>(
  key: string,
  initial: T,
  persistence: ReturnType<typeof useContentPersistence>,
) {
  const [value, setValue] = useState(initial);
  const { register, schedule } = persistence;
  register(key, initial, (stored) => setValue(stored as T));
  const update = useCallback(
    (next: T) => {
      setValue(next);
      schedule(key, next);
    },
    [key, schedule],
  );
  return [value, update] as const;
}

export function HomeContentProvider({ children }: { children: ReactNode }) {
  const persistence = useContentPersistence();
  const [content, updateContent] = usePersisted("home", initialHomeContent, persistence);
  const [footerContent, updateFooterContent] = usePersisted(
    "footer",
    initialFooterContent,
    persistence,
  );
  const [contactPageContent, updateContactPageContent] = usePersisted(
    "contact",
    initialContactPageContent,
    persistence,
  );
  const [aboutPageContent, updateAboutPageContent] = usePersisted(
    "about",
    initialAboutPageContent,
    persistence,
  );
  const [destinationPageContent, updateDestinationPageContent] = usePersisted(
    "destinationPage",
    initialDestinationPageContent,
    persistence,
  );
  const [experiencesStored, updateExperiencesPageContent] = usePersisted(
    "experiencePage",
    initialExperiencePageContent,
    persistence,
  );
  // Older saved content has no dashboard fields yet, so fill them from the defaults.
  const experiencesPageContent = { ...initialExperiencePageContent, ...experiencesStored };
  const [adminDashboardContent, updateAdminDashboardContent] = usePersisted(
    "adminDashboard",
    initialAdminDashboardContent,
    persistence,
  );
  const [networkPageContent, updateNetworkPageContent] = usePersisted(
    "networkPage",
    initialNetworkPageContent,
    persistence,
  );
  const [destinations, updateDestinations] = usePersisted(
    "destinations",
    initialDestinations,
    persistence,
  );
  const [resortPageContent, updateResortPageContent] = usePersisted(
    "resortPage",
    initialResortPageContent,
    persistence,
  );
  const [resorts, updateResorts] = usePersisted("resorts", initialResorts, persistence);
  const [membershipPageContent, updateMembershipPageContent] = usePersisted(
    "membershipPage",
    initialMembershipPageContent,
    persistence,
  );
  const [membershipOfferMedia, updateMembershipOfferMedia] = usePersisted(
    "membershipOfferMedia",
    initialMembershipOfferMedia,
    persistence,
  );
  const [loginPageContent, updateLoginPageContent] = usePersisted(
    "loginPage",
    initialLoginPageContent,
    persistence,
  );
  const [visibility, updateVisibility] = usePersisted(
    "visibility",
    initialSiteVisibility,
    persistence,
  );
  const hiddenIds = Array.isArray(visibility.hidden) ? visibility.hidden : [];
  const isHidden = (id: string) =>
    hiddenIds.some(
      (hidden) => hidden === id || (id.startsWith("/") && id.startsWith(`${hidden}/`)),
    );
  const previewUrls = useRef<string[]>([]);
  const [live, setLive] = useState<LiveProperty[]>([]);

  useEffect(() => {
    void apiRequest<{ rows: LiveProperty[] }>("public/partner-properties")
      .then(({ data }) => setLive(data.rows))
      .catch(() => undefined);
  }, []);

  // Published partner properties are shown on the public pages but never saved into the editable content.
  const liveNames = new Set(live.map((item) => item.name.toLowerCase()));
  const merged = useMemo(
    () => mergeLive({ resorts, destinations, partners: content.network.partners }, live),
    [resorts, destinations, content.network.partners, live],
  );
  const shownContent = useMemo(
    () => ({ ...content, network: { ...content.network, partners: merged.partners } }),
    [content, merged.partners],
  );
  const saveContent = (next: HomeContent) =>
    updateContent({
      ...next,
      network: {
        ...next.network,
        partners: next.network.partners.filter((item) => !isLiveEntry(item.id)),
      },
    });
  const saveResorts = (next: Resort[]) =>
    updateResorts(next.filter((item) => !isLiveEntry(item.id)));
  const saveDestinations = (next: Destination[]) =>
    updateDestinations(
      next
        .filter((item) => !isLiveEntry(item.id))
        .map((item) =>
          item.detail?.stays
            ? {
                ...item,
                detail: {
                  ...item.detail,
                  stays: item.detail.stays.filter((stay) => !liveNames.has(stay.name.toLowerCase())),
                },
              }
            : item,
        ),
    );

  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const createPreviewMedia = (file: File): HomeMedia => {
    const src = URL.createObjectURL(file);
    previewUrls.current.push(src);
    persistence.rememberFile(src, file);
    return {
      src,
      type: file.type.startsWith("video/") ? "video" : "image",
      name: file.name,
    };
  };

  return (
    <HomeContentContext.Provider
      value={{
        visibility,
        updateVisibility,
        isHidden,
        loginPageContent,
        updateLoginPageContent,
        content: shownContent,
        updateContent: saveContent,
        footerContent,
        updateFooterContent,
        contactPageContent,
        updateContactPageContent,
        aboutPageContent,
        updateAboutPageContent,
        destinationPageContent,
        updateDestinationPageContent,
        experiencesPageContent,
        updateExperiencesPageContent,
        adminDashboardContent,
        updateAdminDashboardContent,
        networkPageContent,
        updateNetworkPageContent,
        destinations: merged.destinations,
        updateDestinations: saveDestinations,
        resortPageContent,
        updateResortPageContent,
        resorts: merged.resorts,
        updateResorts: saveResorts,
        membershipPageContent,
        updateMembershipPageContent,
        membershipOfferMedia,
        updateMembershipOfferMedia,
        createPreviewMedia,
        contentLoaded: persistence.hydrated,
        saveStatus: persistence.status,
      }}
    >
      {children}
    </HomeContentContext.Provider>
  );
}

export function useHomeContent() {
  const context = useContext(HomeContentContext);

  if (!context) {
    throw new Error("useHomeContent must be used within HomeContentProvider");
  }

  return context;
}
