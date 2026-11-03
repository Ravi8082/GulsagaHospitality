import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  CalendarDays,
  Check,
  FileText,
  Flower2,
  Gift,
  Headset,
  Heart,
  Infinity as InfinityIcon,
  Mountain,
  SlidersHorizontal,
  Star,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Layout } from "@/components/hotel-layout";
import { PreviewImage } from "@/components/preview-image";
import { Button } from "@/components/ui/button";
import { useHomeContent, type MembershipBenefit } from "@/lib/home-content";
import { pageHead } from "@/lib/hotel-data";

const benefitIcons = {
  bed: BedDouble,
  flower: Flower2,
  rings: Heart,
  mountain: Mountain,
  star: Star,
  gift: Gift,
  calendar: CalendarDays,
  support: Headset,
} as const;

const membershipPerkIcons = [BedDouble, Flower2, Heart, Star, Gift];

export const Route = createFileRoute("/membership")({
  head: () =>
    pageHead(
      "Gulsaga Membership",
      "Explore Gulsaga's five-year holiday membership, included experiences, payment options and official terms.",
    ),
  component: Membership,
});

function Membership() {
  const { content, membershipPageContent, membershipOfferMedia } = useHomeContent();
  const [paymentPlan, setPaymentPlan] = useState<"quarterly" | "monthly">("quarterly");
  const memberLogo = content.brand.logo;

  return (
    <Layout home>
      <div className="membership-page">
        <section className="membership-hero">
          {membershipPageContent.heroMedia.type === "video" ? (
            <video
              aria-label={membershipPageContent.heroMedia.name}
              autoPlay
              className="membership-hero-media"
              loop
              muted
              playsInline
              preload="none"
              src={membershipPageContent.heroMedia.src}
            />
          ) : (
            <PreviewImage
              src={membershipPageContent.heroMedia.src}
              alt="Luxury mountain resort and infinity pool at sunset"
              width={1920}
              height={650}
              loading="eager"
            />
          )}
          <div className="membership-hero-shade" />
          <div className="membership-hero-copy">
            <p className="eyebrow">{membershipPageContent.eyebrow}</p>
            <h1>
              {membershipPageContent.heading}
              <br />
              <span>{membershipPageContent.highlight}</span>
            </h1>
            <p>{membershipPageContent.description}</p>
            <div className="membership-hero-actions">
              <Button size="lg" asChild>
                <Link to="/contact" search={{ hotel: "Gulsaga Membership" }}>
                  {membershipPageContent.primaryLabel} <ArrowRight />
                </Link>
              </Button>
              <a className="membership-watch-link" href="#how-membership-works">
                <span aria-hidden="true">▶</span>
                {membershipPageContent.secondaryLabel}
              </a>
            </div>
            <p className="membership-hero-terms">{membershipPageContent.refundDisclaimer}</p>
          </div>

          <a className="membership-scroll" href="#membership-benefits">
            {membershipPageContent.scrollLabel} <ArrowDown size={14} />
          </a>
        </section>

        <section className="membership-perk-strip" aria-label="Membership highlights">
          <div className="membership-perk-inner">
            {membershipPageContent.highlights.map((highlight, index) => {
              const PerkIcon = membershipPerkIcons[index % membershipPerkIcons.length] ?? BedDouble;
              return (
                <div key={`${index}-${highlight}`}>
                  <PerkIcon aria-hidden="true" />
                  <span>{highlight}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="membership-overview" id="membership-benefits">
          <div className="membership-benefits-block">
            <span className="membership-section-rule" />
            <h2>{membershipPageContent.benefitsHeading}</h2>
            <div className="membership-benefit-grid">
              {membershipPageContent.benefits.map((benefit: MembershipBenefit) => {
                const BenefitIcon = benefitIcons[benefit.icon];
                return (
                  <article className="membership-benefit" key={benefit.id}>
                    <BenefitIcon aria-hidden="true" />
                    <h3>{benefit.title}</h3>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="membership-steps-block" id="how-membership-works">
            <span className="membership-section-rule" />
            <h2>{membershipPageContent.stepsHeading}</h2>
            <ol className="membership-steps">
              {membershipPageContent.steps.map((step, index) => {
                const StepIcon = [FileText, SlidersHorizontal, BedDouble][index % 3] ?? FileText;
                return (
                  <li key={step.id}>
                    <span className="membership-step-number">{index + 1}</span>
                    <StepIcon className="membership-step-icon" aria-hidden="true" />
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <article className="membership-offer-card">
            {membershipOfferMedia.type === "video" ? (
              <video
                aria-label={membershipOfferMedia.name}
                autoPlay
                className="membership-offer-background"
                loop
                muted
                playsInline
                preload="none"
                src={membershipOfferMedia.src}
              />
            ) : (
              <PreviewImage
                src={membershipOfferMedia.src}
                alt=""
                className="membership-offer-background"
                width={760}
                height={560}
              />
            )}
            <div className="membership-offer-shade" />
            <div className="membership-offer-content">
              <p>{membershipPageContent.offerEyebrow}</p>
              <h2>{membershipPageContent.offerHeading}</h2>
              <span className="membership-offer-note">{membershipPageContent.offerNote}</span>
              <div className="membership-offer-perks">
                {membershipPageContent.offerPerks.map((perk, index) => {
                  const PerkIcon = [CalendarDays, InfinityIcon, Star][index % 3] ?? Star;
                  return (
                    <span key={`${index}-${perk}`}>
                      <PerkIcon aria-hidden="true" />
                      {perk}
                    </span>
                  );
                })}
              </div>
              <a className="membership-offer-button" href="#membership-plan">
                {membershipPageContent.offerCta} <ArrowRight size={17} />
              </a>
              <small>{membershipPageContent.refundDisclaimer}</small>
            </div>
          </article>
        </section>

        <section className="membership-plan-section" id="membership-plan">
          <div className="membership-plan-intro">
            <p className="eyebrow">
              {membershipPageContent.years} YEARS · {membershipPageContent.eligibilityHeading}
            </p>
            <h2>{membershipPageContent.pricingHeading}</h2>
            <p>{membershipPageContent.eligibility}</p>
          </div>
          <div className="membership-plan-grid">
            <div className="membership-plan-inclusions">
              <h3>{membershipPageContent.inclusionsHeading}</h3>
              {membershipPageContent.planInclusions.map((item) => (
                <p key={item}>
                  <Check aria-hidden="true" /> {item}
                </p>
              ))}
            </div>
            <div className="membership-price-card">
              <p className="eyebrow">{membershipPageContent.pricingEyebrow}</p>
              <h3>
                {membershipPageContent.price} <small>{membershipPageContent.taxNote}</small>
              </h3>
              <div className="membership-payment-tabs" aria-label="Choose a payment schedule">
                <button
                  aria-pressed={paymentPlan === "quarterly"}
                  className={paymentPlan === "quarterly" ? "active" : ""}
                  onClick={() => setPaymentPlan("quarterly")}
                  type="button"
                >
                  Quarterly
                </button>
                <button
                  aria-pressed={paymentPlan === "monthly"}
                  className={paymentPlan === "monthly" ? "active" : ""}
                  onClick={() => setPaymentPlan("monthly")}
                  type="button"
                >
                  Monthly
                </button>
              </div>
              <dl>
                <div>
                  <dt>{membershipPageContent.downPaymentLabel}</dt>
                  <dd>
                    {membershipPageContent.downPayment} {membershipPageContent.taxNote}
                  </dd>
                </div>
                <div>
                  <dt>{membershipPageContent.balanceLabel}</dt>
                  <dd>
                    {membershipPageContent.balance} {membershipPageContent.taxNote}
                  </dd>
                </div>
                <div>
                  <dt>
                    {paymentPlan === "monthly"
                      ? membershipPageContent.monthlyLabel
                      : membershipPageContent.quarterlyLabel}
                  </dt>
                  <dd>
                    {paymentPlan === "monthly"
                      ? membershipPageContent.monthlyPayment
                      : membershipPageContent.quarterlyPayment}{" "}
                    {membershipPageContent.taxNote}
                  </dd>
                </div>
              </dl>
              <p className="membership-pricing-note">{membershipPageContent.pricingNote}</p>
              <Button size="lg" asChild>
                <Link to="/contact" search={{ hotel: "Gulsaga Membership" }}>
                  {membershipPageContent.primaryLabel} <ArrowUpRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="membership-timeline-section">
          <p className="eyebrow">FIVE YEARS, THOUGHTFULLY PLANNED</p>
          <h2>{membershipPageContent.timelineHeading}</h2>
          <div className="membership-timeline">
            {membershipPageContent.timeline.map((item, index) => (
              <article key={item.id}>
                <span>{item.marker ?? `0${index + 1}`}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="membership-terms-section" id="membership-terms">
          <div>
            <p className="eyebrow">PLEASE READ BEFORE ENQUIRING</p>
            <h2>{membershipPageContent.termsHeading}</h2>
            <details>
              <summary>{membershipPageContent.termsSummary}</summary>
              <p>{membershipPageContent.terms}</p>
            </details>
            <p className="membership-eligibility">{membershipPageContent.eligibility}</p>
          </div>
          <div className="membership-dashboard-card">
            <UsersRound aria-hidden="true" />
            <h3>Already a member?</h3>
            <p>View the member dashboard preview for membership and holiday information.</p>
            <Button variant="outline" asChild>
              <Link to="/dashboard">
                {membershipPageContent.dashboardCta} <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </section>

        <section className="membership-enquiry">
          <p className="eyebrow light">YOUR NEXT CHAPTER</p>
          <h2>{membershipPageContent.enquiryHeading}</h2>
          <p>{membershipPageContent.enquiryDescription}</p>
          <p className="membership-enquiry-note">{membershipPageContent.enquiryNote}</p>
          <Button size="lg" asChild>
            <Link to="/contact" search={{ hotel: "Gulsaga Membership" }}>
              {membershipPageContent.enquiryCta} <ArrowUpRight />
            </Link>
          </Button>
        </section>
      </div>
    </Layout>
  );
}
