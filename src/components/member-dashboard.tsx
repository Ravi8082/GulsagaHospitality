import { useEffect, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
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
import { QRCodeSVG } from "qrcode.react";
import { apiRequest, type Experience } from "@/lib/experience-api";
import { clearToken } from "@/lib/auth-token";
import { hotels } from "@/lib/hotel-data";
import { useHomeContent } from "@/lib/home-content";
import { formatInr } from "@/lib/membership-data";
import {
  BookingCard,
  BookingsView,
  OffersView,
  bookingGroup,
  useMemberExtras,
} from "@/components/member-smart";

type MembershipInfo = {
  fullName: string;
  plan: string;
  status: "PENDING" | "APPROVED" | "ACTIVE" | "REJECTED";
  memberCode: string | null;
  paymentLink: string | null;
  adminNote: string | null;
  validTill: string | null;
  listAmount: number | null;
  discountPercent: number;
  discountNote: string | null;
  finalAmount: number | null;
  years: number;
};

type Member = {
  id: string;
  displayName: string;
  email?: string;
  memberVerified?: boolean;
  hasPassword?: boolean;
  joinedAt?: string;
};

function PasswordCard({ hasPassword, onSaved }: { hasPassword: boolean; onSaved: () => void }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { data } = await apiRequest<{ message: string }>(
        "community/experiences/auth/otp/password",
        { method: "POST", body: JSON.stringify({ password }) },
      );
      setFailed(false);
      setMessage(data.message);
      setPassword("");
      onSaved();
    } catch (reason) {
      setFailed(true);
      setMessage(reason instanceof Error ? reason.message : "Could not save the password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="md-password" onSubmit={save}>
      <strong>{hasPassword ? "Change password" : "Set a password"}</strong>
      <p className="md-note">
        {hasPassword
          ? "Choose a new password for faster sign-in."
          : "Skip the email code next time. Sign in with your email and password."}
      </p>
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="At least 10 characters, with a number"
        aria-label="New password"
        autoComplete="new-password"
        minLength={10}
        required
      />
      <button type="submit" disabled={busy}>
        {busy ? "Saving…" : hasPassword ? "Update password" : "Save password"}
      </button>
      {message ? (
        <p role={failed ? "alert" : "status"} className="md-note">
          {message}
        </p>
      ) : null}
    </form>
  );
}

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
  const [membership, setMembership] = useState<MembershipInfo | null>(null);
  const wishlist = useWishlist();
  const extras = useMemberExtras();
  const nextBooking = extras.bookings
    .filter((b) => bookingGroup(b) === "Upcoming")
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];

  useEffect(() => {
    void apiRequest<{ membership: MembershipInfo | null }>("community/experiences/membership/me")
      .then(({ data }) => setMembership(data.membership))
      .catch(() => setMembership(null));
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

  const active = membership?.status === "ACTIVE" && membership.memberCode;
  const planLabel = membership ? membership.plan.charAt(0).toUpperCase() + membership.plan.slice(1) : "";

  const stats = [
    {
      icon: Crown,
      label: "My Membership",
      value: active ? `${planLabel} · Active` : membership ? "In progress" : "Not activated",
    },
    {
      icon: CalendarDays,
      label: "Valid till",
      value: membership?.validTill
        ? new Date(membership.validTill).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : active
          ? "No expiry"
          : pending,
    },
    {
      icon: ShieldCheck,
      label: "Membership benefit",
      value: "50% Back",
      note: "Per signed agreement",
    },
    { icon: Coins, label: "Reward balance", value: pending, note: "Not linked yet" },
    { icon: Gift, label: "Available offers", value: extras.offers.length ? String(extras.offers.length) : pending, note: extras.offers.length ? "Tap to view" : "None published" },
  ];

  const card = (
    <div className="md-card" aria-label="Digital membership card">
      <span className="md-card-brand">
        Gulsaga <small>HOSPITALITY</small>
      </span>
      <strong>{membership?.fullName ?? member?.displayName ?? "Member"}</strong>
      <span className="md-card-meta">
        <Crown size={14} />{" "}
        {active
          ? `${planLabel} Member`
          : membership
            ? `${planLabel} · ${membership.status === "APPROVED" ? "Payment pending" : "Under review"}`
            : "Membership not started"}
      </span>
      <span className="md-card-meta">Member ID: {membership?.memberCode ?? pending}</span>
      {active ? (
        <span className="md-card-qr">
          <QRCodeSVG value={`GULSAGA-MEMBER:${membership.memberCode}`} size={64} />
        </span>
      ) : null}
      {membership?.validTill ? (
        <span className="md-card-meta">
          Valid till: {new Date(membership.validTill).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ) : null}
    </div>
  );

  const priceLine =
    membership?.finalAmount != null ? (
      <p className="md-note">
        Membership fee:{" "}
        {membership.discountPercent ? (
          <>
            <s>{formatInr(membership.listAmount ?? 0)}</s> <strong>{formatInr(membership.finalAmount)}</strong> (
            {membership.discountPercent}% special discount
            {membership.discountNote ? ` - ${membership.discountNote}` : ""})
          </>
        ) : (
          <strong>{formatInr(membership.finalAmount)}</strong>
        )}
      </p>
    ) : null;

  const membershipBanner =
    member && (!membership || membership.status !== "ACTIVE") ? (
      <section className="md-panel md-membership-banner">
        {!membership ? (
          <>
            <h2>Become a Gulsaga member</h2>
            <p className="md-note">Pick a plan to get your member ID and digital card.</p>
            <Link to="/membership/join" className="md-link">
              Choose a plan <ArrowRight size={13} />
            </Link>
          </>
        ) : membership.status === "APPROVED" ? (
          <>
            <h2>Your {planLabel} request is approved</h2>
            <p className="md-note">
              Complete the payment to activate your card.{" "}
              {membership.adminNote ? membership.adminNote : ""}
            </p>
            {priceLine}
            {membership.paymentLink ? (
              /^https?:\/\//i.test(membership.paymentLink) ? (
                <a className="md-link" href={membership.paymentLink} target="_blank" rel="noreferrer">
                  Pay now <ArrowRight size={13} />
                </a>
              ) : (
                <p className="md-note">Payment details: {membership.paymentLink}</p>
              )
            ) : null}
          </>
        ) : membership.status === "REJECTED" ? (
          <>
            <h2>Membership request not approved</h2>
            <p className="md-note">{membership.adminNote || "Please contact support."}</p>
            <Link to="/membership/join" className="md-link">
              Apply again <ArrowRight size={13} />
            </Link>
          </>
        ) : (
          <>
            <h2>Your {planLabel} request is under review</h2>
            {priceLine}
            <p className="md-note">We'll update your dashboard once the team approves it.</p>
          </>
        )}
      </section>
    ) : null;

  const tracker = (
    <section className="md-panel" aria-labelledby="md-tracker">
      <h2 id="md-tracker">50% Back Tracker</h2>
      <dl className="md-kv">
        <div>
          <dt>Eligible booking amount</dt>
          <dd>{extras.backs && extras.backs.rows.length ? formatInr(extras.backs.eligible) : pending}</dd>
        </div>
        <div>
          <dt>Applicable 50% benefit</dt>
          <dd>{extras.backs && extras.backs.rows.length ? formatInr(extras.backs.benefit) : pending}</dd>
        </div>
        <div>
          <dt>Already credited</dt>
          <dd>{extras.backs && extras.backs.rows.length ? formatInr(extras.backs.credited) : pending}</dd>
        </div>
        <div>
          <dt>Pending amount</dt>
          <dd>{extras.backs && extras.backs.rows.length ? formatInr(extras.backs.pending) : pending}</dd>
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
        {membershipBanner}
        {member && !member.hasPassword ? (
          <section className="md-panel">
            <PasswordCard
              hasPassword={false}
              onSaved={() => setMember((current) => (current ? { ...current, hasPassword: true } : current))}
            />
          </section>
        ) : null}
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
            {nextBooking ? (
              <ul className="mx-list">
                <BookingCard booking={nextBooking} />
              </ul>
            ) : (
              <Empty title="No bookings yet">
                Reservations made through Gulsaga will appear here.
              </Empty>
            )}
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
          {extras.backs?.rows.length ? (
            <ul className="md-list">
              {extras.backs.rows.map((r) => (
                <li key={r.id}>
                  <strong>{formatInr(r.amount)}</strong>
                  <span className="md-badge">{r.kind === "CREDIT" ? "credited" : "eligible booking"}</span>
                  <small>
                    {new Date(r.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {r.note ? ` · ${r.note}` : ""}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No transactions" />
          )}
        </section>
      </>
    ),
    "My Bookings": <BookingsView bookings={extras.bookings} loaded={extras.loaded} />,
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
      <OffersView offers={extras.offers} active={extras.offersActive} loaded={extras.loaded} perks={plan.offerPerks} />
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
              {member?.joinedAt ? new Date(member.joinedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : pending}
            </dd>
          </div>
        </dl>
        <p className="md-note">
          You can sign in with a one-time code sent to this email or with a password. To change
          your details, contact support.
        </p>
        <PasswordCard
          hasPassword={Boolean(member?.hasPassword)}
          onSaved={() => setMember((current) => (current ? { ...current, hasPassword: true } : current))}
        />
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
