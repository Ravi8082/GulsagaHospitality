import { Plus, RotateCcw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { MediaField, TextField } from "@/components/home-page-editor";
import {
  useHomeContent,
  type MembershipBenefit,
  type MembershipPageContent,
  type MembershipStep,
} from "@/lib/home-content";
import {
  defaultDestinationPitches,
  defaultMembershipPlans,
  initialMembershipOfferMedia,
  initialMembershipPageContent,
  type DestinationPitch,
  type MembershipPlan,
} from "@/lib/membership-data";

const benefitIcons = [
  { value: "bed", label: "Resort stay" },
  { value: "flower", label: "Art residency" },
  { value: "rings", label: "Destination wedding" },
  { value: "mountain", label: "Destinations" },
  { value: "star", label: "Member offer" },
  { value: "gift", label: "Partner privilege" },
  { value: "calendar", label: "Booking" },
  { value: "support", label: "Support" },
] as const;

function isMembershipBenefitIcon(value: string): value is MembershipBenefit["icon"] {
  return benefitIcons.some((icon) => icon.value === value);
}

export function MembershipAdminEditor() {
  const {
    membershipPageContent,
    updateMembershipPageContent,
    membershipOfferMedia,
    updateMembershipOfferMedia,
  } = useHomeContent();

  const updateText = (key: StringContentKey, value: string) => {
    updateMembershipPageContent({ ...membershipPageContent, [key]: value });
  };

  const updateBenefit = (id: string, change: Partial<MembershipBenefit>) => {
    updateMembershipPageContent({
      ...membershipPageContent,
      benefits: membershipPageContent.benefits.map((benefit) =>
        benefit.id === id ? { ...benefit, ...change } : benefit,
      ),
    });
  };

  const updateList = (
    key: "highlights" | "offerPerks" | "planInclusions",
    index: number,
    value: string,
  ) => {
    updateMembershipPageContent({
      ...membershipPageContent,
      [key]: membershipPageContent[key].map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    });
  };

  const updateStep = (key: "steps" | "timeline", id: string, change: Partial<MembershipStep>) => {
    updateMembershipPageContent({
      ...membershipPageContent,
      [key]: membershipPageContent[key].map((step) =>
        step.id === id ? { ...step, ...change } : step,
      ),
    });
  };

  const addBenefit = () => {
    updateMembershipPageContent({
      ...membershipPageContent,
      benefits: [
        ...membershipPageContent.benefits,
        { id: `benefit-${Date.now()}`, icon: "star", title: "New benefit" },
      ],
    });
  };

  const addStep = (key: "steps" | "timeline", title: string) => {
    updateMembershipPageContent({
      ...membershipPageContent,
      [key]: [
        ...membershipPageContent[key],
        {
          id: `${key}-${Date.now()}`,
          title,
          description: "Add details for this membership step.",
        },
      ],
    });
  };

  const updateStringList = (
    key: "highlights" | "offerPerks" | "planInclusions",
    transform: (items: string[]) => string[],
  ) => {
    updateMembershipPageContent({
      ...membershipPageContent,
      [key]: transform(membershipPageContent[key]),
    });
  };

  const updateSteps = (
    key: "steps" | "timeline",
    transform: (items: MembershipStep[]) => MembershipStep[],
  ) => {
    updateMembershipPageContent({
      ...membershipPageContent,
      [key]: transform(membershipPageContent[key]),
    });
  };

  const reset = () => {
    updateMembershipPageContent(initialMembershipPageContent);
    updateMembershipOfferMedia(initialMembershipOfferMedia);
  };

  return (
    <div className="home-editor">
      <div className="home-editor-toolbar">
        <div>
          <p className="eyebrow">EDIT THE WEBSITE PREVIEW</p>
          <h2>Membership page</h2>
        </div>
        <Button variant="outline" onClick={reset}>
          <RotateCcw /> Reset membership page
        </Button>
      </div>

      <div className="home-editor-notice" role="note">
        <strong>Saved to the database</strong>
        <span>
          Changes are saved automatically when signed in as an administrator. Confirm all prices,
          eligibility, refund terms and payment schedules against the signed agreement. Payment
          processing and email notifications are not connected yet.
        </span>
      </div>

      <EditorSection title="Hero & membership card">
        <TextField
          label="Hero eyebrow"
          value={membershipPageContent.eyebrow}
          onChange={(value) => updateText("eyebrow", value)}
        />
        <TextField
          label="Main heading"
          value={membershipPageContent.heading}
          onChange={(value) => updateText("heading", value)}
        />
        <TextField
          label="Highlighted heading"
          value={membershipPageContent.highlight}
          onChange={(value) => updateText("highlight", value)}
        />
        <TextField
          label="Hero description"
          value={membershipPageContent.description}
          onChange={(value) => updateText("description", value)}
          multiline
        />
        <TextField
          label="Primary CTA"
          value={membershipPageContent.primaryLabel}
          onChange={(value) => updateText("primaryLabel", value)}
        />
        <TextField
          label="Secondary CTA"
          value={membershipPageContent.secondaryLabel}
          onChange={(value) => updateText("secondaryLabel", value)}
        />
        <TextField
          label="Scroll prompt"
          value={membershipPageContent.scrollLabel}
          onChange={(value) => updateText("scrollLabel", value)}
        />
        <TextField
          label="Membership card tier"
          value={membershipPageContent.cardTier}
          onChange={(value) => updateText("cardTier", value)}
        />
        <TextField
          label="Membership card label"
          value={membershipPageContent.cardLabel}
          onChange={(value) => updateText("cardLabel", value)}
        />
        <TextField
          label="Refund disclaimer"
          value={membershipPageContent.refundDisclaimer}
          onChange={(value) => updateText("refundDisclaimer", value)}
          multiline
        />
        <MediaField
          label="Cinematic hero image or video"
          media={membershipPageContent.heroMedia}
          onChange={(heroMedia) =>
            updateMembershipPageContent({ ...membershipPageContent, heroMedia })
          }
        />
        <MediaField
          label="50% Back offer background image or video"
          media={membershipOfferMedia}
          onChange={updateMembershipOfferMedia}
        />
      </EditorSection>

      <EditorSection title="Membership highlights strip">
        {membershipPageContent.highlights.map((highlight, index) => (
          <div className="home-editor-group" key={`${index}-${highlight}`}>
            <TextField
              label={`Highlight ${index + 1}`}
              value={highlight}
              onChange={(value) => updateList("highlights", index, value)}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove highlight ${index + 1}`}
              onClick={() =>
                updateStringList("highlights", (items) =>
                  items.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() => updateStringList("highlights", (items) => [...items, "New highlight"])}
        >
          <Plus /> Add highlight
        </Button>
      </EditorSection>

      <EditorSection title="Membership benefits">
        <TextField
          label="Benefits heading"
          value={membershipPageContent.benefitsHeading}
          onChange={(value) => updateText("benefitsHeading", value)}
        />
        {membershipPageContent.benefits.map((benefit, index) => (
          <div className="home-editor-group membership-admin-benefit" key={benefit.id}>
            <TextField
              label={`Benefit ${index + 1}`}
              value={benefit.title}
              onChange={(title) => updateBenefit(benefit.id, { title })}
            />
            <label className="home-editor-field">
              Benefit icon
              <select
                value={benefit.icon}
                onChange={(event) => {
                  if (isMembershipBenefitIcon(event.currentTarget.value)) {
                    updateBenefit(benefit.id, { icon: event.currentTarget.value });
                  }
                }}
              >
                {benefitIcons.map((icon) => (
                  <option key={icon.value} value={icon.value}>
                    {icon.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove benefit ${index + 1}`}
              onClick={() =>
                updateMembershipPageContent({
                  ...membershipPageContent,
                  benefits: membershipPageContent.benefits.filter((item) => item.id !== benefit.id),
                })
              }
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button variant="outline" onClick={addBenefit}>
          <Plus /> Add benefit
        </Button>
      </EditorSection>

      <EditorSection title="Membership plans (Basic / Premium / Elite)">
        <TextField
          label="Plans heading"
          value={membershipPageContent.plansHeading ?? "Choose Your Membership"}
          onChange={(plansHeading) =>
            updateMembershipPageContent({ ...membershipPageContent, plansHeading })
          }
        />
        <TextField
          label="Plans note (prices, validity, eligibility)"
          value={membershipPageContent.plansNote ?? ""}
          onChange={(plansNote) =>
            updateMembershipPageContent({ ...membershipPageContent, plansNote })
          }
          multiline
        />
        {(membershipPageContent.tiers ?? defaultMembershipPlans).map((plan) => {
          const tiers = membershipPageContent.tiers ?? defaultMembershipPlans;
          const change = (patch: Partial<MembershipPlan>) =>
            updateMembershipPageContent({
              ...membershipPageContent,
              tiers: tiers.map((item) => (item.id === plan.id ? { ...item, ...patch } : item)),
            });
          return (
            <div className="home-editor-group" key={plan.id}>
              <TextField label="Plan name" value={plan.name} onChange={(name) => change({ name })} />
              <TextField
                label="Price in ₹ (0 = contact us)"
                value={String(plan.priceInr)}
                onChange={(value) => change({ priceInr: Math.max(0, Number(value.replace(/\D/g, "")) || 0) })}
              />
              <TextField
                label="Validity (years)"
                value={String(plan.years)}
                onChange={(value) => change({ years: Math.min(50, Math.max(1, Number(value.replace(/\D/g, "")) || 1)) })}
              />
              <TextField label="Badge (e.g. Most Popular, empty = none)" value={plan.badge} onChange={(badge) => change({ badge })} />
              <TextField label="Button label" value={plan.cta} onChange={(cta) => change({ cta })} />
              <TextField
                label="Features (one per line)"
                value={plan.features.join("\n")}
                onChange={(value) => change({ features: value.split("\n") })}
                multiline
              />
              <label className="home-editor-field">
                <input
                  type="checkbox"
                  checked={plan.contactOnly}
                  onChange={(event) => change({ contactOnly: event.currentTarget.checked })}
                />{" "}
                Contact-only plan (button opens the contact page)
              </label>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove plan ${plan.name}`}
                onClick={() =>
                  updateMembershipPageContent({
                    ...membershipPageContent,
                    tiers: tiers.filter((item) => item.id !== plan.id),
                  })
                }
              >
                <Trash2 />
              </Button>
            </div>
          );
        })}
        <Button
          variant="outline"
          onClick={() =>
            updateMembershipPageContent({
              ...membershipPageContent,
              tiers: [
                ...(membershipPageContent.tiers ?? defaultMembershipPlans),
                {
                  id: `plan-${Date.now().toString(36)}`,
                  name: "New plan",
                  priceInr: 100000,
                  years: 5,
                  features: ["Benefit one"],
                  badge: "",
                  cta: "Choose Plan",
                  contactOnly: false,
                },
              ],
            })
          }
        >
          <Plus /> Add plan
        </Button>      </EditorSection>

      <EditorSection title="WhatsApp & offers">
        <TextField
          label="WhatsApp pre-filled message (mention plan, discount or coupon code)"
          value={membershipPageContent.whatsappMessage ?? ""}
          onChange={(whatsappMessage) =>
            updateMembershipPageContent({ ...membershipPageContent, whatsappMessage })
          }
          multiline
        />
        <TextField
          label="Offer banner on the join page (e.g. Use code WELCOME10 for 10% off)"
          value={membershipPageContent.offerText ?? ""}
          onChange={(offerText) => updateMembershipPageContent({ ...membershipPageContent, offerText })}
          multiline
        />
      </EditorSection>

      <EditorSection title="Destination highlights (shown to guests)">
        <TextField
          label="Button label"
          value={membershipPageContent.destinationPitchCta ?? "Join Gulsaga Premium"}
          onChange={(destinationPitchCta) =>
            updateMembershipPageContent({ ...membershipPageContent, destinationPitchCta })
          }
        />
        {(membershipPageContent.destinationPitches ?? defaultDestinationPitches).map((pitch) => {
          const pitches = membershipPageContent.destinationPitches ?? defaultDestinationPitches;
          const change = (patch: Partial<DestinationPitch>) =>
            updateMembershipPageContent({
              ...membershipPageContent,
              destinationPitches: pitches.map((item) => (item.id === pitch.id ? { ...item, ...patch } : item)),
            });
          return (
            <div className="home-editor-group" key={pitch.id}>
              <TextField label="Destination name (matches destination / resort region)" value={pitch.name} onChange={(name) => change({ name })} />
              <TextField label="Hook line" value={pitch.tagline} onChange={(tagline) => change({ tagline })} multiline />
              <TextField
                label="Famous nearby places (one per line)"
                value={pitch.nearby.join("\n")}
                onChange={(value) => change({ nearby: value.split("\n") })}
                multiline
              />
              <TextField
                label="What guests can do (one per line)"
                value={pitch.activities.join("\n")}
                onChange={(value) => change({ activities: value.split("\n") })}
                multiline
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${pitch.name}`}
                onClick={() =>
                  updateMembershipPageContent({
                    ...membershipPageContent,
                    destinationPitches: pitches.filter((item) => item.id !== pitch.id),
                  })
                }
              >
                <Trash2 />
              </Button>
            </div>
          );
        })}
        <Button
          variant="outline"
          onClick={() =>
            updateMembershipPageContent({
              ...membershipPageContent,
              destinationPitches: [
                ...(membershipPageContent.destinationPitches ?? defaultDestinationPitches),
                {
                  id: `dest-${Date.now().toString(36)}`,
                  name: "New destination",
                  tagline: "Why members love it.",
                  nearby: ["Famous place"],
                  activities: ["Activity"],
                },
              ],
            })
          }
        >
          <Plus /> Add destination
        </Button>
      </EditorSection>
      <EditorSection title="How it works">
        <TextField
          label="Section heading"
          value={membershipPageContent.stepsHeading}
          onChange={(value) => updateText("stepsHeading", value)}
        />
        {membershipPageContent.steps.map((step, index) => (
          <div className="home-editor-group" key={step.id}>
            <TextField
              label={`Step ${index + 1} title`}
              value={step.title}
              onChange={(title) => updateStep("steps", step.id, { title })}
            />
            <TextField
              label={`Step ${index + 1} description`}
              value={step.description}
              onChange={(description) => updateStep("steps", step.id, { description })}
              multiline
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove step ${index + 1}`}
              onClick={() =>
                updateSteps("steps", (items) => items.filter((item) => item.id !== step.id))
              }
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button variant="outline" onClick={() => addStep("steps", "New membership step")}>
          <Plus /> Add step
        </Button>
      </EditorSection>

      <EditorSection title="50% Back offer">
        <TextField
          label="Offer eyebrow"
          value={membershipPageContent.offerEyebrow}
          onChange={(value) => updateText("offerEyebrow", value)}
        />
        <TextField
          label="Offer headline"
          value={membershipPageContent.offerHeading}
          onChange={(value) => updateText("offerHeading", value)}
        />
        <TextField
          label="Offer subheading"
          value={membershipPageContent.offerNote}
          onChange={(value) => updateText("offerNote", value)}
        />
        <TextField
          label="Offer button"
          value={membershipPageContent.offerCta}
          onChange={(value) => updateText("offerCta", value)}
        />
        {membershipPageContent.offerPerks.map((perk, index) => (
          <div className="home-editor-group" key={`${index}-${perk}`}>
            <TextField
              label={`Offer highlight ${index + 1}`}
              value={perk}
              onChange={(value) => updateList("offerPerks", index, value)}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove offer highlight ${index + 1}`}
              onClick={() =>
                updateStringList("offerPerks", (items) =>
                  items.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() => updateStringList("offerPerks", (items) => [...items, "New offer detail"])}
        >
          <Plus /> Add offer highlight
        </Button>
      </EditorSection>

      <EditorSection title="Pricing, eligibility & payment plans">
        <TextField
          label="Membership years"
          value={membershipPageContent.years}
          onChange={(value) => updateText("years", value)}
        />
        <TextField
          label="Eligibility heading"
          value={membershipPageContent.eligibilityHeading}
          onChange={(value) => updateText("eligibilityHeading", value)}
        />
        <TextField
          label="Eligibility details"
          value={membershipPageContent.eligibility}
          onChange={(value) => updateText("eligibility", value)}
          multiline
        />
        <TextField
          label="Pricing section heading"
          value={membershipPageContent.pricingHeading}
          onChange={(value) => updateText("pricingHeading", value)}
        />
        <TextField
          label="Pricing and eligibility eyebrow"
          value={membershipPageContent.pricingEyebrow}
          onChange={(value) => updateText("pricingEyebrow", value)}
        />
        <TextField
          label="Membership inclusions heading"
          value={membershipPageContent.inclusionsHeading}
          onChange={(value) => updateText("inclusionsHeading", value)}
        />
        {membershipPageContent.planInclusions.map((item, index) => (
          <div className="home-editor-group" key={`${index}-${item}`}>
            <TextField
              label={`Plan inclusion ${index + 1}`}
              value={item}
              onChange={(value) => updateList("planInclusions", index, value)}
              multiline
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove plan inclusion ${index + 1}`}
              onClick={() =>
                updateStringList("planInclusions", (items) =>
                  items.filter((_, itemIndex) => itemIndex !== index),
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
            updateStringList("planInclusions", (items) => [...items, "New plan inclusion"])
          }
        >
          <Plus /> Add plan inclusion
        </Button>
        <TextField
          label="Membership fee"
          value={membershipPageContent.price}
          onChange={(value) => updateText("price", value)}
        />
        <TextField
          label="Tax note"
          value={membershipPageContent.taxNote}
          onChange={(value) => updateText("taxNote", value)}
        />
        <TextField
          label="Down-payment label"
          value={membershipPageContent.downPaymentLabel}
          onChange={(value) => updateText("downPaymentLabel", value)}
        />
        <TextField
          label="Down payment"
          value={membershipPageContent.downPayment}
          onChange={(value) => updateText("downPayment", value)}
        />
        <TextField
          label="Balance label"
          value={membershipPageContent.balanceLabel}
          onChange={(value) => updateText("balanceLabel", value)}
        />
        <TextField
          label="Balance amount"
          value={membershipPageContent.balance}
          onChange={(value) => updateText("balance", value)}
        />
        <TextField
          label="Quarterly schedule label"
          value={membershipPageContent.quarterlyLabel}
          onChange={(value) => updateText("quarterlyLabel", value)}
        />
        <TextField
          label="Quarterly instalment"
          value={membershipPageContent.quarterlyPayment}
          onChange={(value) => updateText("quarterlyPayment", value)}
        />
        <TextField
          label="Monthly schedule label"
          value={membershipPageContent.monthlyLabel}
          onChange={(value) => updateText("monthlyLabel", value)}
        />
        <TextField
          label="Monthly instalment"
          value={membershipPageContent.monthlyPayment}
          onChange={(value) => updateText("monthlyPayment", value)}
        />
        <TextField
          label="Pricing note"
          value={membershipPageContent.pricingNote}
          onChange={(value) => updateText("pricingNote", value)}
          multiline
        />
      </EditorSection>

      <EditorSection title="Five-year timeline">
        <TextField
          label="Timeline heading"
          value={membershipPageContent.timelineHeading}
          onChange={(value) => updateText("timelineHeading", value)}
        />
        {membershipPageContent.timeline.map((item, index) => (
          <div className="home-editor-group" key={item.id}>
            <TextField
              label={`Timeline phase ${index + 1} marker`}
              value={item.marker ?? ""}
              onChange={(marker) => updateStep("timeline", item.id, { marker })}
            />
            <TextField
              label={`Timeline phase ${index + 1}`}
              value={item.title}
              onChange={(title) => updateStep("timeline", item.id, { title })}
            />
            <TextField
              label={`Timeline phase ${index + 1} details`}
              value={item.description}
              onChange={(description) => updateStep("timeline", item.id, { description })}
              multiline
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove timeline phase ${index + 1}`}
              onClick={() =>
                updateSteps("timeline", (items) => items.filter((entry) => entry.id !== item.id))
              }
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button variant="outline" onClick={() => addStep("timeline", "New timeline phase")}>
          <Plus /> Add timeline phase
        </Button>
      </EditorSection>

      <EditorSection title="Terms, member dashboard & enquiry">
        <TextField
          label="Terms section heading"
          value={membershipPageContent.termsHeading}
          onChange={(value) => updateText("termsHeading", value)}
        />
        <TextField
          label="Booking, eligibility and refund terms"
          value={membershipPageContent.terms}
          onChange={(value) => updateText("terms", value)}
          multiline
        />
        <TextField
          label="Terms expandable label"
          value={membershipPageContent.termsSummary}
          onChange={(value) => updateText("termsSummary", value)}
        />
        <TextField
          label="Enquiry heading"
          value={membershipPageContent.enquiryHeading}
          onChange={(value) => updateText("enquiryHeading", value)}
        />
        <TextField
          label="Enquiry description"
          value={membershipPageContent.enquiryDescription}
          onChange={(value) => updateText("enquiryDescription", value)}
          multiline
        />
        <TextField
          label="Enquiry form and email notification note"
          value={membershipPageContent.enquiryNote}
          onChange={(value) => updateText("enquiryNote", value)}
          multiline
        />
        <TextField
          label="Enquiry button"
          value={membershipPageContent.enquiryCta}
          onChange={(value) => updateText("enquiryCta", value)}
        />
        <TextField
          label="Member dashboard button"
          value={membershipPageContent.dashboardCta}
          onChange={(value) => updateText("dashboardCta", value)}
        />
      </EditorSection>
    </div>
  );
}

type StringContentKey = {
  [Key in keyof Required<MembershipPageContent>]: Required<MembershipPageContent>[Key] extends string
    ? Key
    : never;
}[keyof MembershipPageContent];

function EditorSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="home-editor-section">
      <h3>{title}</h3>
      <div className="home-editor-fields">{children}</div>
    </section>
  );
}

