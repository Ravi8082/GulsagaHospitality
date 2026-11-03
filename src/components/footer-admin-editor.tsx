import { useState } from "react";
import { ArrowUpRight, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { MediaField, TextField } from "@/components/home-page-editor";
import { Button } from "@/components/ui/button";
import {
  initialFooterContent,
  useHomeContent,
  type FooterContent,
  type FooterExperience,
  type FooterQuickLink,
  type FooterSocialLink,
} from "@/lib/home-content";

const experienceIcons: FooterExperience["icon"][] = ["bed", "lotus", "rings", "mountain", "crown"];
const socialIcons: FooterSocialLink["icon"][] = ["linkedin", "instagram", "youtube", "facebook"];

export function FooterAdminEditor() {
  const { footerContent, updateFooterContent } = useHomeContent();
  const [draft, setDraft] = useState(footerContent);
  const [saved, setSaved] = useState(false);

  const update = (change: (current: FooterContent) => FooterContent) => {
    setDraft(change);
    setSaved(false);
  };

  const updateField = <K extends keyof FooterContent>(key: K, value: FooterContent[K]) => {
    update((current) => ({ ...current, [key]: value }));
  };

  const updateQuickLink = (index: number, change: (item: FooterQuickLink) => FooterQuickLink) => {
    update((current) => ({
      ...current,
      quickLinks: current.quickLinks.map((item, itemIndex) =>
        itemIndex === index ? change(item) : item,
      ),
    }));
  };

  const updateExperience = (
    index: number,
    change: (item: FooterExperience) => FooterExperience,
  ) => {
    update((current) => ({
      ...current,
      experiences: current.experiences.map((item, itemIndex) =>
        itemIndex === index ? change(item) : item,
      ),
    }));
  };

  const updateSocial = (index: number, change: (item: FooterSocialLink) => FooterSocialLink) => {
    update((current) => ({
      ...current,
      socials: current.socials.map((item, itemIndex) =>
        itemIndex === index ? change(item) : item,
      ),
    }));
  };

  const updateLegalLink = (index: number, change: (item: FooterQuickLink) => FooterQuickLink) => {
    update((current) => ({
      ...current,
      legalLinks: current.legalLinks.map((item, itemIndex) =>
        itemIndex === index ? change(item) : item,
      ),
    }));
  };

  const applyPreview = () => {
    updateFooterContent(draft);
    setSaved(true);
  };

  const reset = () => {
    setDraft(initialFooterContent);
    updateFooterContent(initialFooterContent);
    setSaved(true);
  };

  return (
    <div className="home-editor">
      <div className="home-editor-toolbar">
        <div>
          <p className="eyebrow">EDIT THE WEBSITE PREVIEW</p>
          <h2>Footer content</h2>
        </div>
        <Button variant="outline" asChild>
          <Link to="/">
            View preview <ArrowUpRight />
          </Link>
        </Button>
      </div>

      <div className="home-editor-notice" role="note">
        <strong>Saved to the database</strong>
        <span>
          Footer changes are saved automatically when signed in as an administrator and shown to all
          visitors.
        </span>
      </div>

      <section className="home-editor-section">
        <h3>Scenic footer background</h3>
        <div className="home-editor-fields">
          <MediaField
            label="Footer panorama image"
            media={draft.background}
            imageOnly
            onChange={(background) => updateField("background", background)}
          />
          <TextField
            label="Brand description"
            value={draft.description}
            multiline
            onChange={(value) => updateField("description", value)}
          />
        </div>
      </section>

      <section className="home-editor-section">
        <h3>Quick links</h3>
        <div className="home-editor-fields">
          <TextField
            label="Column heading"
            value={draft.quickLinksTitle}
            onChange={(value) => updateField("quickLinksTitle", value)}
          />
          {draft.quickLinks.map((item, index) => (
            <div className="footer-editor-row" key={`quick-${index}`}>
              <TextField
                label={`Link ${index + 1} label`}
                value={item.label}
                onChange={(label) => updateQuickLink(index, (current) => ({ ...current, label }))}
              />
              <TextField
                label={`Link ${index + 1} URL`}
                value={item.href}
                onChange={(href) => updateQuickLink(index, (current) => ({ ...current, href }))}
              />
              <Button
                variant="outline"
                size="icon"
                aria-label={`Remove quick link ${index + 1}`}
                onClick={() =>
                  update((current) => ({
                    ...current,
                    quickLinks: current.quickLinks.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              update((current) => ({
                ...current,
                quickLinks: [...current.quickLinks, { label: "New link", href: "/" }],
              }))
            }
          >
            <Plus /> Add quick link
          </Button>
        </div>
      </section>

      <section className="home-editor-section">
        <h3>Our experiences</h3>
        <div className="home-editor-fields">
          <TextField
            label="Column heading"
            value={draft.experiencesTitle}
            onChange={(value) => updateField("experiencesTitle", value)}
          />
          {draft.experiences.map((item, index) => (
            <div className="footer-editor-row" key={`experience-${index}`}>
              <TextField
                label={`Experience ${index + 1}`}
                value={item.label}
                onChange={(label) => updateExperience(index, (current) => ({ ...current, label }))}
              />
              <label className="home-editor-field">
                Icon
                <select
                  value={item.icon}
                  onChange={(event) =>
                    updateExperience(index, (current) => ({
                      ...current,
                      icon: event.target.value as FooterExperience["icon"],
                    }))
                  }
                >
                  {experienceIcons.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="outline"
                size="icon"
                aria-label={`Remove experience ${index + 1}`}
                onClick={() =>
                  update((current) => ({
                    ...current,
                    experiences: current.experiences.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              update((current) => ({
                ...current,
                experiences: [...current.experiences, { label: "New experience", icon: "bed" }],
              }))
            }
          >
            <Plus /> Add experience
          </Button>
        </div>
      </section>

      <section className="home-editor-section">
        <h3>Contact details & WhatsApp</h3>
        <div className="home-editor-fields">
          <TextField
            label="Column heading"
            value={draft.contactTitle}
            onChange={(value) => updateField("contactTitle", value)}
          />
          <TextField
            label="Phone number"
            value={draft.phone}
            onChange={(value) => updateField("phone", value)}
          />
          <TextField
            label="Email address"
            value={draft.email}
            onChange={(value) => updateField("email", value)}
          />
          <TextField
            label="Location"
            value={draft.location}
            onChange={(value) => updateField("location", value)}
          />
          <TextField
            label="WhatsApp button label"
            value={draft.whatsappLabel}
            onChange={(value) => updateField("whatsappLabel", value)}
          />
          <TextField
            label="WhatsApp number (include country code)"
            value={draft.whatsappNumber}
            onChange={(value) => updateField("whatsappNumber", value)}
          />
        </div>
      </section>

      <section className="home-editor-section">
        <h3>Newsletter & email verification</h3>
        <div className="home-editor-fields">
          <TextField
            label="Newsletter heading"
            value={draft.newsletterTitle}
            onChange={(value) => updateField("newsletterTitle", value)}
          />
          <TextField
            label="Newsletter description"
            value={draft.newsletterDescription}
            multiline
            onChange={(value) => updateField("newsletterDescription", value)}
          />
          <p className="home-editor-help">
            Newsletter verification emails are sent through Resend. The one-time code is kept in
            server memory for 10 minutes only; addresses and subscription details are not saved to a
            database.
          </p>
        </div>
      </section>

      <section className="home-editor-section">
        <h3>Social links & legal footer</h3>
        <div className="home-editor-fields">
          {draft.socials.map((item, index) => (
            <div className="footer-editor-row" key={`social-${index}`}>
              <TextField
                label={`Social link ${index + 1} label`}
                value={item.label}
                onChange={(label) => updateSocial(index, (current) => ({ ...current, label }))}
              />
              <TextField
                label={`Social link ${index + 1} URL`}
                value={item.href}
                onChange={(href) => updateSocial(index, (current) => ({ ...current, href }))}
              />
              <label className="home-editor-field">
                Icon
                <select
                  value={item.icon}
                  onChange={(event) =>
                    updateSocial(index, (current) => ({
                      ...current,
                      icon: event.target.value as FooterSocialLink["icon"],
                    }))
                  }
                >
                  {socialIcons.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="outline"
                size="icon"
                aria-label={`Remove social link ${index + 1}`}
                onClick={() =>
                  update((current) => ({
                    ...current,
                    socials: current.socials.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              update((current) => ({
                ...current,
                socials: [
                  ...current.socials,
                  { label: "New social link", href: "https://", icon: "instagram" },
                ],
              }))
            }
          >
            <Plus /> Add social link
          </Button>
          <TextField
            label="Copyright text"
            value={draft.copyright}
            onChange={(value) => updateField("copyright", value)}
          />
          {draft.legalLinks.map((item, index) => (
            <div className="footer-editor-row" key={`legal-${index}`}>
              <TextField
                label={`Legal link ${index + 1} label`}
                value={item.label}
                onChange={(label) => updateLegalLink(index, (current) => ({ ...current, label }))}
              />
              <TextField
                label={`Legal link ${index + 1} URL`}
                value={item.href}
                onChange={(href) => updateLegalLink(index, (current) => ({ ...current, href }))}
              />
              <Button
                variant="outline"
                size="icon"
                aria-label={`Remove legal link ${index + 1}`}
                onClick={() =>
                  update((current) => ({
                    ...current,
                    legalLinks: current.legalLinks.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              update((current) => ({
                ...current,
                legalLinks: [...current.legalLinks, { label: "New legal link", href: "/" }],
              }))
            }
          >
            <Plus /> Add legal link
          </Button>
        </div>
      </section>

      <div className="home-editor-actions">
        <Button onClick={applyPreview}>
          <Save /> Apply footer preview
        </Button>
        <Button variant="outline" onClick={reset}>
          <RotateCcw /> Reset footer
        </Button>
        {saved && <span role="status">Footer preview updated in this browser session.</span>}
      </div>
    </div>
  );
}
