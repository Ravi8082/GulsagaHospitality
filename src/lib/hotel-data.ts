import juna from "@/assets/destinations/juna-mahal.webp";
import manali from "@/assets/destinations/himachal.jpg";
import kerala from "@/assets/destinations/kerala.jpg";
import resort from "@/assets/destinations/resort-pool.jpg";
export const resortFallback = resort;
export const hotels = [
  {
    id: 1,
    name: "Juna Mahal",
    location: "Ranthambore, Rajasthan",
    theme: "Heritage & safari",
    image: juna,
    price: 8500,
  },
  {
    id: 2,
    name: "Manuallaya",
    location: "Manali, Himachal Pradesh",
    theme: "Mountains & meadows",
    image: manali,
    price: 7200,
  },
  {
    id: 3,
    name: "Kumarakom Lake Resort",
    location: "Kumarakom, Kerala",
    theme: "Lakes & backwaters",
    image: kerala,
    price: 12500,
  },
];
export const money = (n: number) => "₹" + n.toLocaleString("en-IN");
export const pageHead = (title: string, description: string) => ({
  meta: [
    { title: title + " | Gulsaga Hospitality" },
    { name: "description", content: description },
    { property: "og:title", content: title + " | Gulsaga Hospitality" },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
});
