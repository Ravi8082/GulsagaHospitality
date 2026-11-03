import { useState } from "react";
import { ArrowUpRight, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { MediaField, TextField } from "@/components/home-page-editor";
import { Button } from "@/components/ui/button";
import {
  initialContactPageContent,
  initialFooterContent,
  useHomeContent,
  type ContactInquiryCategory,
  type ContactPageContent,
  type FooterContent,
} from "@/lib/home-content";

const inquiryIcons: ContactInquiryCategory["icon"][] = [
  "bed",
  "crown",
  "rings",
  "handshake",
  "calendar",
];

export function ContactAdminEditor() {
  const { contactPageContent, updateContactPageContent, footerContent, updateFooterContent } =
    useHomeContent();
  const [draft, setDraft] = useState(contactPageContent);
  const [footerDraft, setFooterDraft] = useState(footerContent);
  const [saved, setSaved] = useState(false);

  const update = (change: (current: ContactPageContent) => ContactPageContent) => {
    setDraft(change);
    setSaved(false);
  };

  const updateField = <K extends keyof ContactPageContent>(
    key: K,
    value: ContactPageContent[K],
  ) => {
    update((current) => ({ ...current, [key]: value }));
  };

  const updateFooterField = <K extends keyof FooterContent>(key: K, value: FooterContent[K]) => {
    setFooterDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const updateCategory = (
    index: number,
    change: (category: ContactInquiryCategory) => ContactInquiryCategory,
  ) => {
    update((current) => ({
      ...current,
      inquiryCategories: current.inquiryCategories.map((category, itemIndex) =>
        itemIndex === index ? change(category) : category,
      ),
    }));
  };

  const apply = () => {
    updateContactPageContent(draft);
    updateFooterContent({
      ...footerContent,
      phone: footerDraft.phone,
      email: footerDraft.email,
      whatsappNumber: footerDraft.whatsappNumber,
      location: footerDraft.location,
      socials: footerDraft.socials,
    });
    setSaved(true);
  };

  const reset = () => {
    setDraft(initialContactPageContent);
    const resetFooter = {
      ...footerContent,
      phone: initialFooterContent.phone,
      email: initialFooterContent.email,
      whatsappNumber: initialFooterContent.whatsappNumber,
      location: initialFooterContent.location,
      socials: initialFooterContent.socials,
    };
    setFooterDraft(resetFooter);
    updateContactPageContent(initialContactPageContent);
    updateFooterContent(resetFooter);
    setSaved(true);
  };

  return (
    <div className="home-editor">
      <div className="home-editor-toolbar">
        <div>
          <p className="eyebrow">EDIT THE WEBSITE PREVIEW</p>
          <h2>Contact page</h2>
        </div>
        <Button variant="outline" asChild>
          <Link to="/contact" search={{ hotel: "" }}>
            View preview <ArrowUpRight />
          </Link>
        </Button>
      </div>

      <div className="home-editor-notice" role="note">
        <strong>Saved to the database</strong>
        <span>
          Contact page changes are saved automatically when signed in as an administrator. Contact
          details also update the shared footer. Enquiries are not yet managed here.
        </span>
      </div>

      <section className="home-editor-section">
        <h3>Cinematic hero & page introduction</h3>
        <div className="home-editor-fields">
          <MediaField
            label="Hero background"
            media={draft.heroMedia}
            imageOnly
            onChange={(heroMedia) => updateField("heroMedia", heroMedia)}
          />
          <TextField
            label="Hero eyebrow"
            value={draft.heroEyebrow}
            onChange={(heroEyebrow) => updateField("heroEyebrow", heroEyebrow)}
          />
          <TextField
            label="Hero heading"
            value={draft.heroTitle}
            multiline
            onChange={(heroTitle) => updateField("heroTitle", heroTitle)}
          />
          <TextField
            label="Hero description"
            value={draft.heroDescription}
            multiline
            onChange={(heroDescription) => updateField("heroDescription", heroDescription)}
          />
          <TextField
            label="Get in Touch heading"
            value={draft.contactHeading}
            onChange={(contactHeading) => updateField("contactHeading", contactHeading)}
          />
          <TextField
            label="Get in Touch description"
            value={draft.contactDescription}
            multiline
            onChange={(contactDescription) => updateField("contactDescription", contactDescription)}
          />
        </div>
      </section>

      <section className="home-editor-section">
        <h3>Contact details & office location</h3>
        <div className="home-editor-fields">
          <TextField
            label="Phone number"
            value={footerDraft.phone}
            onChange={(phone) => updateFooterField("phone", phone)}
          />
          <TextField
            label="Email address"
            value={footerDraft.email}
            onChange={(email) => updateFooterField("email", email)}
          />
          <TextField
            label="WhatsApp number (include country code)"
            value={footerDraft.whatsappNumber}
            onChange={(whatsappNumber) => updateFooterField("whatsappNumber", whatsappNumber)}
          />
          <TextField
            label="Office location / map search"
            value={footerDraft.location}
            onChange={(location) => updateFooterField("location", location)}
          />
          <TextField
            label="Office section heading"
            value={draft.officeHeading}
            onChange={(officeHeading) => updateField("officeHeading", officeHeading)}
          />
          <TextField
            label="Office name"
            value={draft.officeName}
            onChange={(officeName) => updateField("officeName", officeName)}
          />
          <TextField
            label="Contact hours"
            value={draft.officeHours}
            onChange={(officeHours) => updateField("officeHours", officeHours)}
          />
          <TextField
            label="Map button label"
            value={draft.mapLabel}
            onChange={(mapLabel) => updateField("mapLabel", mapLabel)}
          />
          <MediaField
            label="Office photo (optional)"
            media={draft.officeImage}
            imageOnly
            onChange={(officeImage) => updateField("officeImage", officeImage)}
          />
        </div>
      </section>

      <section className="home-editor-section">
        <h3>Inquiry categories</h3>
        <div className="home-editor-fields">
          {draft.inquiryCategories.map((category, index) => (
            <div className="home-editor-group" key={`contact-category-${index}`}>
              <TextField
                label={`Category ${index + 1} title`}
                value={category.label}
                onChange={(label) => updateCategory(index, (item) => ({ ...item, label }))}
              />
              <TextField
                label="Description"
                value={category.description}
                onChange={(description) =>
                  updateCategory(index, (item) => ({ ...item, description }))
                }
              />
              <label className="home-editor-field">
                Icon
                <select
                  value={category.icon}
                  onChange={(event) =>
                    updateCategory(index, (item) => ({
                      ...item,
                      icon: event.currentTarget.value as ContactInquiryCategory["icon"],
                    }))
                  }
                >
                  {inquiryIcons.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="outline"
                onClick={() =>
                  update((current) => ({
                    ...current,
                    inquiryCategories: current.inquiryCategories.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
              >
                <Trash2 /> Remove category
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              update((current) => ({
                ...current,
                inquiryCategories: [
                  ...current.inquiryCategories,
                  {
                    label: "New enquiry",
                    description: "Tell us what you have in mind",
                    icon: "calendar",
                  },
                ],
              }))
            }
          >
            <Plus /> Add inquiry category
          </Button>
        </div>
      </section>

      <section className="home-editor-section">
        <h3>Stay connected links</h3>
        <div className="home-editor-fields">
          {footerDraft.socials.map((social, index) => (
            <div className="footer-editor-row" key={`contact-social-${index}`}>
              <TextField
                label={`Social network ${index + 1}`}
                value={social.label}
                onChange={(label) =>
                  updateFooterField(
                    "socials",
                    footerDraft.socials.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, label } : item,
                    ),
                  )
                }
              />
              <TextField
                label="Social URL"
                value={social.href}
                onChange={(href) =>
                  updateFooterField(
                    "socials",
                    footerDraft.socials.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, href } : item,
                    ),
                  )
                }
              />
              <Button
                variant="outline"
                size="icon"
                aria-label={`Remove ${social.label} link`}
                onClick={() =>
                  updateFooterField(
                    "socials",
                    footerDraft.socials.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              updateFooterField("socials", [
                ...footerDraft.socials,
                { label: "New social link", href: "https://", icon: "instagram" },
              ])
            }
          >
            <Plus /> Add social link
          </Button>
        </div>
      </section>

      <div className="home-editor-actions">
        <Button onClick={apply}>
          <Save /> Apply contact preview
        </Button>
        <Button variant="outline" onClick={reset}>
          <RotateCcw /> Reset contact page
        </Button>
        {saved && <span role="status">Contact page preview updated in this browser session.</span>}
      </div>
    </div>
  );
}
