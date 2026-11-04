import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BedDouble,
  CalendarDays,
  Check,
  Crown,
  Handshake,
  Headset,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  HeartHandshake,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Layout } from "@/components/hotel-layout";
import { Button } from "@/components/ui/button";
import { useHomeContent, type ContactInquiryCategory } from "@/lib/home-content";
import { pageHead } from "@/lib/hotel-data";
import { apiRequest } from "@/lib/experience-api";

const categoryIcons = {
  bed: BedDouble,
  crown: Crown,
  rings: HeartHandshake,
  handshake: Handshake,
  calendar: CalendarDays,
} satisfies Record<ContactInquiryCategory["icon"], typeof BedDouble>;

export const Route = createFileRoute("/contact")({
  validateSearch: (search: Record<string, unknown>) => ({
    hotel: typeof search["hotel"] === "string" ? search["hotel"] : "",
  }),
  head: () =>
    pageHead(
      "Contact Us",
      "Plan your next hospitality experience with Gulsaga. Contact our team about resort stays, membership, weddings and partnerships.",
    ),
  component: Contact,
});

function Contact() {
  const { hotel } = Route.useSearch();
  const { contactPageContent, footerContent } = useHomeContent();
  const [messageText, setMessageText] = useState(
    hotel ? `I would like to enquire about ${hotel}.` : "",
  );
  const [selectedCategory, setSelectedCategory] = useState(
    contactPageContent.inquiryCategories[0]?.label ?? "",
  );
  const [submissionNote, setSubmissionNote] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [sending, setSending] = useState(false);
  const whatsappNumber = footerContent.whatsappNumber.replace(/\D/g, "");
  const mapQuery = encodeURIComponent(footerContent.location);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
  const mapEmbedUrl = `https://maps.google.com/maps?q=${mapQuery}&z=12&output=embed`;

  const submitEnquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (!accepted) {
      setSubmissionNote("Please accept the Terms & Conditions and Privacy Policy to continue.");
      return;
    }
    const form = event.currentTarget;
    setSending(true);
    setSubmissionNote("");
    try {
      const result = await apiRequest<{ reference: string }>("public/enquiry", {
        method: "POST",
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          type: selectedCategory || "General enquiry",
          message: String(formData.get("message") ?? ""),
          accepted: true,
        }),
      });
      setSubmissionNote(`Thank you! Your enquiry is received. Reference ${result.data.reference}. A confirmation will reach your email.`);
      form.reset();
      setMessageText("");
      setAccepted(false);
    } catch (reason) {
      setSubmissionNote(reason instanceof Error ? reason.message : "Could not send your enquiry. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout home>
      <div className="contact-page">
        <section className="contact-hero">
          <img
            className="contact-hero-image"
            src={contactPageContent.heroMedia.src}
            alt=""
            fetchPriority="high"
          />
          <div className="contact-hero-shade" />
          <div className="contact-hero-copy">
            <p className="contact-eyebrow">{contactPageContent.heroEyebrow}</p>
            <h1>{contactPageContent.heroTitle}</h1>
            <p>{contactPageContent.heroDescription}</p>
          </div>
          <div className="contact-gold-wave" aria-hidden="true" />
        </section>

        <section className="contact-main" aria-label="Contact Gulsaga Hospitality">
          <div className="contact-info-card">
            <div className="contact-card-heading">
              <Headset aria-hidden="true" />
              <div>
                <h2>{contactPageContent.contactHeading}</h2>
                <p>{contactPageContent.contactDescription}</p>
              </div>
            </div>
            <a
              className="contact-method"
              href={`tel:${footerContent.phone.replace(/[^\d+]/g, "")}`}
            >
              <Phone aria-hidden="true" />
              <span>
                <strong>Call Us</strong>
                <span>{footerContent.phone}</span>
              </span>
            </a>
            <a className="contact-method" href={`mailto:${footerContent.email}`}>
              <Mail aria-hidden="true" />
              <span>
                <strong>Email Us</strong>
                <span>{footerContent.email}</span>
              </span>
            </a>
            <a
              className="contact-method"
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hello Gulsaga, I would like to know more.")}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle aria-hidden="true" />
              <span>
                <strong>WhatsApp</strong>
                <span>{footerContent.whatsappNumber}</span>
              </span>
              <ArrowUpRight className="contact-method-arrow" aria-hidden="true" />
            </a>
          </div>

          <form className="contact-form-card" onSubmit={submitEnquiry}>
            <h2>Send Us a Message</h2>
            <div className="contact-form-grid">
              <label>
                <span>Full Name *</span>
                <input name="name" autoComplete="name" placeholder="Enter your name" required />
              </label>
              <label>
                <span>Email Address *</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  required
                />
              </label>
              <label>
                <span>Phone Number</span>
                <input name="phone" type="tel" autoComplete="tel" placeholder="Enter your phone" />
              </label>
              <label>
                <span>Inquiry Type *</span>
                <select
                  name="category"
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.currentTarget.value)}
                  required
                >
                  {contactPageContent.inquiryCategories.map((category) => (
                    <option key={category.label} value={category.label}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="contact-message-field">
              <span>Your Message *</span>
              <textarea
                name="message"
                maxLength={500}
                value={messageText}
                onChange={(event) => setMessageText(event.currentTarget.value)}
                placeholder="Tell us how we can help you..."
                required
              />
              <small>{messageText.length} / 500</small>
            </label>
            <label className="contact-terms">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.currentTarget.checked)} />
              <span>
                I accept the <a href="/policies?doc=terms" target="_blank" rel="noreferrer">Terms &amp; Conditions</a> and{" "}
                <a href="/policies?doc=privacy" target="_blank" rel="noreferrer">Privacy Policy</a>. *
              </span>
            </label>
            <Button className="contact-submit" type="submit" size="lg" disabled={!accepted || sending}>
              <Send aria-hidden="true" /> Send Message
            </Button>
            {submissionNote && (
              <p className="contact-submit-note" role="status">
                <Check aria-hidden="true" /> {submissionNote}
              </p>
            )}
          </form>

          <section className="contact-office-card" aria-labelledby="contact-office-heading">
            <div className="contact-office-details">
              <MapPin aria-hidden="true" />
              <div>
                <h2 id="contact-office-heading">{contactPageContent.officeHeading}</h2>
                <strong>{contactPageContent.officeName}</strong>
                <p>{footerContent.location}</p>
                <p className="contact-office-hours">{contactPageContent.officeHours}</p>
                <a className="contact-map-link" href={mapUrl} target="_blank" rel="noreferrer">
                  <MapPin aria-hidden="true" /> {contactPageContent.mapLabel}{" "}
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </div>
            </div>
            {contactPageContent.officeImage && (
              <img
                className="contact-office-image"
                src={contactPageContent.officeImage.src}
                alt="Gulsaga Hospitality office"
                loading="lazy"
              />
            )}
            <iframe
              className="contact-map"
              title={`Map showing ${footerContent.location}`}
              src={mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </section>
        </section>

        <section className="contact-categories-section">
          <div className="contact-section-title">
            <span />
            <h2>What Can We Help You With?</h2>
            <span />
          </div>
          <div className="contact-category-grid">
            {contactPageContent.inquiryCategories.map((category) => {
              const Icon = categoryIcons[category.icon];
              return (
                <button
                  className={`contact-category-card${selectedCategory === category.label ? " selected" : ""}`}
                  key={category.label}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(category.label);
                    document.querySelector(".contact-form-card")?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }}
                >
                  <Icon aria-hidden="true" />
                  <strong>{category.label}</strong>
                  <span>{category.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="contact-social-section">
          <p className="contact-eyebrow">STAY CONNECTED</p>
          <h2>Follow the journey.</h2>
          <p>Travel inspiration, upcoming experiences and thoughtful escapes from Gulsaga.</p>
          <div className="contact-social-links">
            {footerContent.socials
              .filter((social) => /^https?:\/\//i.test(social.href))
              .map((social) => (
                <a key={social.label} href={social.href} target="_blank" rel="noreferrer">
                  {social.label} <ArrowUpRight aria-hidden="true" />
                </a>
              ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
