import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Coins,
  Crown,
  Gift,
  Headphones,
  Heart,
  Home,
  LogOut,
  QrCode,
  Settings,
  ShieldCheck,
  Star,
  Tag,
  Users,
} from "lucide-react";
import { PreviewImage } from "@/components/preview-image";
import { apiRequest, type Experience } from "@/lib/experience-api";
import { clearToken } from "@/lib/auth-token";
import { hotels } from "@/lib/hotel-data";
import { useHomeContent } from "@/lib/home-content";

type Member = {
  id: string;
  displayName: string;
  email?: string;
  memberVerified?: boolean;
  joinedAt?: string;
};

const modules: { name: string; icon: ComponentType<{ size?: number }> }[] = [
  { name: "Dashboard", icon: Home },
  { name: "My Membership", icon: Crown },
  { name: "My Bookings", icon: CalendarDays },
  { name: "My Experiences", icon: Star },
  { name: "Saved & Wishlist", icon: Heart },
  { name: "Exclusive Offers", icon: Tag },
  { name: "Refer & Earn", icon: Users },
  { name: "Profile & Settings", icon: Settings },
  { name: "Help & Support", icon: Headphones },
];

const wishlistKey = "gulsaga.wishlist";
const pending = "—";

function useWishlist() {
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => {
    try {
      setIds(JSON.parse(localStorage.getItem(wishlistKey) ?? "[]") as number[]);
    } catch {
      setIds([]);
    }
  }, []);
  const toggle = (id: number) =>
    setIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      localStorage.setItem(wishlistKey, JSON.stringify(next));
      return next;
    });
  return { ids, toggle };
}

function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="md-empty">
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

const notLinked =
  "Your membership agreement has not been linked to this account yet. Gulsaga will activate it after the signed agreement is verified.";

export function MemberDashboard() {
  const { membershipPageContent: plan } = useHomeContent();
  const [module, setModule] = useState("Dashboard");
  const [member, setMember] = useState<Member | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [error, setError] = useState("");
  const wishlist = useWishlist();

  useEffect(() => {
    void apiRequest<{ user: Member }>("community/experiences/auth/otp/me")
      .then(({ data }) => setMember(data.user))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load."));
    void apiRequest<Experience[]>("community/experiences/mine")
      .then(({ data }) => setExperiences(data))
      .catch(() => setExperiences([]));
  }, []);

  const signOut = async () => {
    await apiRequest("community/experiences/auth/otp/logout", { method: "POST" }).catch(
      () => undefined,
    );
    clearToken("member");
    window.location.replace("/login");
  };

  const firstName = member?.displayName.split(" ")[0] ?? "Member";
  const saved = hotels.filter((hotel) => wishlist.ids.includes(hotel.id));
  const approved = experiences.filter((item) => item.status === "APPROVED").length;

  const stats = [
    {
      icon: Crown,
      label: "My Membership",
      value: member?.memberVerified ? "Verified member" : "Not activated",
    },
    { icon: CalendarDays, label: "Valid till", value: pending, note: "Set by your agreement" },
    {
      icon: ShieldCheck,
      label: "Membership benefit",
      value: "50% Back",
      note: "Per signed agreement",
    },
    { icon: Coins, label: "Reward balance", value: pending, note: "Not linked yet" },
    { icon: Gift, label: "Available offers", value: pending, note: "None published" },
  ];

  const card = (
    <div className="md-card" aria-label="Digital membership card">
      <span className="md-card-brand">
        Gulsaga <small>HOSPITALITY</small>
      </span>
      <strong>{member?.displayName ?? "Member"}</strong>
      <span className="md-card-meta">
        <Crown size={14} /> {member?.memberVerified ? "Verified member" : "Membership pending"}
      </span>
      <span className="md-card-meta">Membership no. {pending}</span>
    </div>
  );

  const tracker = (
    <section className="md-panel" aria-labelledby="md-tracker">
      <h2 id="md-tracker">50% Back Tracker</h2>
      <dl className="md-kv">
        <div>
          <dt>Eligible booking amount</dt>
          <dd>{pending}</dd>
        </div>
        <div>
          <dt>Applicable 50% benefit</dt>
          <dd>{pending}</dd>
        </div>
        <div>
          <dt>Already credited</dt>
          <dd>{pending}</dd>
        </div>
        <div>
          <dt>Pending amount</dt>
          <dd>{pending}</dd>
        </div>
      </dl>
      <p className="md-note">{plan.refundDisclaimer}</p>
      <p className="md-note">
        Amounts appear here only after Gulsaga links your signed membership agreement. No figures
        are estimated.
      </p>
    </section>
  );

  const benefits = (
    <section className="md-panel md-dark" aria-labelledby="md-benefits">
      <h2 id="md-benefits">
        <Crown size={18} /> Your benefits at a glance
      </h2>
      <ul className="md-checks">
        {plan.planInclusions.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );

  const stays = (
    <div className="md-stays">
      {hotels.map((hotel) => (
        <article key={hotel.id} className="md-stay">
          <PreviewImage src={hotel.image} width={400} height={260} alt={hotel.name} />
          <button
            type="button"
            className="md-heart"
            aria-pressed={wishlist.ids.includes(hotel.id)}
            aria-label={`Save ${hotel.name}`}
            onClick={() => wishlist.toggle(hotel.id)}
          >
            <Heart size={16} fill={wishlist.ids.includes(hotel.id) ? "currentColor" : "none"} />
          </button>
          <h3>{hotel.name}</h3>
          <p>{hotel.location}</p>
          <Link to="/contact" search={{ hotel: hotel.name }}>
            Enquire <ArrowRight size={13} />
          </Link>
        </article>
      ))}
    </div>
  );

  const views: Record<string, ReactNode> = {
    Dashboard: (
      <>
        <section className="md-hero" aria-label="Welcome">
          <h2>Welcome back, {firstName}!</h2>
          <p>Continue your Gulsaga journey and explore your next extraordinary experience.</p>
        </section>
        <div className="md-stats">
          {stats.map(({ icon: Icon, label, value, note }) => (
            <div key={label} className="md-stat">
              <Icon size={26} />
              <span>
                <small>{label}</small>
                <strong>{value}</strong>
                {note ? <em>{note}</em> : null}
              </span>
            </div>
          ))}
        </div>
        <div className="md-grid">
          <section className="md-panel">
            <h2>My Membership</h2>
            {card}
            <button type="button" className="md-link" onClick={() => setModule("My Membership")}>
              View all benefits <ArrowRight size={13} />
            </button>
          </section>
          <section className="md-panel">
            <h2>Upcoming booking</h2>
            <Empty title="No bookings yet">
              Reservations made through Gulsaga will appear here.
            </Empty>
          </section>
          {benefits}
          {tracker}
        </div>
        <section className="md-panel">
          <h2>Quick actions</h2>
          <div className="md-actions">
            <Link to="/resorts">Book a stay</Link>
            <Link to="/destinations">Explore destinations</Link>
            <Link to="/experiences/share" search={{ edit: undefined }}>
              Share an experience
            </Link>
            <button type="button" onClick={() => setModule("Exclusive Offers")}>
              View offers
            </button>
            <button type="button" onClick={() => setModule("Refer & Earn")}>
              Refer a friend
            </button>
            <Link to="/support">Get support</Link>
          </div>
        </section>
        <section className="md-panel">
          <h2>Recommended stays</h2>
          {stays}
        </section>
      </>
    ),
    "My Membership": (
      <>
        <div className="md-grid">
          <section className="md-panel">
            <h2>Digital membership card</h2>
            {card}
            <div className="md-qr">
              <QrCode size={44} />
              <p>Your QR pass is issued once your membership is activated.</p>
            </div>
          </section>
          <section className="md-panel">
            <h2>Plan & validity</h2>
            <dl className="md-kv">
              <div>
                <dt>Plan</dt>
                <dd>{plan.cardTier}</dd>
              </div>
              <div>
                <dt>Plan term</dt>
                <dd>{plan.years} years</dd>
              </div>
              <div>
                <dt>Start date</dt>
                <dd>{pending}</dd>
              </div>
              <div>
                <dt>Expiry date</dt>
                <dd>{pending}</dd>
              </div>
              <div>
                <dt>Plan price</dt>
                <dd>
                  {plan.price} {plan.taxNote}
                </dd>
              </div>
            </dl>
            <p className="md-note">{notLinked}</p>
          </section>
        </div>
        {benefits}
        <section className="md-panel">
          <h2>Eligibility</h2>
          <p>{plan.eligibility}</p>
        </section>
        <div className="md-grid">
          <section className="md-panel">
            <h2>Payment history</h2>
            <Empty title="No payments linked">
              Instalments recorded against your agreement will be listed here.
            </Empty>
          </section>
          <section className="md-panel">
            <h2>Renewal</h2>
            <Empty title="Not due">Renewal options appear closer to your expiry date.</Empty>
          </section>
        </div>
        {tracker}
        <section className="md-panel">
          <h2>50% Back transaction history</h2>
          <Empty title="No transactions" />
        </section>
      </>
    ),
    "My Bookings": (
      <section className="md-panel">
        <h2>My bookings</h2>
        <div className="md-tabs" role="list">
          {["Upcoming", "Completed", "Cancelled"].map((label) => (
            <span key={label} role="listitem">
              {label} · 0
            </span>
          ))}
        </div>
        <Empty title="No bookings yet">
          Status, invoices, cancellation and reschedule requests will be available here once online
          booking is connected. For now,{" "}
          <Link to="/contact" search={{ hotel: "" }}>
            contact Gulsaga
          </Link>{" "}
          to book.
        </Empty>
      </section>
    ),
    "My Experiences": (
      <section className="md-panel">
        <h2>My experiences</h2>
        <p className="md-note">
          {experiences.length} submitted · {approved} approved
        </p>
        {experiences.length === 0 ? (
          <Empty title="You haven't shared an experience yet" />
        ) : (
          <ul className="md-list">
            {experiences.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>
                <span className="md-badge">{item.status.replace(/_/g, " ").toLowerCase()}</span>
                {item.moderationReason ? <small>{item.moderationReason}</small> : null}
              </li>
            ))}
          </ul>
        )}
        <div className="md-actions">
          <Link to="/experiences/share" search={{ edit: undefined }}>
            Share an experience
          </Link>
          <Link to="/experiences/dashboard">Track approvals</Link>
        </div>
      </section>
    ),
    "Saved & Wishlist": (
      <section className="md-panel">
        <h2>Saved & wishlist</h2>
        <p className="md-note">Saved on this device.</p>
        {saved.length === 0 ? (
          <Empty title="Nothing saved yet">Tap the heart on a stay to save it.</Empty>
        ) : null}
        {stays}
      </section>
    ),
    "Exclusive Offers": (
      <section className="md-panel">
        <h2>Exclusive offers</h2>
        <Empty title="No member offers published">
          Member-only offers will appear here when Gulsaga publishes them.
        </Empty>
        <ul className="md-checks">
          {plan.offerPerks.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>
      </section>
    ),
    "Refer & Earn": (
      <section className="md-panel">
        <h2>Refer & earn</h2>
        <Empty title="Referral programme not open">
          Referral rewards are not configured yet. Contact Gulsaga support to ask about them.
        </Empty>
      </section>
    ),
    "Profile & Settings": (
      <section className="md-panel">
        <h2>Profile & settings</h2>
        <dl className="md-kv">
          <div>
            <dt>Name</dt>
            <dd>{member?.displayName ?? pending}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{member?.email ?? pending}</dd>
          </div>
          <div>
            <dt>Verified member</dt>
            <dd>{member?.memberVerified ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt>Joined</dt>
            <dd>
              {member?.joinedAt ? new Date(member.joinedAt).toLocaleDateString("en-IN") : pending}
            </dd>
          </div>
        </dl>
        <p className="md-note">
          You sign in with a one-time code sent to this email. To change your details, contact
          support.
        </p>
      </section>
    ),
    "Help & Support": (
      <section className="md-panel">
        <h2>Help & support</h2>
        <div className="md-actions">
          <Link to="/support">Support centre</Link>
          <Link to="/contact" search={{ hotel: "" }}>
            Contact Gulsaga
          </Link>
          <Link to="/faqs">FAQs</Link>
          <Link to="/cancellation">Cancellation policy</Link>
        </div>
      </section>
    ),
  };

  return (
    <div className="md-shell">
      <aside className="md-side">
        <Link to="/" className="md-brand">
          Gulsaga <small>HOSPITALITY</small>
        </Link>
        <div className="md-profile">
          <span className="md-avatar" aria-hidden="true">
            {firstName.charAt(0).toUpperCase()}
          </span>
          <span>
            <strong>{member?.displayName ?? "Member"}</strong>
            <small>
              <Crown size={12} /> {member?.memberVerified ? "Verified member" : "Member"}
            </small>
          </span>
        </div>
        <nav aria-label="Member dashboard">
          {modules.map(({ name, icon: Icon }) => (
            <button
              key={name}
              type="button"
              data-active={module === name}
              onClick={() => setModule(name)}
            >
              <Icon size={17} /> {name}
              {name === "Saved & Wishlist" && wishlist.ids.length ? (
                <b>{wishlist.ids.length}</b>
              ) : null}
            </button>
          ))}
        </nav>
        <button type="button" className="md-signout" onClick={() => void signOut()}>
          <LogOut size={16} /> Sign out
        </button>
      </aside>
      <main className="md-main">
        <header className="md-top">
          <h1>{module === "Dashboard" ? "Member Dashboard" : module}</h1>
          <p>Your gateway to exclusive stays, experiences and curated hospitality.</p>
        </header>
        {error ? <p role="alert">{error}</p> : null}
        {views[module]}
      </main>
    </div>
  );
}
