import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Tag } from "lucide-react";
import { apiRequest } from "@/lib/experience-api";
import { mediaSrc } from "@/components/partner-modules";
import { formatInr } from "@/lib/membership-data";

export type MemberOffer = {
  id: number;
  title: string;
  resort: string;
  location: string;
  image: string;
  description: string;
  discountPercent: number;
  price: number;
  validFrom: string;
  validTo: string;
};

export type MemberBooking = {
  id: number;
  status: string;
  guests: number;
  amount: number | null;
  resort: string | null;
  location: string | null;
  checkIn: string;
  checkOut: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const nights = (a: string, b: string) =>
  Math.max(1, Math.round((Date.parse(b) - Date.parse(a)) / 86400000));

export const bookingGroup = (b: MemberBooking) =>
  b.status === "CANCELLED"
    ? "Cancelled"
    : b.status === "CHECKED_OUT" || b.checkOut < today()
      ? "Completed"
      : "Upcoming";

export type MemberBacks = {
  eligible: number;
  benefit: number;
  credited: number;
  pending: number;
  rows: { id: number; kind: string; amount: number; note: string | null; at: string }[];
};

export function useMemberExtras() {
  const [offers, setOffers] = useState<MemberOffer[]>([]);
  const [offersActive, setOffersActive] = useState(false);
  const [bookings, setBookings] = useState<MemberBooking[]>([]);
  const [backs, setBacks] = useState<MemberBacks | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void Promise.all([
      apiRequest<MemberBacks>("community/experiences/member/backs")
        .then(({ data }) => setBacks(data))
        .catch(() => undefined),
      apiRequest<{ active: boolean; rows: MemberOffer[] }>("community/experiences/member/offers")
        .then(({ data }) => {
          setOffers(data.rows);
          setOffersActive(data.active);
        })
        .catch(() => undefined),
      apiRequest<{ rows: MemberBooking[] }>("community/experiences/member/bookings")
        .then(({ data }) => setBookings(data.rows))
        .catch(() => undefined),
    ]).finally(() => setLoaded(true));
  }, []);

  return { offers, offersActive, bookings, backs, loaded };
}

export function BookingCard({ booking }: { booking: MemberBooking }) {
  const group = bookingGroup(booking);
  const dateText = `${fmt(booking.checkIn)} → ${fmt(booking.checkOut)}`;
  return (
    <li className="mx-booking" data-group={group}>
      <div>
        <strong>{booking.resort ?? "Gulsaga stay"}</strong>
        {booking.location ? (
          <small>
            <MapPin size={12} /> {booking.location}
          </small>
        ) : null}
        <small>
          <CalendarDays size={12} /> {dateText} · {nights(booking.checkIn, booking.checkOut)} night
          {nights(booking.checkIn, booking.checkOut) > 1 ? "s" : ""} · {booking.guests} guest
          {booking.guests > 1 ? "s" : ""}
        </small>
      </div>
      <div className="mx-booking-side">
        <span className="md-badge">{booking.status.replace(/_/g, " ").toLowerCase()}</span>
        {booking.amount ? <b>{formatInr(booking.amount)}</b> : null}
      </div>
    </li>
  );
}

export function BookingsView({ bookings, loaded }: { bookings: MemberBooking[]; loaded: boolean }) {
  const groups = ["Upcoming", "Completed", "Cancelled"] as const;
  const [tab, setTab] = useState<(typeof groups)[number]>("Upcoming");
  const counts = Object.fromEntries(groups.map((g) => [g, bookings.filter((b) => bookingGroup(b) === g).length]));
  const rows = bookings.filter((b) => bookingGroup(b) === tab);
  return (
    <section className="md-panel">
      <h2>My bookings</h2>
      <div className="md-tabs" role="tablist">
        {groups.map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={tab === g}
            data-on={tab === g}
            onClick={() => setTab(g)}
          >
            {g} · {counts[g]}
          </button>
        ))}
      </div>
      {rows.length ? (
        <ul className="mx-list">
          {rows.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </ul>
      ) : (
        <p className="md-note">
          {loaded ? `No ${tab.toLowerCase()} bookings.` : "Loading…"}{" "}
          {tab === "Upcoming" ? (
            <>
              <Link to="/resorts">Browse stays</Link> or{" "}
              <Link to="/contact" search={{ hotel: "" }}>
                contact Gulsaga
              </Link>{" "}
              to book.
            </>
          ) : null}
        </p>
      )}
      <p className="md-note">
        Bookings appear here when the property records them against the phone number on your
        membership.
      </p>
    </section>
  );
}

export function OffersView({
  offers,
  active,
  loaded,
  perks,
}: {
  offers: MemberOffer[];
  active: boolean;
  loaded: boolean;
  perks: string[];
}) {
  return (
    <section className="md-panel">
      <h2>Exclusive offers</h2>
      {!active && loaded ? (
        <p className="md-note">Member offers unlock once your membership is active.</p>
      ) : null}
      {active && offers.length === 0 ? (
        <p className="md-note">No offers right now. New partner offers appear here as they go live.</p>
      ) : null}
      {offers.length ? (
        <div className="mx-offers">
          {offers.map((o) => (
            <article key={o.id} className="mx-offer">
              {o.image ? <img src={mediaSrc(o.image)} alt="" loading="lazy" /> : null}
              {o.discountPercent ? <em>{o.discountPercent}% off</em> : null}
              <h3>{o.title}</h3>
              <small>
                <MapPin size={12} /> {o.resort}
                {o.location ? `, ${o.location}` : ""}
              </small>
              {o.description ? <p>{o.description}</p> : null}
              <div className="mx-offer-foot">
                {o.price ? <b>{formatInr(o.price)}</b> : <span />}
                {o.validTo ? <small>Till {fmt(o.validTo)}</small> : null}
              </div>
              <Link to="/contact" search={{ hotel: o.resort }} className="mx-offer-cta">
                <Tag size={13} /> Enquire about this offer
              </Link>
            </article>
          ))}
        </div>
      ) : null}
      <ul className="md-checks">
        {perks.map((perk) => (
          <li key={perk}>{perk}</li>
        ))}
      </ul>
    </section>
  );
}
