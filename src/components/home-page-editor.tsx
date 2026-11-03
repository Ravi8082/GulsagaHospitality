import { useState, type ChangeEvent, type ReactNode } from "react";
import { ArrowUpRight, ImagePlus, Plus, Save, RotateCcw, Trash2, Video } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  initialHomeContent,
  useHomeContent,
  type HomeContent,
  type HomeMedia,
  type NetworkValueSection,
} from "@/lib/home-content";

const imageLimit = 50 * 1024 * 1024;
const videoLimit = 100 * 1024 * 1024;

export function HomePageEditor() {
  const { content, updateContent } = useHomeContent();
  const [draft, setDraft] = useState(content);
  const [saved, setSaved] = useState(false);

  const update = (change: (current: HomeContent) => HomeContent) => {
    const next = change(draft);
    setDraft(next);
    updateContent(next);
    setSaved(true);
  };

  const updateNetworkValueSection = (
    audience: "traveller" | "partner",
    change: (section: NetworkValueSection) => NetworkValueSection,
  ) => {
    update((current) => ({
      ...current,
      network: {
        ...current.network,
        valuePropositions: {
          ...current.network.valuePropositions,
          [audience]: change(current.network.valuePropositions[audience]),
        },
      },
    }));
  };

  const applyPreview = () => {
    updateContent(draft);
    setSaved(true);
  };

  const resetAll = () => {
    setDraft(initialHomeContent);
    updateContent(initialHomeContent);
    setSaved(true);
  };

  return (
    <div className="home-editor">
      <div className="home-editor-toolbar">
        <div>
          <p className="eyebrow">EDIT THE WEBSITE PREVIEW</p>
          <h2>Home page content</h2>
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
          Changes and uploads are saved automatically when you are signed in as an administrator,
          and every save is kept in the revision history.
        </span>
      </div>

      <EditorSection title="Logo, announcement & navigation">
        <TextField
          label="Brand name"
          value={draft.brand.name}
          onChange={(value) =>
            update((current) => ({ ...current, brand: { ...current.brand, name: value } }))
          }
        />
        <TextField
          label="Announcement bar"
          value={draft.brand.announcement}
          onChange={(value) =>
            update((current) => ({
              ...current,
              brand: { ...current.brand, announcement: value },
            }))
          }
        />
        <TextField
          label="Membership button"
          value={draft.brand.membershipLabel}
          onChange={(value) =>
            update((current) => ({
              ...current,
              brand: { ...current.brand, membershipLabel: value },
            }))
          }
        />
        {draft.brand.navigation.map((label, index) => (
          <TextField
            key={`nav-${index}`}
            label={`Navigation item ${index + 1}`}
            value={label}
            onChange={(value) =>
              update((current) => ({
                ...current,
                brand: {
                  ...current.brand,
                  navigation: current.brand.navigation.map((item, itemIndex) =>
                    itemIndex === index ? value : item,
                  ),
                },
              }))
            }
          />
        ))}
        <MediaField
          label="Logo image"
          media={draft.brand.logo}
          onChange={(media) =>
            update((current) => ({
              ...current,
              brand: { ...current.brand, logo: media },
            }))
          }
          imageOnly
        />
      </EditorSection>

      <EditorSection title="Hero section">
        <TextField
          label="Small heading"
          value={draft.hero.eyebrow}
          onChange={(value) =>
            update((current) => ({ ...current, hero: { ...current.hero, eyebrow: value } }))
          }
        />
        <TextField
          label="Main heading"
          value={draft.hero.title}
          onChange={(value) =>
            update((current) => ({ ...current, hero: { ...current.hero, title: value } }))
          }
        />
        <TextField
          label="Gold highlighted heading"
          value={draft.hero.highlight}
          onChange={(value) =>
            update((current) => ({ ...current, hero: { ...current.hero, highlight: value } }))
          }
        />
        <TextField
          label="Description"
          value={draft.hero.description}
          onChange={(value) =>
            update((current) => ({ ...current, hero: { ...current.hero, description: value } }))
          }
          multiline
        />
        <TextField
          label="Primary button"
          value={draft.hero.primaryLabel}
          onChange={(value) =>
            update((current) => ({ ...current, hero: { ...current.hero, primaryLabel: value } }))
          }
        />
        <TextField
          label="Secondary button"
          value={draft.hero.secondaryLabel}
          onChange={(value) =>
            update((current) => ({
              ...current,
              hero: { ...current.hero, secondaryLabel: value },
            }))
          }
        />
        <TextField
          label="Membership terms note"
          value={draft.hero.footnote}
          onChange={(value) =>
            update((current) => ({ ...current, hero: { ...current.hero, footnote: value } }))
          }
        />
        <TextField
          label="Scroll prompt"
          value={draft.hero.scrollLabel}
          onChange={(value) =>
            update((current) => ({ ...current, hero: { ...current.hero, scrollLabel: value } }))
          }
        />
        <TextField
          label="Bottom hero caption"
          value={draft.hero.scrollEyebrow}
          onChange={(value) =>
            update((current) => ({
              ...current,
              hero: { ...current.hero, scrollEyebrow: value },
            }))
          }
        />
        {draft.hero.perks.map((perk, index) => (
          <TextField
            key={`perk-${index}`}
            label={`Hero benefit ${index + 1}`}
            value={perk}
            onChange={(value) =>
              update((current) => ({
                ...current,
                hero: {
                  ...current.hero,
                  perks: current.hero.perks.map((item, itemIndex) =>
                    itemIndex === index ? value : item,
                  ) as HomeContent["hero"]["perks"],
                },
              }))
            }
          />
        ))}
        <MediaField
          label="Hero background"
          media={draft.hero.image}
          onChange={(media) =>
            update((current) => ({ ...current, hero: { ...current.hero, image: media } }))
          }
        />
        <MediaField
          label="Floating resort globe"
          media={draft.hero.globe}
          onChange={(media) =>
            update((current) => ({ ...current, hero: { ...current.hero, globe: media } }))
          }
        />
      </EditorSection>

      <EditorSection title="Hospitality network">
        <TextField
          label="Eyebrow"
          value={draft.network.eyebrow}
          onChange={(value) =>
            update((current) => ({ ...current, network: { ...current.network, eyebrow: value } }))
          }
        />
        <TextField
          label="Section heading"
          value={draft.network.heading}
          onChange={(value) =>
            update((current) => ({ ...current, network: { ...current.network, heading: value } }))
          }
        />
        <TextField
          label="Introduction"
          value={draft.network.description}
          onChange={(value) =>
            update((current) => ({
              ...current,
              network: { ...current.network, description: value },
            }))
          }
          multiline
        />
        {(["traveller", "partner"] as const).map((audience) => {
          const valueSection = draft.network.valuePropositions[audience];
          const audienceLabel = audience === "traveller" ? "Traveller & member" : "Partner";
          return (
            <div className="home-editor-group" key={audience}>
              <h3>{audienceLabel} value proposition</h3>
              <TextField
                label={`${audienceLabel} eyebrow`}
                value={valueSection.eyebrow}
                onChange={(value) =>
                  updateNetworkValueSection(audience, (section) => ({ ...section, eyebrow: value }))
                }
              />
              <TextField
                label={`${audienceLabel} heading`}
                value={valueSection.heading}
                onChange={(value) =>
                  updateNetworkValueSection(audience, (section) => ({ ...section, heading: value }))
                }
              />
              <TextField
                label={`${audienceLabel} introduction`}
                value={valueSection.description}
                onChange={(value) =>
                  updateNetworkValueSection(audience, (section) => ({
                    ...section,
                    description: value,
                  }))
                }
                multiline
              />
              {valueSection.points.map((point, index) => (
                <div className="home-editor-group" key={`${audience}-point-${index}`}>
                  <TextField
                    label={`${audienceLabel} benefit ${index + 1} heading`}
                    value={point.title}
                    onChange={(value) =>
                      updateNetworkValueSection(audience, (section) => ({
                        ...section,
                        points: section.points.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, title: value } : item,
                        ) as NetworkValueSection["points"],
                      }))
                    }
                  />
                  <TextField
                    label={`${audienceLabel} benefit ${index + 1} description`}
                    value={point.description}
                    onChange={(value) =>
                      updateNetworkValueSection(audience, (section) => ({
                        ...section,
                        points: section.points.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, description: value } : item,
                        ) as NetworkValueSection["points"],
                      }))
                    }
                    multiline
                  />
                </div>
              ))}
              <TextField
                label={`${audienceLabel} button label`}
                value={valueSection.ctaLabel}
                onChange={(value) =>
                  updateNetworkValueSection(audience, (section) => ({
                    ...section,
                    ctaLabel: value,
                  }))
                }
              />
            </div>
          );
        })}
        {draft.network.partners.map((partner, index) => (
          <div className="home-editor-group" key={partner.id}>
            <TextField
              label={`Hospitality partner ${index + 1} name`}
              value={partner.name}
              onChange={(value) =>
                update((current) => ({
                  ...current,
                  network: {
                    ...current.network,
                    partners: current.network.partners.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, name: value } : item,
                    ),
                  },
                }))
              }
            />
            <MediaField
              label={`${partner.name || `Partner ${index + 1}`} logo`}
              media={partner.logo}
              onChange={(logo) =>
                update((current) => ({
                  ...current,
                  network: {
                    ...current.network,
                    partners: current.network.partners.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, logo } : item,
                    ),
                  },
                }))
              }
              imageOnly
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                update((current) => ({
                  ...current,
                  network: {
                    ...current.network,
                    partners: current.network.partners.filter((item) => item.id !== partner.id),
                  },
                }))
              }
            >
              <Trash2 /> Remove partner
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() => {
            const fallbackLogo = initialHomeContent.network.partners[0]?.logo;
            if (!fallbackLogo) throw new Error("Missing default hospitality partner logo");
            update((current) => ({
              ...current,
              network: {
                ...current.network,
                partners: [
                  ...current.network.partners,
                  {
                    id: `partner-${Date.now()}`,
                    name: "New hospitality partner",
                    logo: fallbackLogo,
                  },
                ],
              },
            }));
          }}
        >
          <Plus /> Add partner
        </Button>
      </EditorSection>

      <EditorSection title="About Gulsaga & photo gallery">
        <TextField
          label="Eyebrow"
          value={draft.about.eyebrow}
          onChange={(value) =>
            update((current) => ({ ...current, about: { ...current.about, eyebrow: value } }))
          }
        />
        <TextField
          label="Section heading"
          value={draft.about.heading}
          onChange={(value) =>
            update((current) => ({ ...current, about: { ...current.about, heading: value } }))
          }
        />
        <TextField
          label="Introduction"
          value={draft.about.description}
          onChange={(value) =>
            update((current) => ({ ...current, about: { ...current.about, description: value } }))
          }
          multiline
        />
        {draft.about.services.map((service, index) => (
          <div className="home-editor-group" key={`service-${index}`}>
            <TextField
              label={`Service ${index + 1} heading`}
              value={service.title}
              onChange={(value) =>
                update((current) => ({
                  ...current,
                  about: {
                    ...current.about,
                    services: current.about.services.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, title: value } : item,
                    ) as HomeContent["about"]["services"],
                  },
                }))
              }
            />
            <TextField
              label={`Service ${index + 1} description`}
              value={service.description}
              onChange={(value) =>
                update((current) => ({
                  ...current,
                  about: {
                    ...current.about,
                    services: current.about.services.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, description: value } : item,
                    ) as HomeContent["about"]["services"],
                  },
                }))
              }
              multiline
            />
          </div>
        ))}
        {draft.about.images.map((media, index) => (
          <MediaField
            key={`about-${index}`}
            label={`Gallery image or video ${index + 1}`}
            media={media}
            onChange={(newMedia) =>
              update((current) => ({
                ...current,
                about: {
                  ...current.about,
                  images: current.about.images.map((item, itemIndex) =>
                    itemIndex === index ? newMedia : item,
                  ) as HomeContent["about"]["images"],
                },
              }))
            }
          />
        ))}
      </EditorSection>

      <EditorSection title="Membership section">
        <TextField
          label="Eyebrow"
          value={draft.membership.eyebrow}
          onChange={(value) =>
            update((current) => ({
              ...current,
              membership: { ...current.membership, eyebrow: value },
            }))
          }
        />
        <TextField
          label="Section heading"
          value={draft.membership.heading}
          onChange={(value) =>
            update((current) => ({
              ...current,
              membership: { ...current.membership, heading: value },
            }))
          }
        />
        <TextField
          label="Introduction"
          value={draft.membership.description}
          onChange={(value) =>
            update((current) => ({
              ...current,
              membership: { ...current.membership, description: value },
            }))
          }
          multiline
        />
        {draft.membership.benefits.map((benefit, index) => (
          <TextField
            key={`benefit-${index}`}
            label={`Membership benefit ${index + 1}`}
            value={benefit}
            onChange={(value) =>
              update((current) => ({
                ...current,
                membership: {
                  ...current.membership,
                  benefits: current.membership.benefits.map((item, itemIndex) =>
                    itemIndex === index ? value : item,
                  ) as HomeContent["membership"]["benefits"],
                },
              }))
            }
          />
        ))}
        <TextField
          label="Membership button"
          value={draft.membership.cta}
          onChange={(value) =>
            update((current) => ({
              ...current,
              membership: { ...current.membership, cta: value },
            }))
          }
        />
        <TextField
          label="Membership years"
          value={draft.membership.years}
          onChange={(value) =>
            update((current) => ({
              ...current,
              membership: { ...current.membership, years: value },
            }))
          }
        />
        <TextField
          label="Membership highlight heading"
          value={draft.membership.metricHeading}
          onChange={(value) =>
            update((current) => ({
              ...current,
              membership: { ...current.membership, metricHeading: value },
            }))
          }
        />
        <TextField
          label="Refund terms"
          value={draft.membership.refundTerms}
          onChange={(value) =>
            update((current) => ({
              ...current,
              membership: { ...current.membership, refundTerms: value },
            }))
          }
        />
        <TextField
          label="Availability terms note"
          value={draft.membership.termsNote}
          onChange={(value) =>
            update((current) => ({
              ...current,
              membership: { ...current.membership, termsNote: value },
            }))
          }
        />
        <MediaField
          label="Membership section background image or video"
          media={draft.membership.media}
          onChange={(media) =>
            update((current) => ({
              ...current,
              membership: { ...current.membership, media },
            }))
          }
        />
      </EditorSection>

      <EditorSection title="Featured resort">
        <TextField
          label="Eyebrow"
          value={draft.featured.eyebrow}
          onChange={(value) =>
            update((current) => ({
              ...current,
              featured: { ...current.featured, eyebrow: value },
            }))
          }
        />
        <TextField
          label="Section heading"
          value={draft.featured.heading}
          onChange={(value) =>
            update((current) => ({
              ...current,
              featured: { ...current.featured, heading: value },
            }))
          }
        />
        <TextField
          label="Description"
          value={draft.featured.description}
          onChange={(value) =>
            update((current) => ({
              ...current,
              featured: { ...current.featured, description: value },
            }))
          }
          multiline
        />
        <TextField
          label="Location"
          value={draft.featured.location}
          onChange={(value) =>
            update((current) => ({
              ...current,
              featured: { ...current.featured, location: value },
            }))
          }
        />
        <TextField
          label="Button"
          value={draft.featured.cta}
          onChange={(value) =>
            update((current) => ({
              ...current,
              featured: { ...current.featured, cta: value },
            }))
          }
        />
        <MediaField
          label="Featured resort image or video"
          media={draft.featured.media}
          onChange={(media) =>
            update((current) => ({
              ...current,
              featured: { ...current.featured, media },
            }))
          }
        />
      </EditorSection>

      <EditorSection title="Final call to action">
        <TextField
          label="Eyebrow"
          value={draft.invitation.eyebrow}
          onChange={(value) =>
            update((current) => ({
              ...current,
              invitation: { ...current.invitation, eyebrow: value },
            }))
          }
        />
        <TextField
          label="Section heading"
          value={draft.invitation.heading}
          onChange={(value) =>
            update((current) => ({
              ...current,
              invitation: { ...current.invitation, heading: value },
            }))
          }
        />
        <TextField
          label="Description"
          value={draft.invitation.description}
          onChange={(value) =>
            update((current) => ({
              ...current,
              invitation: { ...current.invitation, description: value },
            }))
          }
          multiline
        />
        <TextField
          label="Button"
          value={draft.invitation.cta}
          onChange={(value) =>
            update((current) => ({
              ...current,
              invitation: { ...current.invitation, cta: value },
            }))
          }
        />
        <MediaField
          label="Final call-to-action background image or video"
          media={draft.invitation.media}
          onChange={(media) =>
            update((current) => ({
              ...current,
              invitation: { ...current.invitation, media },
            }))
          }
        />
      </EditorSection>

      <div className="home-editor-actions">
        <Button onClick={applyPreview}>
          <Save /> Re-apply to homepage preview
        </Button>
        <Button variant="ghost" onClick={resetAll}>
          <RotateCcw /> Reset all preview content
        </Button>
        {saved && (
          <span role="status">
            Changes show on the homepage right away, until this tab is reloaded.
          </span>
        )}
      </div>
    </div>
  );
}

function EditorSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="home-editor-section">
      <h3>{title}</h3>
      <div className="home-editor-fields">{children}</div>
    </section>
  );
}

export function TextField({
  label,
  value,
  onChange,
  multiline = false,
  inputType = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  inputType?: "text" | "number";
}) {
  return (
    <label className="home-editor-field">
      {label}
      {multiline ? (
        <textarea value={value} rows={3} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input
          max={inputType === "number" ? 100 : undefined}
          min={inputType === "number" ? 0 : undefined}
          step={inputType === "number" ? 1 : undefined}
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

export function MediaField({
  label,
  media,
  onChange,
  imageOnly = false,
}: {
  label: string;
  media: HomeMedia | null;
  onChange: (media: HomeMedia) => void;
  imageOnly?: boolean;
}) {
  const { createPreviewMedia } = useHomeContent();
  const [error, setError] = useState("");

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) return;

    const isImage = ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type);
    const isVideo = ["video/mp4", "video/webm", "video/quicktime"].includes(file.type);

    if (!isImage && !(isVideo && !imageOnly)) {
      setError(
        imageOnly
          ? "Choose a JPG, PNG, WebP or AVIF logo image."
          : "Choose a JPG, PNG, WebP, AVIF, MP4, WebM or MOV file.",
      );
      return;
    }

    const limit = isVideo ? videoLimit : imageLimit;
    if (file.size > limit) {
      setError(isVideo ? "Videos can be up to 100 MB." : "Images can be up to 50 MB.");
      return;
    }

    setError("");
    onChange(createPreviewMedia(file));
  };

  return (
    <div className="home-media-field">
      <label className="home-editor-field">
        {label}
        <span className="home-file-picker">
          {media?.type === "video" ? <Video size={18} /> : <ImagePlus size={18} />}
          <span>
            {media?.name || "Choose an image"}
            <small>
              {imageOnly
                ? "JPG, PNG, WebP or AVIF · up to 50 MB"
                : "Images up to 50 MB · videos up to 100 MB"}
            </small>
          </span>
          <input
            type="file"
            accept={
              imageOnly
                ? "image/jpeg,image/png,image/webp,image/avif"
                : "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
            }
            onChange={chooseFile}
          />
        </span>
      </label>
      {media && (
        <div className="home-media-preview">
          {media.type === "video" ? (
            <video src={media.src} controls muted playsInline preload="metadata" />
          ) : (
            <img src={media.src} alt={`Preview: ${label}`} />
          )}
        </div>
      )}
      {error && (
        <p className="home-media-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
