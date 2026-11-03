import { ArrowUpRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { hotels } from "@/lib/hotel-data";
import { PreviewImage } from "@/components/preview-image";
export function HotelCard({ hotel }: { hotel: (typeof hotels)[number] }) {
  return (
    <article className="stay-card">
      <Link to="/contact" search={{ hotel: hotel.name }} className="stay-image">
        <PreviewImage src={hotel.image} alt={hotel.name} width={600} height={400} />
        <span>{hotel.theme}</span>
      </Link>
      <div className="stay-info">
        <p className="stars">★★★★★</p>
        <h3>{hotel.name}</h3>
        <p>
          <MapPin size={13} />
          {hotel.location}
        </p>
        <Button variant="link" asChild className="p-0">
          <Link to="/contact" search={{ hotel: hotel.name }}>
            Explore this stay <ArrowUpRight />
          </Link>
        </Button>
      </div>
    </article>
  );
}
