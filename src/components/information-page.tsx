import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeHelp,
  Building2,
  CheckCircle2,
  ChevronDown,
  Handshake,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/hotel-layout";
import { useHomeContent } from "@/lib/home-content";
import { pageHead } from "@/lib/hotel-data";

export type InfoPageKind =
  "faqs" | "terms" | "privacy" | "cancellation" | "support" | "partner-registration";

const pageDetails: Record<InfoPageKind, { title: string; description: string; eyebrow: string }> = {
  faqs: {
    title: "Frequently Asked Questions",
    description: "Helpful answers about Gulsaga stays, membership and getting in touch.",
    eyebrow: "HERE TO HELP",
  },
  terms: {
    title: "Terms & Conditions",
    description: "Review the terms that apply to Gulsaga website and membership services.",
    eyebrow: "IMPORTANT INFORMATION",
  },
  privacy: {
    title: "Privacy Policy",
    description: "Learn how Gulsaga handles personal information and privacy requests.",
    eyebrow: "YOUR PRIVACY MATTERS",
  },
  cancellation: {
    title: "Cancellation & Refund Policy",
    description:
      "Understand where to find the verified cancellation and refund terms for a booking or membership.",
    eyebrow: "BOOKING INFORMATION",
  },
  support: {
    title: "Help & Support",
    description:
      "Contact our team for assistance with a stay, membership, partnership or other enquiry.",
    eyebrow: "WE’RE HERE FOR YOU",
  },
  "partner-registration": {
    title: "Partner with Gulsaga",
    description:
      "Introduce your property, venue or hospitality experience to our partnership team.",
    eyebrow: "HOSPITALITY PARTNERSHIPS",
  },
};

const faqs = [
  {
    question: "How do I enquire about a resort stay?",
    answer:
      "Open a resort detail page and use its enquiry option, or contact our team with your preferred property and travel dates. Availability and rates must be confirmed directly before you make plans.",
  },
  {
    question: "How does Gulsaga membership work?",
    answer:
      "Membership benefits, duration, eligibility, availability and any refund terms are described on the Membership page and in the applicable membership agreement. Please review those terms and ask our team to confirm anything that is unclear before enrolling.",
  },
  {
    question: "Are displayed resort rates and availability live?",
    answer:
      "No. This website preview does not connect to live inventory or partner rate systems. Contact the team or property to verify rates, room details and availability.",
  },
  {
    question: "How can I ask about a destination wedding or partnership?",
    answer:
      "Choose the relevant inquiry type on our Contact page or use the Partner with Gulsaga form. The current preview prepares an email draft; it does not create a saved request.",
  },
  {
    question: "Where can I find cancellation and refund details?",
    answer:
      "Cancellation, change and refund rules can differ by property, booking and membership. Check the specific written terms provided at confirmation and contact the team if you need help interpreting them.",
  },
];

const legalDrafts: Record<
  "terms" | "privacy" | "cancellation",
  { heading: string; sections: { title: string; body: string }[] }
> = {
  terms: {
    heading: "Website terms — draft for review",
    sections: [
      {
        title: "Preview content",
        body: "This website preview may contain illustrative content. Property details, sample prices, offers, availability and membership examples are not a booking confirmation or an offer to sell. Confirm details in writing with Gulsaga and the relevant property.",
      },
      {
        title: "Bookings and membership",
        body: "A booking or membership is governed by the specific terms presented by Gulsaga or the service provider at the time of purchase. The final, approved agreement should be linked here before this page is treated as a binding policy.",
      },
      {
        title: "Use of this website",
        body: "Use the website lawfully and do not interfere with its operation or submit information you are not authorised to share. Production terms, governing law, company details and dispute process require review and approval by Gulsaga.",
      },
    ],
  },
  privacy: {
    heading: "Privacy notice — draft for review",
    sections: [
      {
        title: "Information you provide",
        body: "Contact and enquiry forms may ask for your name, email, phone number and message so the team can respond. The current website preview opens an email draft and does not store contact submissions in its own enquiry database.",
      },
      {
        title: "How information is used",
        body: "In a production service, personal information should be used only for the stated purpose, protected with appropriate access controls, and retained only as long as needed. Confirm the production systems, service providers, retention periods and legal basis before publication.",
      },
      {
        title: "Your choices and requests",
        body: "For privacy questions or requests, contact Gulsaga using the published contact details. This draft must be reviewed against the actual data flows and applicable law before being published as the final privacy policy.",
      },
    ],
  },
  cancellation: {
    heading: "Booking changes and refunds — details must be confirmed",
    sections: [
      {
        title: "Resort bookings",
        body: "Cancellation deadlines, modification options, no-show rules and refunds vary by property and booking terms. Refer to the written confirmation for the reservation-specific policy before making payment.",
      },
      {
        title: "Membership",
        body: "Membership cancellation, eligibility and refund terms must be confirmed in the current signed membership agreement. Do not rely on illustrative website copy as a substitute for that agreement.",
      },
      {
        title: "Need help?",
        body: "Contact Gulsaga with your booking or membership reference. The current preview does not access booking records or issue refunds.",
      },
    ],
  },
};

export function InformationPage({ kind }: { kind: InfoPageKind }) {
  const { footerContent } = useHomeContent();
  const details = pageDetails[kind];
  const phoneHref = `tel:${footerContent.phone.replace(/[^\d+]/g, "")}`;
  const whatsapp = footerContent.whatsappNumber.replace(/\D/g, "");

  return (
    <Layout>
      <main className="info-page">
        <section className="info-hero">
          <div className="info-hero-shade" />
          <div className="info-hero-content">
            <p className="info-eyebrow">{details.eyebrow}</p>
            <h1>{details.title}</h1>
            <p>{details.description}</p>
          </div>
        </section>
        {kind === "faqs" ? (
          <section className="info-content">
            <div className="info-intro">
              <BadgeHelp aria-hidden="true" />
              <div>
                <h2>How can we help?</h2>
                <p>Browse common questions or contact our team for specific guidance.</p>
              </div>
            </div>
            <div className="faq-list">
              {faqs.map((faq, index) => (
                <details className="faq-item" key={faq.question} open={index === 0}>
                  <summary>
                    {faq.question} <ChevronDown aria-hidden="true" />
                  </summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
            <Button asChild>
              <Link to="/contact" search={{ hotel: "" }}>
                Ask us a question <ArrowRight />
              </Link>
            </Button>
          </section>
        ) : kind === "terms" || kind === "privacy" || kind === "cancellation" ? (
          <LegalDraftPage kind={kind} />
        ) : kind === "support" ? (
          <section className="info-content">
            <div className="info-intro">
              <MessageCircle aria-hidden="true" />
              <div>
                <h2>Let’s find the right help</h2>
                <p>Choose a direct contact option or send the team a detailed message.</p>
              </div>
            </div>
            <div className="support-options">
              <a href={phoneHref}>
                <Phone aria-hidden="true" />
                <strong>Call our team</strong>
                <span>{footerContent.phone}</span>
              </a>
              <a href={`mailto:${footerContent.email}`}>
                <Mail aria-hidden="true" />
                <strong>Email support</strong>
                <span>{footerContent.email}</span>
              </a>
              <a
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Hello Gulsaga, I would like to know more.")}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle aria-hidden="true" />
                <strong>WhatsApp</strong>
                <span>{footerContent.whatsappNumber}</span>
              </a>
            </div>
            <p className="info-preview-note">
              Booking lookup and ticket tracking are not connected in this website preview.
            </p>
            <Button asChild>
              <Link to="/contact" search={{ hotel: "" }}>
                Contact us <ArrowRight />
              </Link>
            </Button>
          </section>
        ) : (
          <PartnerRegistration />
        )}
      </main>
    </Layout>
  );
}

function LegalDraftPage({ kind }: { kind: "terms" | "privacy" | "cancellation" }) {
  const draft = legalDrafts[kind];

  return (
    <section className="info-content">
      <div className="info-draft-notice">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Draft content — requires business and legal review</strong>
          <span>
            Confirm the final company details, contracts, processes and applicable law before
            publishing this page as a binding policy.
          </span>
        </div>
      </div>
      <h2 className="info-content-heading">{draft.heading}</h2>
      <div className="legal-sections">
        {draft.sections.map((section) => (
          <article key={section.title}>
            <h3>{section.title}</h3>
            <p>{section.body}</p>
          </article>
        ))}
      </div>
      <p className="info-updated">Last reviewed: Preview draft</p>
    </section>
  );
}

function PartnerRegistration() {
  const { footerContent } = useHomeContent();
  const [submittedReference, setSubmittedReference] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const reference = `GH-P-${Date.now().toString(36).toUpperCase()}`;
    const subject = encodeURIComponent(
      `Partnership enquiry — ${formData.get("propertyName")} — ${reference}`,
    );
    const body = encodeURIComponent(
      [
        `Reference: ${reference}`,
        `Property: ${formData.get("propertyName")}`,
        `Contact person: ${formData.get("name")}`,
        `Email: ${formData.get("email")}`,
        `Phone: ${formData.get("phone") || "Not provided"}`,
        `Property type: ${formData.get("propertyType")}`,
        "",
        String(formData.get("message") ?? ""),
      ].join("\n"),
    );
    setSubmittedReference(reference);
    window.location.href = `mailto:${footerContent.email}?subject=${subject}&body=${body}`;
  };

  return (
    <section className="info-content partner-register-layout">
      <div className="partner-register-copy">
        <Building2 aria-hidden="true" />
        <p className="info-eyebrow">START A CONVERSATION</p>
        <h2>Let’s create more meaningful stays, together.</h2>
        <p>
          Tell us what makes your property, venue or experience distinctive. Our team can discuss
          the right next step and any partnership terms directly with you.
        </p>
        <ul>
          <li>
            <CheckCircle2 /> Share your property story and location
          </li>
          <li>
            <CheckCircle2 /> Introduce your guest experiences
          </li>
          <li>
            <CheckCircle2 /> Discuss partnership fit with our team
          </li>
        </ul>
        <p className="info-preview-note">
          Submitting opens an email draft; it does not register a partner or create a saved lead.
        </p>
      </div>
      <form className="partner-register-form" onSubmit={submit}>
        <h2>Partnership enquiry</h2>
        <label>
          Property / business name *
          <input name="propertyName" autoComplete="organization" required />
        </label>
        <div className="info-form-row">
          <label>
            Your name *
            <input name="name" autoComplete="name" required />
          </label>
          <label>
            Work email *
            <input name="email" type="email" autoComplete="email" required />
          </label>
        </div>
        <div className="info-form-row">
          <label>
            Phone
            <input name="phone" type="tel" autoComplete="tel" />
          </label>
          <label>
            Property type *
            <select name="propertyType" defaultValue="" required>
              <option value="" disabled>
                Select type
              </option>
              <option>Hotel</option>
              <option>Resort</option>
              <option>Boutique stay</option>
              <option>Wellness retreat</option>
              <option>Wedding venue</option>
              <option>Experience provider</option>
              <option>Other</option>
            </select>
          </label>
        </div>
        <label>
          Tell us about your property *
          <textarea name="message" rows={4} maxLength={1000} required />
        </label>
        <Button type="submit">
          <Handshake /> Send partnership enquiry
        </Button>
        {submittedReference && (
          <p className="info-preview-note" role="status">
            Reference {submittedReference} is ready. Send the email draft to complete the enquiry.
          </p>
        )}
      </form>
    </section>
  );
}

export function informationPageHead(kind: InfoPageKind) {
  const details = pageDetails[kind];
  return pageHead(details.title, details.description);
}
