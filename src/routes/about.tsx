import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Compass,
  Gem,
  HeartHandshake,
  Leaf,
  Mountain,
  Palette,
  Play,
  Quote,
  Sparkles,
} from "lucide-react";
import { Layout } from "@/components/hotel-layout";
import { Button } from "@/components/ui/button";
import { useHomeContent } from "@/lib/home-content";
import { pageHead } from "@/lib/hotel-data";

const serviceIcons = [Mountain, Palette, HeartHandshake, Compass, Gem, Sparkles];

export const Route = createFileRoute("/about")({
  head: () =>
    pageHead(
      "About Gulsaga",
      "Discover the story, vision and hospitality philosophy behind Gulsaga—thoughtful stays, art, culture and meaningful experiences.",
    ),
  component: About,
});

function About() {
  const { aboutPageContent: about, footerContent } = useHomeContent();

  return (
    <Layout home>
      <div className="about-page">
        <section className="about-hero">
          <div id="top" />
          <img className="about-hero-image" src={about.heroMedia.src} alt="" fetchPriority="high" />
          <div className="about-hero-shade" />
          <div className="about-hero-content">
            <p className="about-eyebrow">{about.heroEyebrow}</p>
            <h1>{about.heroTitle}</h1>
            <p>{about.heroDescription}</p>
            <div className="about-hero-actions">
              <a className="about-gold-button" href="#about-story">
                Our Story <ArrowRight aria-hidden="true" />
              </a>
              <a className="about-watch-link" href="#about-journey">
                <span>
                  <Play aria-hidden="true" />
                </span>
                Watch Our Journey
              </a>
            </div>
          </div>
          <div className="about-wave about-wave-top" aria-hidden="true" />
        </section>

        <section className="about-story-band" id="about-story">
          <div className="about-story-image-wrap">
            <img src={about.storyImage.src} alt="A welcoming Gulsaga hospitality setting" />
          </div>
          <div className="about-story-copy">
            <p className="about-section-kicker">A POINT OF VIEW</p>
            <h2>{about.storyHeading}</h2>
            <p>{about.story}</p>
            <a className="about-text-link" href="#about-journey">
              Read our full story <ArrowRight aria-hidden="true" />
            </a>
          </div>
          <div className="about-philosophy">
            <article>
              <Compass aria-hidden="true" />
              <h3>Our Vision</h3>
              <p>{about.vision}</p>
            </article>
            <article>
              <Mountain aria-hidden="true" />
              <h3>Our Mission</h3>
              <p>{about.mission}</p>
            </article>
            <article>
              <Gem aria-hidden="true" />
              <h3>Our Values</h3>
              <ul>
                {about.values.map((value) => (
                  <li key={value}>
                    <Check aria-hidden="true" /> {value}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        {about.achievements.length > 0 && (
          <section className="about-achievements" aria-label="Gulsaga achievements">
            {about.achievements.map((achievement) => (
              <article key={`${achievement.metric}-${achievement.label}`}>
                <strong>{achievement.metric}</strong>
                <span>{achievement.label}</span>
              </article>
            ))}
          </section>
        )}

        <section className="about-lower-grid">
          <div className="about-services" id="about-what-we-do">
            <p className="about-section-kicker">OUR WORLD</p>
            <h2>What We Do</h2>
            <p className="about-section-intro">
              A hospitality ecosystem for travellers, artists, families and partners.
            </p>
            <div className="about-service-grid">
              {about.services.map((service, index) => {
                const Icon = serviceIcons[index % serviceIcons.length] ?? Sparkles;
                return (
                  <article className="about-service-card" key={`${service.title}-${index}`}>
                    <Icon aria-hidden="true" />
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                  </article>
                );
              })}
            </div>
          </div>

          <section className="about-founder" aria-labelledby="about-founder-heading">
            {about.founderImage ? (
              <img
                className="about-founder-image"
                src={about.founderImage.src}
                alt={`${about.founderName}, ${about.founderTitle}`}
                loading="lazy"
              />
            ) : (
              <div className="about-founder-placeholder" aria-label="Founder portrait not added">
                <span>{about.founderName.trim().slice(0, 2).toUpperCase() || "XY"}</span>
                <small>Founder portrait</small>
              </div>
            )}
            <div className="about-founder-copy">
              <p className="about-section-kicker">A NOTE FROM OUR FOUNDER</p>
              <h2 id="about-founder-heading">A Message from the Founder</h2>
              <Quote className="about-quote-icon" aria-hidden="true" />
              <blockquote>{about.founderMessage}</blockquote>
              <p className="about-founder-signature">{about.founderName}</p>
              <p className="about-founder-title">{about.founderTitle}</p>
            </div>
          </section>

          <section className="about-journey" id="about-journey">
            <p className="about-section-kicker">HOW WE’RE GROWING</p>
            <h2>Our Journey</h2>
            <div className="about-timeline">
              {about.milestones.map((milestone, index) => (
                <article className="about-milestone" key={`${milestone.chapter}-${index}`}>
                  <span className="about-timeline-dot" aria-hidden="true" />
                  <span className="about-milestone-chapter">{milestone.chapter}</span>
                  <div>
                    <h3>{milestone.title}</h3>
                    <p>{milestone.description}</p>
                  </div>
                </article>
              ))}
            </div>
            {about.journeyVideo && (
              <video
                className="about-journey-video"
                src={about.journeyVideo.src}
                controls
                preload="metadata"
                aria-label="Gulsaga behind-the-scenes journey"
              />
            )}
          </section>
        </section>

        <section className="about-place-section">
          <Leaf aria-hidden="true" />
          <div>
            <p className="about-section-kicker">A CONTINUING COMMITMENT</p>
            <h2>{about.sustainabilityHeading}</h2>
            <p>{about.sustainabilityDescription}</p>
          </div>
        </section>

        {about.testimonials.length > 0 && (
          <section className="about-testimonials">
            <p className="about-section-kicker">PARTNER PERSPECTIVES</p>
            <h2>In Good Company</h2>
            <div className="about-testimonial-grid">
              {about.testimonials.map((testimonial, index) => (
                <article key={`${testimonial.name}-${index}`}>
                  <Quote aria-hidden="true" />
                  <blockquote>{testimonial.quote}</blockquote>
                  <strong>{testimonial.name}</strong>
                  <span>{testimonial.detail}</span>
                </article>
              ))}
            </div>
          </section>
        )}

        {about.pressLinks.length > 0 && (
          <section className="about-press">
            <p className="about-section-kicker">PRESS & MEDIA</p>
            {about.pressLinks.map((press) => (
              <a href={press.href} key={`${press.label}-${press.href}`}>
                {press.label} <ArrowUpRight aria-hidden="true" />
              </a>
            ))}
          </section>
        )}

        <section
          className="about-cta"
          style={{ backgroundImage: `url("${footerContent.background.src}")` }}
        >
          <div className="about-cta-shade" />
          <div className="about-cta-content">
            <p className="about-section-kicker">YOUR NEXT CHAPTER</p>
            <h2>{about.ctaHeading}</h2>
            <p>{about.ctaDescription}</p>
            <Button asChild size="lg">
              <Link to="/membership">
                {about.ctaLabel} <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <a className="about-back-top" href="#top" aria-label="Back to top">
            <ArrowDown aria-hidden="true" />
          </a>
        </section>
      </div>
    </Layout>
  );
}
