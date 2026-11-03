import { useState } from "react";
import { ArrowUpRight, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { MediaField, TextField } from "@/components/home-page-editor";
import { Button } from "@/components/ui/button";
import { initialAboutPageContent, useHomeContent, type AboutPageContent } from "@/lib/home-content";

export function AboutAdminEditor() {
  const { aboutPageContent, updateAboutPageContent } = useHomeContent();
  const [draft, setDraft] = useState(aboutPageContent);
  const [saved, setSaved] = useState(false);

  const update = (change: (current: AboutPageContent) => AboutPageContent) => {
    setDraft(change);
    setSaved(false);
  };

  const updateField = <K extends keyof AboutPageContent>(key: K, value: AboutPageContent[K]) => {
    update((current) => ({ ...current, [key]: value }));
  };

  const apply = () => {
    updateAboutPageContent(draft);
    setSaved(true);
  };

  const reset = () => {
    setDraft(initialAboutPageContent);
    updateAboutPageContent(initialAboutPageContent);
    setSaved(true);
  };

  return (
    <div className="home-editor">
      <div className="home-editor-toolbar">
        <div>
          <p className="eyebrow">EDIT THE WEBSITE PREVIEW</p>
          <h2>About Us page</h2>
        </div>
        <Button variant="outline" asChild>
          <Link to="/about">
            View preview <ArrowUpRight />
          </Link>
        </Button>
      </div>

      <div className="home-editor-notice" role="note">
        <strong>Saved to the database</strong>
        <span>
          Changes are saved automatically when signed in as an administrator. Enter only verified
          milestones, achievements, testimonials and press coverage.
        </span>
      </div>

      <section className="home-editor-section">
        <h3>Cinematic hero & story</h3>
        <div className="home-editor-fields">
          <MediaField
            label="Hero image"
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
            label="Story heading"
            value={draft.storyHeading}
            onChange={(storyHeading) => updateField("storyHeading", storyHeading)}
          />
          <TextField
            label="Full story"
            value={draft.story}
            multiline
            onChange={(story) => updateField("story", story)}
          />
          <MediaField
            label="Story photograph"
            media={draft.storyImage}
            imageOnly
            onChange={(storyImage) => updateField("storyImage", storyImage)}
          />
          <MediaField
            label="Behind-the-scenes journey video (optional)"
            media={draft.journeyVideo}
            onChange={(journeyVideo) => updateField("journeyVideo", journeyVideo)}
          />
          {draft.journeyVideo && (
            <Button variant="outline" onClick={() => updateField("journeyVideo", null)}>
              <Trash2 /> Remove journey video
            </Button>
          )}
        </div>
      </section>

      <section className="home-editor-section">
        <h3>Vision, mission & values</h3>
        <div className="home-editor-fields">
          <TextField
            label="Vision"
            value={draft.vision}
            multiline
            onChange={(vision) => updateField("vision", vision)}
          />
          <TextField
            label="Mission"
            value={draft.mission}
            multiline
            onChange={(mission) => updateField("mission", mission)}
          />
          <div className="home-editor-detail-list">
            {draft.values.map((value, index) => (
              <div className="footer-editor-row" key={`value-${index}`}>
                <TextField
                  label={`Value ${index + 1}`}
                  value={value}
                  onChange={(nextValue) =>
                    updateField(
                      "values",
                      draft.values.map((item, itemIndex) =>
                        itemIndex === index ? nextValue : item,
                      ),
                    )
                  }
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Remove value ${index + 1}`}
                  onClick={() =>
                    updateField(
                      "values",
                      draft.values.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => updateField("values", [...draft.values, "New value"])}
            >
              <Plus /> Add value
            </Button>
          </div>
        </div>
      </section>

      <section className="home-editor-section">
        <h3>Achievements & impact</h3>
        <p className="home-editor-help">
          Add only verified figures or outcomes. Leave this list empty until there are approved
          facts to publish.
        </p>
        <div className="home-editor-fields">
          {draft.achievements.map((achievement, index) => (
            <div className="home-editor-group" key={`achievement-${index}`}>
              <TextField
                label={`Achievement ${index + 1} metric`}
                value={achievement.metric}
                onChange={(metric) =>
                  updateField(
                    "achievements",
                    draft.achievements.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, metric } : item,
                    ),
                  )
                }
              />
              <TextField
                label="Description"
                value={achievement.label}
                onChange={(label) =>
                  updateField(
                    "achievements",
                    draft.achievements.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, label } : item,
                    ),
                  )
                }
              />
              <Button
                variant="outline"
                onClick={() =>
                  updateField(
                    "achievements",
                    draft.achievements.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                <Trash2 /> Remove achievement
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              updateField("achievements", [...draft.achievements, { metric: "", label: "" }])
            }
          >
            <Plus /> Add verified achievement
          </Button>
        </div>
      </section>

      <section className="home-editor-section">
        <h3>What we do</h3>
        <div className="home-editor-fields">
          {draft.services.map((service, index) => (
            <div className="home-editor-group" key={`service-${index}`}>
              <TextField
                label={`Service ${index + 1} title`}
                value={service.title}
                onChange={(title) =>
                  updateField(
                    "services",
                    draft.services.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, title } : item,
                    ),
                  )
                }
              />
              <TextField
                label="Description"
                value={service.description}
                multiline
                onChange={(description) =>
                  updateField(
                    "services",
                    draft.services.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, description } : item,
                    ),
                  )
                }
              />
              <Button
                variant="outline"
                onClick={() =>
                  updateField(
                    "services",
                    draft.services.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                <Trash2 /> Remove service
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              updateField("services", [
                ...draft.services,
                { title: "New experience", description: "Add a short introduction." },
              ])
            }
          >
            <Plus /> Add service
          </Button>
        </div>
      </section>

      <section className="home-editor-section">
        <h3>Founder message</h3>
        <div className="home-editor-fields">
          <MediaField
            label="Founder portrait (optional)"
            media={draft.founderImage}
            imageOnly
            onChange={(founderImage) => updateField("founderImage", founderImage)}
          />
          {draft.founderImage && (
            <Button variant="outline" onClick={() => updateField("founderImage", null)}>
              <Trash2 /> Remove founder portrait
            </Button>
          )}
          <TextField
            label="Founder name"
            value={draft.founderName}
            onChange={(founderName) => updateField("founderName", founderName)}
          />
          <TextField
            label="Founder title"
            value={draft.founderTitle}
            onChange={(founderTitle) => updateField("founderTitle", founderTitle)}
          />
          <TextField
            label="Founder message"
            value={draft.founderMessage}
            multiline
            onChange={(founderMessage) => updateField("founderMessage", founderMessage)}
          />
        </div>
      </section>

      <section className="home-editor-section">
        <h3>Journey timeline</h3>
        <p className="home-editor-help">
          Chapter labels are flexible. Use confirmed dates or milestones only when they are
          verified.
        </p>
        <div className="home-editor-fields">
          {draft.milestones.map((milestone, index) => (
            <div className="home-editor-group" key={`milestone-${index}`}>
              <TextField
                label={`Chapter ${index + 1} label`}
                value={milestone.chapter}
                onChange={(chapter) =>
                  updateField(
                    "milestones",
                    draft.milestones.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, chapter } : item,
                    ),
                  )
                }
              />
              <TextField
                label="Milestone title"
                value={milestone.title}
                onChange={(title) =>
                  updateField(
                    "milestones",
                    draft.milestones.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, title } : item,
                    ),
                  )
                }
              />
              <TextField
                label="Description"
                value={milestone.description}
                multiline
                onChange={(description) =>
                  updateField(
                    "milestones",
                    draft.milestones.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, description } : item,
                    ),
                  )
                }
              />
              <Button
                variant="outline"
                onClick={() =>
                  updateField(
                    "milestones",
                    draft.milestones.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                <Trash2 /> Remove milestone
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              updateField("milestones", [
                ...draft.milestones,
                { chapter: "NEW CHAPTER", title: "New milestone", description: "" },
              ])
            }
          >
            <Plus /> Add milestone
          </Button>
        </div>
      </section>

      <section className="home-editor-section">
        <h3>Sustainability & community</h3>
        <div className="home-editor-fields">
          <TextField
            label="Section heading"
            value={draft.sustainabilityHeading}
            onChange={(sustainabilityHeading) =>
              updateField("sustainabilityHeading", sustainabilityHeading)
            }
          />
          <TextField
            label="Section description"
            value={draft.sustainabilityDescription}
            multiline
            onChange={(sustainabilityDescription) =>
              updateField("sustainabilityDescription", sustainabilityDescription)
            }
          />
        </div>
      </section>

      <section className="home-editor-section">
        <h3>Testimonials & press</h3>
        <p className="home-editor-help">
          These sections remain hidden until you add testimonials or press links. Publish approved
          quotes and real media coverage only.
        </p>
        <div className="home-editor-fields">
          {draft.testimonials.map((testimonial, index) => (
            <div className="home-editor-group" key={`testimonial-${index}`}>
              <TextField
                label="Testimonial"
                value={testimonial.quote}
                multiline
                onChange={(quote) =>
                  updateField(
                    "testimonials",
                    draft.testimonials.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, quote } : item,
                    ),
                  )
                }
              />
              <TextField
                label="Name"
                value={testimonial.name}
                onChange={(name) =>
                  updateField(
                    "testimonials",
                    draft.testimonials.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, name } : item,
                    ),
                  )
                }
              />
              <TextField
                label="Guest / partner detail"
                value={testimonial.detail}
                onChange={(detail) =>
                  updateField(
                    "testimonials",
                    draft.testimonials.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, detail } : item,
                    ),
                  )
                }
              />
              <Button
                variant="outline"
                onClick={() =>
                  updateField(
                    "testimonials",
                    draft.testimonials.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                <Trash2 /> Remove testimonial
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              updateField("testimonials", [
                ...draft.testimonials,
                { quote: "", name: "", detail: "" },
              ])
            }
          >
            <Plus /> Add approved testimonial
          </Button>
          {draft.pressLinks.map((link, index) => (
            <div className="footer-editor-row" key={`press-${index}`}>
              <TextField
                label={`Press mention ${index + 1}`}
                value={link.label}
                onChange={(label) =>
                  updateField(
                    "pressLinks",
                    draft.pressLinks.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, label } : item,
                    ),
                  )
                }
              />
              <TextField
                label="Article URL"
                value={link.href}
                onChange={(href) =>
                  updateField(
                    "pressLinks",
                    draft.pressLinks.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, href } : item,
                    ),
                  )
                }
              />
              <Button
                variant="outline"
                size="icon"
                aria-label={`Remove press mention ${index + 1}`}
                onClick={() =>
                  updateField(
                    "pressLinks",
                    draft.pressLinks.filter((_, itemIndex) => itemIndex !== index),
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
              updateField("pressLinks", [...draft.pressLinks, { label: "", href: "" }])
            }
          >
            <Plus /> Add press link
          </Button>
        </div>
      </section>

      <section className="home-editor-section">
        <h3>Membership call to action</h3>
        <div className="home-editor-fields">
          <TextField
            label="CTA heading"
            value={draft.ctaHeading}
            onChange={(ctaHeading) => updateField("ctaHeading", ctaHeading)}
          />
          <TextField
            label="CTA description"
            value={draft.ctaDescription}
            multiline
            onChange={(ctaDescription) => updateField("ctaDescription", ctaDescription)}
          />
          <TextField
            label="CTA button"
            value={draft.ctaLabel}
            onChange={(ctaLabel) => updateField("ctaLabel", ctaLabel)}
          />
        </div>
      </section>

      <div className="home-editor-actions">
        <Button onClick={apply}>
          <Save /> Apply About preview
        </Button>
        <Button variant="outline" onClick={reset}>
          <RotateCcw /> Reset About page
        </Button>
        {saved && <span role="status">About page preview updated in this browser session.</span>}
      </div>
    </div>
  );
}
