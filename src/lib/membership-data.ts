import membershipHero from "@/assets/destinations/destination-hero-reference.jpg";
import resortPool from "@/assets/destinations/resort-pool.jpg";
import type { HomeMedia } from "@/lib/home-content";

export type MembershipBenefit = {
  id: string;
  icon: "bed" | "flower" | "rings" | "mountain" | "star" | "gift" | "calendar" | "support";
  title: string;
};

export type MembershipStep = {
  id: string;
  marker?: string;
  title: string;
  description: string;
};

export type MembershipPlan = {
  id: string;
  name: string;
  priceInr: number;
  years: number;
  features: string[];
  badge: string;
  cta: string;
  contactOnly: boolean;
  image?: string;
  tagline?: string;
};

export const defaultMembershipPlans: MembershipPlan[] = [
  {
    id: "premium",
    name: "Premium",
    priceInr: 200000,
    years: 5,
    image: "/membership/premium.jpg",
    features: ["Up to 10 Resort Stays", "Access to Partner Resorts", "Member Exclusive Offers", "Priority Bookings"],
    badge: "",
    cta: "Choose Plan",
    contactOnly: false,
  },
  {
    id: "platinum",
    name: "Platinum",
    priceInr: 350000,
    years: 5,
    image: "/membership/platinum.jpg",
    features: ["Up to 20 Resort Stays", "Art & Creative Residences", "Destination Wedding Access", "50% Back (Travel Credits)", "Dedicated Membership Advisor"],
    badge: "Most Popular",
    cta: "Choose Plan",
    contactOnly: false,
  },
  {
    id: "elite",
    name: "Elite",
    priceInr: 500000,
    years: 5,
    image: "/membership/elite.jpg",
    features: ["Unlimited Resort Stays*", "Priority Event Access", "Complimentary Upgrades", "50% Back (Higher Value)", "Family Coverage (Up to 6)"],
    badge: "",
    cta: "Choose Plan",
    contactOnly: false,
  },
  {
    id: "custom",
    name: "Custom",
    priceInr: 0,
    years: 5,
    image: "/membership/custom.jpg",
    tagline: "Tailored for You",
    features: ["Personalized Benefits", "Flexible Duration", "Group / Corporate Plans", "Special Requirements", "Dedicated Relationship Manager"],
    badge: "",
    cta: "Enquire Now",
    contactOnly: true,
  },
];

export type DestinationPitch = {
  id: string;
  name: string;
  tagline: string;
  nearby: string[];
  activities: string[];
};

export const defaultDestinationPitches: DestinationPitch[] = [
  {
    id: "goa",
    name: "Goa",
    tagline: "Sun, sand and slow evenings - made effortless for members.",
    nearby: ["Baga & Calangute beaches", "Fort Aguada", "Basilica of Bom Jesus", "Dudhsagar Falls"],
    activities: ["Sunset cruise", "Water sports", "Old Goa heritage walk", "Spice plantation lunch"],
  },
  {
    id: "kerala",
    name: "Kerala",
    tagline: "Backwaters, hills and ayurveda at your own pace.",
    nearby: ["Alleppey backwaters", "Munnar tea gardens", "Kovalam beach", "Periyar wildlife reserve"],
    activities: ["Houseboat stay", "Ayurvedic spa", "Tea estate tour", "Kathakali evening"],
  },
  {
    id: "rajasthan",
    name: "Rajasthan",
    tagline: "Palaces, forts and desert nights.",
    nearby: ["Amer Fort", "City Palace Udaipur", "Lake Pichola", "Jaisalmer dunes"],
    activities: ["Camel safari", "Palace dining", "Folk music night", "Heritage city tour"],
  },
  {
    id: "himachal",
    name: "Himachal",
    tagline: "Mountain air, snow and quiet getaways.",
    nearby: ["Mall Road Shimla", "Solang Valley", "Rohtang Pass", "Kasol & Parvati valley"],
    activities: ["Paragliding", "Snow trek", "River rafting", "Cafe hopping"],
  },
];

export const findDestinationPitch = (pitches: DestinationPitch[], place: string) => {
  const needle = place.trim().toLowerCase();
  if (!needle) return undefined;
  return pitches.find((pitch) => {
    const name = pitch.name.trim().toLowerCase();
    return name && (needle.includes(name) || name.includes(needle));
  });
};
export const formatInr = (amount: number) => `₹${new Intl.NumberFormat("en-IN").format(amount)}`;
export type MembershipPageContent = {
  tiers?: MembershipPlan[];
  destinationPitches?: DestinationPitch[];
  destinationPitchCta?: string;
  whatsappMessage?: string;
  offerText?: string;
  plansHeading?: string;
  plansNote?: string;
  eyebrow: string;
  heading: string;
  highlight: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
  scrollLabel: string;
  cardTier: string;
  cardLabel: string;
  heroMedia: HomeMedia;
  benefitsHeading: string;
  benefits: MembershipBenefit[];
  stepsHeading: string;
  steps: MembershipStep[];
  offerEyebrow: string;
  offerHeading: string;
  offerNote: string;
  refundDisclaimer: string;
  offerPerks: string[];
  offerCta: string;
  highlights: string[];
  years: string;
  eligibilityHeading: string;
  eligibility: string;
  pricingHeading: string;
  pricingEyebrow: string;
  inclusionsHeading: string;
  planInclusions: string[];
  price: string;
  taxNote: string;
  downPaymentLabel: string;
  downPayment: string;
  balanceLabel: string;
  balance: string;
  quarterlyLabel: string;
  quarterlyPayment: string;
  monthlyLabel: string;
  monthlyPayment: string;
  pricingNote: string;
  timelineHeading: string;
  timeline: MembershipStep[];
  termsHeading: string;
  termsSummary: string;
  terms: string;
  enquiryHeading: string;
  enquiryDescription: string;
  enquiryNote: string;
  enquiryCta: string;
  dashboardCta: string;
};

const image = (name: string, src: string): HomeMedia => ({
  src,
  type: "image",
  name,
});

export const initialMembershipPageContent: MembershipPageContent = {
  eyebrow: "THE GULSAGA MEMBERSHIP",
  heading: "Holiday for 5 Years.",
  highlight: "Get 50% Back.",
  description:
    "A long-term holiday membership that gives you curated stays, art residencies and destination wedding experiences at our partner resorts.",
  primaryLabel: "Become a Member",
  secondaryLabel: "See How It Works",
  scrollLabel: "Discover membership",
  cardTier: "PRIVILEGE",
  cardLabel: "MEMBERSHIP",
  heroMedia: image("Gulsaga membership resort", membershipHero),
  benefitsHeading: "Membership Benefits",
  benefits: [
    { id: "curated-stays", icon: "bed", title: "Stay at Curated Resorts" },
    { id: "art-residencies", icon: "flower", title: "Art & Creative Residencies" },
    { id: "destination-weddings", icon: "rings", title: "Destination Weddings" },
    { id: "diverse-destinations", icon: "mountain", title: "Diverse Destinations" },
    { id: "member-offers", icon: "star", title: "Exclusive Member Offers" },
    { id: "partner-privileges", icon: "gift", title: "Partner Privileges" },
    { id: "priority-bookings", icon: "calendar", title: "Priority Bookings" },
    { id: "dedicated-support", icon: "support", title: "Dedicated Support" },
  ],
  stepsHeading: "How It Works",
  steps: [
    {
      id: "enquire",
      title: "Enquire & Apply",
      description: "Share your interest and get detailed membership information.",
    },
    {
      id: "choose-plan",
      title: "Choose Your Plan",
      description: "Select the membership payment schedule that suits your needs.",
    },
    {
      id: "holiday-journey",
      title: "Start Your Holiday Journey",
      description: "Enjoy curated stays and member experiences over five years.",
    },
  ],
  offerEyebrow: "MEMBERSHIP OFFER",
  offerHeading: "50% Back",
  offerNote: "ON YOUR MEMBERSHIP*",
  refundDisclaimer:
    "*50% refund after 61 months for the first 100 members, subject to signed agreement.",
  offerPerks: ["5 Year Membership", "Multiple Stays", "Exclusive Experiences"],
  offerCta: "Explore Membership",
  highlights: [
    "Curated Resort Stays",
    "Art Residency Access",
    "Destination Weddings",
    "Exclusive Member Privileges",
    "Special Partner Offers",
  ],
  years: "5",
  eligibilityHeading: "Membership eligibility",
  eligibility:
    "The current membership plan is for 2 adults and 1 child under 10 years. The 50% refund offer is for the first 100 members and is subject to the signed membership agreement.",
  pricingHeading: "Membership plan & payment",
  pricingEyebrow: "MEMBERSHIP ELIGIBILITY",
  inclusionsHeading: "Included in your membership",
  planInclusions: [
    "5 annual holidays over 5 years, 6 nights and 7 days each",
    "2 adults and 1 child under 10 years",
    "Choose from 25 destinations across India",
    "Stay, one breakfast a day and station or airport transfers",
    "50% refund after 61 months for the first 100 members, as per the signed agreement",
    "Flexible payment: 30% down payment, balance in 4 quarterly or 12 monthly instalments",
    "Stays at 5-star hotels and our own or associate properties, subject to availability",
    "Dedicated concierge support for planning every holiday",
  ],
  price: "â‚¹5,50,000",
  taxNote: "+ GST",
  downPaymentLabel: "Down payment Â· 30%",
  downPayment: "â‚¹1,65,000",
  balanceLabel: "Balance",
  balance: "â‚¹3,85,000",
  quarterlyLabel: "4 quarterly instalments",
  quarterlyPayment: "â‚¹96,250",
  monthlyLabel: "12 monthly instalments",
  monthlyPayment: "â‚¹32,083.33",
  pricingNote:
    "Balance paid within one year. Monthly final instalment adjusted for rounding. Final schedule and benefits follow your signed agreement. Online payment is not available in this preview.",
  timelineHeading: "A five-year holiday journey",
  timeline: [
    {
      id: "year-1",
      marker: "01",
      title: "Year 1",
      description: "Stay at a 5-star hotel, subject to availability and membership terms.",
    },
    {
      id: "year-2",
      marker: "02",
      title: "Year 2",
      description: "Stay at a 5-star hotel, subject to availability and membership terms.",
    },
    {
      id: "year-3",
      marker: "03",
      title: "Year 3",
      description: "Stay at own or associate properties, subject to availability and agreement.",
    },
    {
      id: "year-4",
      marker: "04",
      title: "Year 4",
      description: "Stay at own or associate properties, subject to availability and agreement.",
    },
    {
      id: "year-5",
      marker: "05",
      title: "Year 5",
      description: "Stay at own or associate properties, subject to availability and agreement.",
    },
  ],
  termsHeading: "Membership terms",
  termsSummary: "Booking, eligibility & refund terms",
  terms:
    "Plan for five annual holidays of six nights and seven days. Book two months in advance. Cancellations made 30 days before a stay may be carried forward or resumed. Holidays may be carried forward for up to two years; split stays may be arranged as two three-night stays. Transfers require prior intimation. All stays, availability and the 50% refund after 61 months are governed by the signed agreement and company terms.",
  enquiryHeading: "Ready to plan your membership?",
  enquiryDescription:
    "Send an enquiry to our team for current availability, the complete membership plan and its signed terms.",
  enquiryNote:
    "Submitting the contact form opens your email app. Automated email notifications and application tracking are not connected in this preview.",
  enquiryCta: "Enquire about Membership",
  dashboardCta: "Member dashboard preview",
};

export const initialMembershipOfferMedia = image("Membership offer resort", resortPool);

