import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Crown,
  Facebook,
  Flower2,
  HeartHandshake,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Menu,
  Mountain,
  Phone,
  Youtube,
  X,
  Linkedin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { useHomeContent, type FooterExperience, type FooterSocialLink } from "@/lib/home-content";

const experienceIcon = {
  bed: BedDouble,
  lotus: Flower2,
  rings: HeartHandshake,
  mountain: Mountain,
  crown: Crown,
} satisfies Record<FooterExperience["icon"], typeof BedDouble>;

const socialIcon = {
  linkedin: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
  facebook: Facebook,
} satisfies Record<FooterSocialLink["icon"], typeof Linkedin>;

export function Brand() {
  const { content } = useHomeContent();
  return (
    <Link to="/" className={content.brand.logo ? "brand brand-with-logo" : "brand"}>
      {content.brand.logo ? (
        <img
          src={content.brand.logo.src}
          alt={`${content.brand.name} Hospitality`}
          className="brand-logo-image"
          width={40}
          height={40}
        />
      ) : (
        <>
          <Flower2 size={32} strokeWidth={1.2} />
          <span>
            {content.brand.name}
            <small>HOSPITALITY</small>
          </span>
        </>
      )}
    </Link>
  );
}
export function Layout({
  children,
  home = false,
  experienceMode = false,
  networkMode = false,
  resortMode = false,
}: {
  children: ReactNode;
  home?: boolean;
  experienceMode?: boolean;
  networkMode?: boolean;
  resortMode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { content, isHidden, contentLoaded } = useHomeContent();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const pageHidden = contentLoaded && pathname !== "/" && isHidden(pathname);
  const footerKey = `footer:/${pathname.split("/")[1] ?? ""}`;
  const footerHidden = contentLoaded && isHidden(footerKey);
  const [
    homeLabel,
    membershipLabel,
    destinationsLabel,
    resortsLabel,
    experiencesLabel,
    networkLabel,
    aboutLabel,
    contactLabel,
  ] = content.brand.navigation;
  const closeMenu = () => setOpen(false);
  return (
    <div className={experienceMode ? "experience-layout" : undefined}>
      {!experienceMode && !resortMode && (
        <div className={home || networkMode ? "announcement announcement-home" : "announcement"}>
          {content.brand.announcement}
          <Link to="/membership" onClick={closeMenu}>
            {content.brand.membershipLabel} <ArrowUpRight size={12} />
          </Link>
        </div>
      )}
      <header
        className={[
          "site-header",
          (home || experienceMode || networkMode) && "site-header-home",
          resortMode && "site-header-resort",
          experienceMode && "site-header-experiences",
          networkMode && "site-header-network",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Brand />
        <nav className={open ? "site-nav open" : "site-nav"}>
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ className: "active" }}
            onClick={closeMenu}
          >
            {homeLabel}
          </Link>
          {!isHidden("/membership") && (
            <Link
              to="/membership"
              className="nav-membership"
              activeProps={{ className: "active" }}
              onClick={closeMenu}
            >
              {membershipLabel}
            </Link>
          )}
          {!isHidden("/destinations") && (
            <Link to="/destinations" activeProps={{ className: "active" }} onClick={closeMenu}>
              {destinationsLabel}
            </Link>
          )}
          {!isHidden("/resorts") && (
            <Link to="/resorts" activeProps={{ className: "active" }} onClick={closeMenu}>
              {resortsLabel}
            </Link>
          )}
          {!isHidden("/experiences") && (
            <Link to="/experiences" activeProps={{ className: "active" }} onClick={closeMenu}>
              {experiencesLabel}
            </Link>
          )}
          {!isHidden("/network") && (
            <Link to="/network" activeProps={{ className: "active" }} onClick={closeMenu}>
              {networkLabel}
            </Link>
          )}
          {!isHidden("/about") && (
            <Link to="/about" activeProps={{ className: "active" }} onClick={closeMenu}>
              {aboutLabel}
            </Link>
          )}
          {!isHidden("/contact") && (
            <Link
              to="/contact"
              search={{ hotel: "" }}
              activeProps={{ className: "active" }}
              onClick={closeMenu}
            >
              {contactLabel}
            </Link>
          )}
        </nav>
        <div className="header-actions">
          {!home && !experienceMode && !networkMode && (
            <Button variant="ghost" asChild>
              <Link to="/experiences/dashboard">My experiences</Link>
            </Button>
          )}
          <Button asChild>
            {networkMode ? (
              <Link to="/partner-registration" className="network-nav-cta">
                Become a Partner <ArrowUpRight />
              </Link>
            ) : experienceMode ? (
              <Link to="/membership" className="experience-nav-cta">
                Join Membership <ArrowUpRight />
              </Link>
            ) : home ? (
              <Link to="/membership">
                {content.brand.membershipLabel} <ArrowUpRight />
              </Link>
            ) : (
              <Link to="/contact" search={{ hotel: "" }}>
                Plan a holiday <ArrowUpRight />
              </Link>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="menu-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </header>
      <main aria-busy={!contentLoaded}>
        {!contentLoaded ? (
          <div className="content-loading" aria-hidden="true" />
        ) : pageHidden ? (
          <section className="content-section" role="status">
            <h1>This page is not available</h1>
            <p>This section of the website is currently turned off.</p>
            <Button asChild>
              <Link to="/">Back to home</Link>
            </Button>
          </section>
        ) : (
          children
        )}
      </main>
      {contentLoaded && !footerHidden && <SiteFooter />}
      <WhatsAppButton />
    </div>
  );
}

function SiteFooter() {
  const { content, footerContent, isHidden } = useHomeContent();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const showScenic = !isHidden("footer:scenic") && pathname !== "/about";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const whatsappNumber = footerContent.whatsappNumber.replace(/\D/g, "");

  const callOtpApi = async (action: "send" | "verify", otp?: string) => {
    const response = await fetch("/api/newsletter-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, email, ...(otp ? { code: otp } : {}) }),
    });
    const result = (await response.json()) as { message?: string };
    if (!response.ok) throw new Error(result.message ?? "Email verification failed.");
    return result.message ?? "Request complete.";
  };

  const sendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setMessageIsError(false);
    try {
      const responseMessage = await callOtpApi("send");
      setAwaitingCode(true);
      setCode("");
      setMessage(responseMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send the verification code.");
      setMessageIsError(true);
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setMessageIsError(false);
    try {
      const responseMessage = await callOtpApi("verify", code);
      setVerified(true);
      setMessage(responseMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not verify this email address.");
      setMessageIsError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <footer className="site-footer">
      {showScenic && (
        <div className="footer-scenic" aria-hidden="true">
          <img src={footerContent.background.src} alt="" />
          <svg viewBox="0 0 1440 62" preserveAspectRatio="none">
            <path d="M0 25 C175 66 302 4 474 27 S747 67 923 25 S1207 3 1440 36" />
            <path d="M0 31 C175 72 302 10 474 33 S747 73 923 31 S1207 9 1440 42" />
          </svg>
        </div>
      )}
      <div className="footer-content">
        <div className="footer-grid">
          <section className="footer-brand-column">
            <Brand />
            <p>{footerContent.description}</p>
            <div className="footer-socials" aria-label="Social media">
              {footerContent.socials.map((social, index) => {
                const Icon = socialIcon[social.icon];
                return social.href ? (
                  <a
                    key={`${social.label}-${index}`}
                    href={social.href}
                    aria-label={social.label}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Icon size={17} />
                  </a>
                ) : (
                  <span
                    key={`${social.label}-${index}`}
                    aria-label={`${social.label} link not configured`}
                  >
                    <Icon size={17} />
                  </span>
                );
              })}
            </div>
          </section>

          <section className="footer-links-column">
            <h2>{footerContent.quickLinksTitle}</h2>
            {footerContent.quickLinks.map((item, index) => (
              <a href={item.href} key={`${item.label}-${index}`}>
                <ArrowRight size={14} /> {item.label}
              </a>
            ))}
          </section>

          <section className="footer-experiences-column">
            <h2>{footerContent.experiencesTitle}</h2>
            {footerContent.experiences.map((item, index) => {
              const Icon = experienceIcon[item.icon];
              return (
                <div className="footer-experience" key={`${item.label}-${index}`}>
                  <Icon size={28} strokeWidth={1.5} />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </section>

          <section className="footer-contact-column">
            <h2>{footerContent.contactTitle}</h2>
            <a href={`tel:${footerContent.phone.replace(/[^\d+]/g, "")}`}>
              <Phone size={19} /> <span>{footerContent.phone}</span>
            </a>
            <a href={`mailto:${footerContent.email}`}>
              <Mail size={20} /> <span>{footerContent.email}</span>
            </a>
            <div>
              <MapPin size={20} /> <span>{footerContent.location}</span>
            </div>
            <a
              className="footer-whatsapp"
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hello Gulsaga, I would like to know more.")}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={17} /> {footerContent.whatsappLabel} <ArrowRight size={17} />
            </a>
          </section>

          <section className="footer-newsletter-column">
            <h2>{footerContent.newsletterTitle}</h2>
            <p>{footerContent.newsletterDescription}</p>
            {verified ? (
              <p className="footer-newsletter-message" role="status" aria-live="polite">
                {message}
              </p>
            ) : awaitingCode ? (
              <form className="footer-otp-form" onSubmit={verifyCode}>
                <label htmlFor="footer-otp">Verification code</label>
                <input
                  id="footer-otp"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 6-digit code"
                  required
                />
                <button type="submit" disabled={busy}>
                  {busy ? "Verifying…" : "Verify email"} <ArrowRight size={17} />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setMessage("");
                    setMessageIsError(false);
                    try {
                      setMessage(await callOtpApi("send"));
                    } catch (error) {
                      setMessage(
                        error instanceof Error ? error.message : "Could not resend the code.",
                      );
                      setMessageIsError(true);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Resend code
                </button>
                <button
                  className="footer-change-email"
                  type="button"
                  onClick={() => {
                    setAwaitingCode(false);
                    setMessage("");
                    setCode("");
                  }}
                >
                  Change email address
                </button>
              </form>
            ) : (
              <form className="footer-newsletter-form" onSubmit={sendCode}>
                <label className="sr-only" htmlFor="footer-email">
                  Email address
                </label>
                <Mail size={19} aria-hidden="true" />
                <input
                  id="footer-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email address"
                  required
                />
                <button type="submit" aria-label="Send email verification code" disabled={busy}>
                  {busy ? "…" : <ArrowRight size={20} />}
                </button>
              </form>
            )}
            {message && !verified && (
              <p
                className={
                  messageIsError
                    ? "footer-newsletter-message footer-newsletter-error"
                    : "footer-newsletter-message"
                }
                role={messageIsError ? "alert" : "status"}
                aria-live="polite"
              >
                {message}
              </p>
            )}
          </section>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {content.brand.name}. {footerContent.copyright}
          </span>
          <nav aria-label="Legal">
            {footerContent.legalLinks.map((item, index) => (
              <a href={item.href} key={`${item.label}-${index}`}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="footer-mountain-art" aria-hidden="true">
            <svg viewBox="0 0 240 80">
              <path d="M4 74 84 19l21 20 34-32 97 67M65 74l36-35 22 17 20-20 66 38M1 78q58-20 114-5t121 0" />
            </svg>
          </div>
        </div>
      </div>
    </footer>
  );
}
