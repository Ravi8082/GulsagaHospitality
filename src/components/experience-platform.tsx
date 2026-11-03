import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CircleAlert,
  Eye,
  FileImage,
  Heart,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Mountain,
  Play,
  Plus,
  ShieldCheck,
  Star,
  UploadCloud,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  apiRequest,
  protectedMediaUrl,
  updateCsrfToken,
  uploadExperience,
  type DestinationOption,
  type Experience,
  type ExperienceCategory,
  type ExperienceMedia,
  type ResortOption,
} from "@/lib/experience-api";
import { AUTH_EVENT, getToken } from "@/lib/auth-token";
import { experiencePreviewStories } from "@/lib/experience-preview-data";
import { useHomeContent } from "@/lib/home-content";

type HospitalityBundle = {
  collections: {
    destinations: DestinationOption[];
    resorts: ResortOption[];
  };
};

type ExperiencePageData = {
  rows: Experience[];
  total: number;
  page: number;
  pageSize: number;
};

const categories = [
  { slug: "", label: "All Experiences" },
  { slug: "resort-stays", label: "Resort Stays" },
  { slug: "luxury-holidays", label: "Luxury Holidays" },
  { slug: "art-residency", label: "Art Residency" },
  { slug: "destination-weddings", label: "Destination Weddings" },
  { slug: "adventure-nature", label: "Adventure & Nature" },
  { slug: "cultural-experiences", label: "Cultural Experiences" },
  { slug: "family-holidays", label: "Family Holidays" },
  { slug: "romantic-getaways", label: "Romantic Getaways" },
];
const experiencePreviewEnabled =
  import.meta.env.DEV || import.meta.env.VITE_EXPERIENCE_DEMO_MODE === "true";

const ratingLabels = [
  ["hospitalityRating", "Hospitality"],
  ["cleanlinessRating", "Cleanliness"],
  ["locationRating", "Location"],
  ["amenitiesRating", "Amenities"],
  ["foodRating", "Food"],
] as const;

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <span className="experience-stars" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={size}
          fill={index < Math.round(value) ? "currentColor" : "none"}
          strokeWidth={1.7}
        />
      ))}
      <strong>{value.toFixed(1)}</strong>
    </span>
  );
}

function LoadingState({ label = "Loading experiences" }: { label?: string }) {
  return (
    <div className="experience-loading" role="status">
      <LoaderCircle size={23} className="experience-spin" />
      <span>{label}</span>
    </div>
  );
}

function ExperienceMedia({
  media,
  protectedContent = false,
  className = "",
}: {
  media?: ExperienceMedia;
  protectedContent?: boolean;
  className?: string;
}) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!media) return;
    let active = true;
    let objectUrl = "";
    setFailed(false);
    if (protectedContent) {
      void protectedMediaUrl(media.url)
        .then((url) => {
          objectUrl = url;
          if (active) setSrc(url);
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    } else {
      setSrc(media.url);
    }
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [media, protectedContent]);

  if (!media || failed || !src) {
    return (
      <div className={`experience-media-empty ${className}`}>
        {failed ? <CircleAlert /> : <Mountain />}
        {failed && <span>Media preview unavailable</span>}
      </div>
    );
  }
  if (media.kind === "VIDEO") {
    return (
      <video
        className={className}
        src={src}
        poster={media.thumbnailUrl ?? undefined}
        controls
        preload="metadata"
        aria-label={media.altText ?? "Member travel video"}
      />
    );
  }
  return <img className={className} src={src} alt={media.altText ?? "Member travel experience"} />;
}

export function ExperienceSignIn({
  onVerified,
  compact = false,
}: {
  onVerified: () => void;
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ message: string }>("community/experiences/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ email, ...(displayName.trim() ? { displayName } : {}) }),
      });
      setSent(true);
      setNotice(result.data.message);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("community/experiences/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
      onVerified();
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className={`experience-signin${compact ? " experience-signin-compact" : ""}`}
      onSubmit={sent ? verifyCode : sendCode}
    >
      <span className="experience-signin-icon">
        <LockKeyhole size={21} />
      </span>
      <p className="eyebrow">MEMBER ACCESS</p>
      <h2>{sent ? "Check your inbox." : "Sign in to share your story."}</h2>
      <p className="experience-muted">
        {sent
          ? `Enter the six-digit code sent to ${email}.`
          : "We'll email you a one-time verification code. No password required."}
      </p>
      {!sent && (
        <>
          <label>
            Your name <span>(optional)</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
              maxLength={100}
              placeholder="How should we introduce you?"
            />
          </label>
          <label>
            Email address
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              required
              maxLength={255}
              placeholder="you@example.com"
            />
          </label>
        </>
      )}
      {sent && (
        <label>
          Verification code
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            minLength={6}
            maxLength={6}
            placeholder="000000"
          />
        </label>
      )}
      {error && <p className="experience-alert experience-alert-error">{error}</p>}
      {notice && <p className="experience-alert experience-alert-success">{notice}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? (
          <LoaderCircle className="experience-spin" />
        ) : sent ? (
          <ShieldCheck />
        ) : (
          <ArrowRight />
        )}
        {busy ? "Please wait…" : sent ? "Verify email" : "Email me a code"}
      </Button>
      {sent && (
        <button
          className="experience-text-button"
          type="button"
          onClick={() => {
            setSent(false);
            setCode("");
            setNotice("");
          }}
        >
          Use another email address
        </button>
      )}
      <small>Your one-time code is kept in server memory only and is never saved in MySQL.</small>
    </form>
  );
}

function ExperienceCard({
  experience,
  onOpen,
  place,
}: {
  experience: Experience;
  onOpen: (experience: Experience) => void;
  place: string;
}) {
  const heroMedia = experience.media[0];
  return (
    <article className="experience-card">
      <button
        className="experience-card-image"
        type="button"
        aria-label={`View ${experience.title}`}
        onClick={() => onOpen(experience)}
      >
        <ExperienceMedia media={heroMedia} />
        {heroMedia?.kind === "VIDEO" && (
          <span className="experience-play">
            <Play fill="currentColor" />
          </span>
        )}
        {experience.verifiedStay && (
          <span className="experience-verified">
            <BadgeCheck size={14} /> Verified Stay
          </span>
        )}
        {!experience.verifiedStay && experience.verifiedMember && (
          <span className="experience-verified">
            <BadgeCheck size={14} /> Verified Member
          </span>
        )}
        {experience.previewOnly && <span className="experience-preview-badge">Preview sample</span>}
        {experience.media.length > 1 && (
          <span className="experience-media-count">
            <FileImage size={14} /> +{experience.media.length - 1}
          </span>
        )}
        <span className="experience-image-open">
          <Eye size={16} /> View story
        </span>
      </button>
      <div className="experience-card-body">
        <div className="experience-card-byline">
          <div className="experience-avatar">
            {(experience.member?.displayName || "G").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <strong>{experience.member?.displayName || "Gulsaga Member"}</strong>
            <span>
              {experience.verifiedMember ? "Verified member" : "Community story"}
              {experience.category?.name ? ` · ${experience.category.name}` : ""}
            </span>
          </div>
          <Stars value={experience.overallRating} size={13} />
        </div>
        <button className="experience-card-title" type="button" onClick={() => onOpen(experience)}>
          {experience.title}
        </button>
        <p>{experience.shortDescription}</p>
        <div className="experience-card-location">
          <MapPin size={14} />
          {place || "Gulsaga destination"}
          {experience.visitDate && (
            <time dateTime={experience.visitDate}>
              {new Date(experience.visitDate).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              })}
            </time>
          )}
        </div>
        <div className="experience-card-footer">
          <span>
            <Heart size={14} /> {experience.likeCount}
          </span>
          <span>
            <MessageCircle size={14} /> {experience.commentCount}
          </span>
          <span>
            <Eye size={14} /> {experience.views.toLocaleString("en-IN")}
          </span>
          <button type="button" onClick={() => onOpen(experience)}>
            Read story <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}

function ExperienceDetail({
  experience,
  onClose,
  place,
}: {
  experience: Experience;
  onClose: () => void;
  place: string;
}) {
  const [detail, setDetail] = useState<Experience | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (experience.previewOnly) {
      setDetail(experience);
      return;
    }
    let active = true;
    void apiRequest<Experience>(`community/experiences/${experience.id}`)
      .then(({ data }) => {
        if (active) setDetail(data);
      })
      .catch((reason: unknown) => {
        if (active) setError(messageOf(reason));
      });
    return () => {
      active = false;
    };
  }, [experience]);

  return (
    <div className="experience-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="experience-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={experience.title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="experience-dialog-close"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          <X />
        </button>
        <div className="experience-dialog-media">
          <ExperienceMedia media={detail?.media[0] ?? experience.media[0]} />
        </div>
        <div className="experience-dialog-content">
          {detail ? (
            <>
              <p className="eyebrow">{detail.category?.name || "MEMBER EXPERIENCE"}</p>
              <h2>{detail.title}</h2>
              <div className="experience-detail-meta">
                <Stars value={detail.overallRating} />
                <span>{detail.member?.displayName || "Gulsaga Member"}</span>
                {detail.verifiedMember && <BadgeCheck size={16} />}
              </div>
              <p className="experience-muted">{place}</p>
              <p className="experience-detail-story">{detail.story}</p>
              <div className="experience-rating-breakdown">
                {Object.entries(detail.ratings).map(([label, rating]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <Stars value={rating} size={12} />
                  </div>
                ))}
              </div>
              <div className="experience-dialog-gallery">
                {detail.media.slice(1).map((media) => (
                  <ExperienceMedia key={media.id} media={media} />
                ))}
              </div>
              <p className="experience-muted">
                {detail.previewOnly
                  ? "Design preview only · not a real member review"
                  : detail.verifiedStay
                    ? "Stay verified by Gulsaga"
                    : detail.verifiedMember
                      ? "Member identity verified; stay not independently verified"
                      : "Community submission reviewed by Gulsaga"}
              </p>
            </>
          ) : error ? (
            <p className="experience-alert experience-alert-error">{error}</p>
          ) : (
            <LoadingState label="Opening member story" />
          )}
        </div>
      </section>
    </div>
  );
}

export function PublicExperiences() {
  const { experiencesPageContent } = useHomeContent();
  const [rows, setRows] = useState<Experience[]>([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const [selected, setSelected] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [hospitalityError, setHospitalityError] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hospitality, setHospitality] = useState<HospitalityBundle["collections"]>({
    destinations: [],
    resorts: [],
  });

  useEffect(() => {
    let active = true;
    void apiRequest<HospitalityBundle>("public/hospitality")
      .then(({ data }) => {
        if (active) setHospitality(data.collections);
      })
      .catch(() => {
        if (active)
          setHospitalityError("Destination and resort names are temporarily unavailable.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (previewMode) return;
    let active = true;
    setLoading(true);
    const query = new URLSearchParams({ page: "1", pageSize: "30", sort, search });
    if (category) query.set("category", category);
    void apiRequest<ExperiencePageData>(`community/experiences?${query}`)
      .then(({ data }) => {
        if (!active) return;
        const usePreviewStories =
          experiencePreviewEnabled && !category && !search.trim() && data.total === 0;
        const nextRows =
          !data.rows.length && usePreviewStories ? experiencePreviewStories : data.rows;
        setRows(nextRows);
        setTotal(nextRows === experiencePreviewStories ? nextRows.length : data.total);
        setPreviewMode(nextRows === experiencePreviewStories);
        setError("");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        const apiError = messageOf(reason);
        setError(apiError);
        if (experiencePreviewEnabled) {
          setRows(experiencePreviewStories);
          setTotal(experiencePreviewStories.length);
          setPreviewMode(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [category, search, sort, previewMode, retryCount]);

  const heroImage = experiencesPageContent.heroMedia.src;
  const visibleRows = useMemo(() => {
    if (!previewMode) return rows;
    const query = search.trim().toLocaleLowerCase();
    const matching = rows.filter((experience) => {
      const matchesCategory = !category || experience.category?.slug === category;
      const matchesSearch =
        !query ||
        [experience.title, experience.shortDescription, experience.previewPlace]
          .filter(Boolean)
          .some((value) => value?.toLocaleLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
    if (sort === "highest-rated")
      return [...matching].sort((a, b) => b.overallRating - a.overallRating);
    if (sort === "most-liked") return [...matching].sort((a, b) => b.likeCount - a.likeCount);
    return [...matching].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  }, [category, previewMode, rows, search, sort]);
  const placeFor = (experience: Experience) =>
    experience.previewPlace ||
    [
      hospitality.resorts.find((item) => item.id === experience.resortId)?.name,
      hospitality.destinations.find((item) => item.id === experience.destinationId)?.name,
    ]
      .filter(Boolean)
      .join(" · ");
  return (
    <div className="experience-page">
      <section className="experience-hero" style={{ backgroundImage: `url("${heroImage}")` }}>
        <div className="experience-hero-shade" />
        <div className="experience-hero-inner">
          <div>
            <p className="eyebrow">{experiencesPageContent.heroEyebrow}</p>
            <h1>
              {experiencesPageContent.heroTitle}
              <br />
              <em>{experiencesPageContent.heroHighlight}</em>
            </h1>
            <p className="experience-hero-copy">{experiencesPageContent.heroDescription}</p>
            <div className="experience-hero-actions">
              <Button asChild>
                <Link to="/experiences/share">
                  <UploadCloud /> Share Your Experience <ArrowRight />
                </Link>
              </Button>
              <a href="#member-stories" className="experience-hero-secondary">
                <span>
                  <Play size={15} fill="currentColor" />
                </span>{" "}
                Watch Stories
              </a>
            </div>
          </div>
          <div className="experience-hero-note">
            <span>01 — COMMUNITY</span>
            <span>Honest memories. Thoughtfully shared.</span>
          </div>
        </div>
        <div className="experience-trust-strip">
          {[
            [BadgeCheck, previewMode ? "Preview Stories" : "Approved Stories"],
            [FileImage, "Photos & Videos"],
            [UsersRound, previewMode ? "Sample Content" : "Real Member Stories"],
            [ShieldCheck, "Admin Reviewed"],
            [Star, "Rate & Review"],
          ].map(([Icon, text]) => (
            <div key={String(text)}>
              <Icon size={22} />
              <span>{String(text)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="experience-community content-section" id="member-stories">
        <div className="experience-heading">
          <span />
          <div>
            <p className="eyebrow">A COMMUNITY OF GOOD STORIES</p>
            <h2>Member Experiences</h2>
          </div>
          <span />
        </div>
        <div className="experience-toolbar">
          <div className="experience-categories" aria-label="Filter by experience type">
            {categories.map((item) => (
              <button
                type="button"
                key={item.slug}
                className={category === item.slug ? "selected" : ""}
                onClick={() => setCategory(item.slug)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="experience-filters">
            <input
              type="search"
              aria-label="Search member experiences"
              placeholder="Search stories"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <label>
              <span className="sr-only">Sort experiences</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="latest">Latest stories</option>
                <option value="highest-rated">Highest rated</option>
                <option value="most-liked">Most loved</option>
              </select>
              <ChevronDown size={16} />
            </label>
          </div>
        </div>
        {hospitalityError && !previewMode && (
          <p className="experience-alert experience-alert-error">{hospitalityError}</p>
        )}
        {previewMode && (
          <div className="experience-preview-notice" role="status">
            <CircleAlert size={18} />
            <span>
              <strong>Preview mode:</strong> these sample stories, ratings and photos are for layout
              preview only—not real member reviews or verified stays.
              {error && <span className="experience-preview-error"> Community API: {error}</span>}
            </span>
            {error && (
              <button
                type="button"
                onClick={() => {
                  setPreviewMode(false);
                  setRows([]);
                  setError("");
                  setRetryCount((count) => count + 1);
                }}
              >
                Retry connection
              </button>
            )}
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : error && !previewMode ? (
          <div className="experience-empty">
            <CircleAlert />
            <h3>Stories are temporarily unavailable.</h3>
            <p>{error}</p>
          </div>
        ) : visibleRows.length ? (
          <>
            <p className="experience-result-count">
              {previewMode
                ? `${visibleRows.length} sample stories`
                : `${total} stories shared by our community`}
            </p>
            <div className="experience-grid">
              {visibleRows.map((experience) => (
                <ExperienceCard
                  key={experience.id}
                  experience={experience}
                  onOpen={setSelected}
                  place={placeFor(experience)}
                />
              ))}
            </div>
          </>
        ) : previewMode ? (
          <div className="experience-empty">
            <Mountain />
            <p className="eyebrow">NO MATCHING PREVIEW STORIES</p>
            <h3>Try another category or search.</h3>
          </div>
        ) : (
          <div className="experience-empty">
            <Mountain />
            <p className="eyebrow">THE FIRST STORY IS YOURS</p>
            <h3>Every journey has a story.</h3>
            <p>Approved member experiences will appear here. Share a memory to begin.</p>
            <Button asChild>
              <Link to="/experiences/share">
                Share Your Experience <ArrowRight />
              </Link>
            </Button>
          </div>
        )}
      </section>
      {selected && (
        <ExperienceDetail
          experience={selected}
          onClose={() => setSelected(null)}
          place={placeFor(selected)}
        />
      )}
    </div>
  );
}

function UploadPreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return (
    <div className="experience-upload-preview">
      {file.type.startsWith("video/") ? (
        <video src={url} muted preload="metadata" />
      ) : (
        <img src={url} alt={file.name} />
      )}
      <button type="button" onClick={onRemove} aria-label={`Remove ${file.name}`}>
        <X size={15} />
      </button>
      <span>{file.name}</span>
    </div>
  );
}

export function ShareExperience({ experienceId }: { experienceId?: string }) {
  const [member, setMember] = useState(false);
  const [checkingMember, setCheckingMember] = useState(true);
  const [categoriesData, setCategoriesData] = useState<ExperienceCategory[]>([]);
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [resorts, setResorts] = useState<ResortOption[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [rating, setRating] = useState(5);
  const [ratings, setRatings] = useState<Record<string, number>>({
    hospitalityRating: 5,
    cleanlinessRating: 5,
    locationRating: 5,
    amenitiesRating: 5,
    foodRating: 5,
  });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dataError, setDataError] = useState("");
  const [form, setForm] = useState({
    title: "",
    categoryId: "",
    destinationId: "",
    resortId: "",
    shortDescription: "",
    story: "",
    visitDate: "",
  });

  useEffect(() => {
    let active = true;
    void Promise.all([
      apiRequest<ExperienceCategory[]>("community/experiences/categories"),
      apiRequest<HospitalityBundle>("public/hospitality"),
    ])
      .then(([categoryResult, bundle]) => {
        if (!active) return;
        setCategoriesData(categoryResult.data);
        setDestinations(bundle.data.collections.destinations);
        setResorts(bundle.data.collections.resorts);
      })
      .catch((reason: unknown) => {
        if (active) setDataError(messageOf(reason));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void apiRequest<Experience[]>("community/experiences/mine")
      .then(({ data }) => {
        if (!active) return;
        setMember(true);
        if (!experienceId) return;
        const existing = data.find((item) => item.id === experienceId);
        if (!existing || !["REJECTED", "REVISION_REQUESTED"].includes(existing.status)) {
          setDataError("Only a rejected or revision-requested submission can be edited.");
          return;
        }
        setForm({
          title: existing.title,
          categoryId: existing.category?.id ?? "",
          destinationId: existing.destinationId?.toString() ?? "",
          resortId: existing.resortId?.toString() ?? "",
          shortDescription: existing.shortDescription,
          story: existing.story ?? "",
          visitDate: existing.visitDate ? existing.visitDate.slice(0, 10) : "",
        });
        setRating(existing.overallRating);
        setRatings({
          hospitalityRating: existing.ratings.hospitality,
          cleanlinessRating: existing.ratings.cleanliness,
          locationRating: existing.ratings.location,
          amenitiesRating: existing.ratings.amenities,
          foodRating: existing.ratings.food,
        });
      })
      .catch((reason: unknown) => {
        if (active && experienceId) setDataError(messageOf(reason));
      })
      .finally(() => {
        if (active) setCheckingMember(false);
      });
    return () => {
      active = false;
    };
  }, [experienceId]);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const accepted = Array.from(incoming);
    const invalid = accepted.find((file) => {
      const validMime = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/quicktime",
      ].includes(file.type);
      const validExtension = /\.(jpe?g|png|webp|mp4|mov)$/i.test(file.name);
      return !validMime || !validExtension || file.size > 100 * 1024 * 1024;
    });
    if (invalid) {
      setError(`${invalid.name}: choose JPG, PNG, WebP, MP4 or MOV files up to 100 MB each.`);
      return;
    }
    setError("");
    setFiles((current) => [...current, ...accepted].slice(0, 8));
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = {
      title: form.title,
      categoryId: form.categoryId,
      destinationId: form.destinationId ? Number(form.destinationId) : null,
      resortId: form.resortId ? Number(form.resortId) : null,
      shortDescription: form.shortDescription,
      story: form.story,
      visitDate: form.visitDate || null,
      overallRating: rating,
      ...ratings,
      consentToPublish: true,
    };
    const body = new FormData();
    body.append("data", JSON.stringify(data));
    files.forEach((file) => body.append("media", file));
    try {
      await uploadExperience(body, setProgress, experienceId);
      setSuccess(true);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  };

  if (success) {
    return (
      <section className="experience-share-shell">
        <div className="experience-submit-success">
          <span>
            <Check size={28} />
          </span>
          <p className="eyebrow">THANK YOU FOR SHARING</p>
          <h1>Your story is with our team.</h1>
          <p>
            Your experience is pending review. It will only appear publicly after Gulsaga approves
            it.
          </p>
          <div>
            <Button asChild>
              <Link to="/experiences/dashboard">
                Track my submission <ArrowRight />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/experiences">Explore stories</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="experience-share-shell">
      <div className="experience-share-heading">
        <p className="eyebrow">YOUR JOURNEY, YOUR WORDS</p>
        <h1>{experienceId ? "Update Your Experience" : "Share Your Experience"}</h1>
        <p>
          {experienceId
            ? "Make the requested updates and send your story back for review."
            : "Tell us about your stay, share photos and videos, and rate your experience."}
        </p>
      </div>
      {checkingMember ? (
        <LoadingState label="Checking your member access" />
      ) : !member ? (
        <div className="experience-share-auth">
          <div className="experience-steps">
            {["Experience details", "Upload media", "Ratings & review", "Submit"].map(
              (step, index) => (
                <div key={step}>
                  <span>{index + 1}</span>
                  {step}
                </div>
              ),
            )}
          </div>
          <ExperienceSignIn onVerified={() => setMember(true)} />
        </div>
      ) : (
        <form className="experience-form" onSubmit={submit}>
          {experienceId && (
            <p className="experience-alert experience-alert-success">
              Your existing media will be kept unless you add replacement files.
            </p>
          )}
          <div className="experience-form-steps">
            {[
              ["01", "Experience details", "experience-details"],
              ["02", "Upload media", "experience-media"],
              ["03", "Ratings & review", "experience-ratings"],
              ["04", "Submit", "experience-submit"],
            ].map(([number, label, target], index) => (
              <button
                type="button"
                key={target}
                className={index === 0 ? "active" : ""}
                onClick={() =>
                  document.getElementById(target)?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <span>{number}</span>
                <small>{label}</small>
              </button>
            ))}
          </div>
          {dataError && <p className="experience-alert experience-alert-error">{dataError}</p>}
          <div className="experience-form-section" id="experience-details">
            <div className="experience-form-section-title">
              <span>01</span>
              <div>
                <h2>The experience</h2>
                <p>Give your story a title and a place.</p>
              </div>
            </div>
            <label>
              Experience title <b>*</b>
              <input
                required
                minLength={5}
                maxLength={180}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="e.g. A peaceful stay in Himachal"
              />
            </label>
            <div className="experience-form-row">
              <label>
                Destination
                <select
                  value={form.destinationId}
                  onChange={(event) =>
                    setForm({ ...form, destinationId: event.target.value, resortId: "" })
                  }
                >
                  <option value="">Select a destination</option>
                  {destinations.map((destination) => (
                    <option key={destination.id} value={destination.id}>
                      {destination.name} · {destination.region}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Resort or hotel
                <select
                  value={form.resortId}
                  onChange={(event) => setForm({ ...form, resortId: event.target.value })}
                >
                  <option value="">Select a resort</option>
                  {resorts.map((resort) => (
                    <option key={resort.id} value={resort.id}>
                      {resort.name}
                      {resort.location ? ` · ${resort.location}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Experience category <b>*</b>
              <select
                required
                value={form.categoryId}
                onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
              >
                <option value="">Choose a category</option>
                {categoriesData.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Short description <b>*</b>
              <textarea
                required
                minLength={10}
                maxLength={500}
                rows={2}
                value={form.shortDescription}
                onChange={(event) => setForm({ ...form, shortDescription: event.target.value })}
                placeholder="A few words that capture the feeling of your stay…"
              />
              <small>{form.shortDescription.length}/500</small>
            </label>
            <label>
              Your story <b>*</b>
              <textarea
                required
                minLength={50}
                maxLength={30000}
                rows={7}
                value={form.story}
                onChange={(event) => setForm({ ...form, story: event.target.value })}
                placeholder="What made this trip special? Tell us about the stay, the people and the little moments…"
              />
              <small>{form.story.length}/30,000</small>
            </label>
            <label className="experience-date-field">
              Travel date <span>(optional)</span>
              <input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={form.visitDate}
                onChange={(event) => setForm({ ...form, visitDate: event.target.value })}
              />
            </label>
          </div>
          <div className="experience-form-section" id="experience-media">
            <div className="experience-form-section-title">
              <span>02</span>
              <div>
                <h2>Bring it to life</h2>
                <p>Share up to eight photos or video moments.</p>
              </div>
            </div>
            <div
              className={`experience-dropzone${dragging ? " dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                addFiles(event.dataTransfer.files);
              }}
            >
              <UploadCloud size={29} />
              <strong>Drop your photos or videos here</strong>
              <span>JPG, PNG, WebP, MP4 or MOV · 100 MB per file · up to 8 files</span>
              <label className="experience-file-button">
                Browse files
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                  multiple
                  onChange={(event) => {
                    if (event.target.files) addFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            {files.length > 0 && (
              <div className="experience-upload-grid">
                {files.map((file, index) => (
                  <UploadPreview
                    key={`${file.name}-${file.lastModified}-${index}`}
                    file={file}
                    onRemove={() =>
                      setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))
                    }
                  />
                ))}
              </div>
            )}
          </div>
          <div className="experience-form-section" id="experience-ratings">
            <div className="experience-form-section-title">
              <span>03</span>
              <div>
                <h2>Rate your stay</h2>
                <p>Your honest rating helps fellow members choose well.</p>
              </div>
            </div>
            <div className="experience-overall-rating">
              <div>
                <strong>Overall experience</strong>
                <small>How was your visit?</small>
              </div>
              <div className="experience-rating-pick">
                {Array.from({ length: 5 }, (_, index) => {
                  const score = index + 1;
                  return (
                    <button
                      type="button"
                      key={score}
                      aria-label={`Rate ${score} out of 5`}
                      onClick={() => setRating(score)}
                    >
                      <Star size={25} fill={score <= rating ? "currentColor" : "none"} />
                    </button>
                  );
                })}
                <strong>{rating}.0</strong>
              </div>
            </div>
            <div className="experience-sub-ratings">
              {ratingLabels.map(([key, label]) => (
                <label key={key}>
                  {label}
                  <select
                    value={ratings[key]}
                    onChange={(event) =>
                      setRatings({ ...ratings, [key]: Number(event.target.value) })
                    }
                  >
                    {[5, 4, 3, 2, 1].map((score) => (
                      <option value={score} key={score}>
                        {score} {score === 1 ? "star" : "stars"}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="experience-alert experience-alert-error">{error}</p>}
          {busy && (
            <div className="experience-progress">
              <span style={{ width: `${progress}%` }} />
              <small>Uploading your story… {progress}%</small>
            </div>
          )}
          <div className="experience-consent" id="experience-submit">
            <ShieldCheck size={20} />
            <p>
              By submitting, you confirm this is your real experience and give Gulsaga permission to
              publish it after review. Pending stories and media are only visible to you and admins.
            </p>
          </div>
          <div className="experience-submit-row">
            <Button type="submit" disabled={busy || Boolean(dataError)}>
              {busy ? <LoaderCircle className="experience-spin" /> : <UploadCloud />}
              {busy ? "Submitting…" : "Submit for review"} <ArrowRight />
            </Button>
            <span>Every story is reviewed before it goes live.</span>
          </div>
        </form>
      )}
    </section>
  );
}

function MemberExperienceRow({ experience }: { experience: Experience }) {
  const canEdit = experience.status === "REJECTED" || experience.status === "REVISION_REQUESTED";
  return (
    <article className="experience-member-row">
      <div className="experience-member-thumb">
        <ExperienceMedia media={experience.media[0]} protectedContent />
      </div>
      <div className="experience-member-row-main">
        <strong>{experience.title}</strong>
        <span>
          Submitted{" "}
          {new Date(experience.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
        {experience.moderationReason && <p>{experience.moderationReason}</p>}
      </div>
      <Stars value={experience.overallRating} size={12} />
      <span
        className={`experience-status experience-status-${experience.status.toLowerCase().replace("_", "-")}`}
      >
        {experience.status.replaceAll("_", " ")}
      </span>
      {canEdit && (
        <Link to="/experiences/share" search={{ edit: experience.id }} aria-label="Edit experience">
          <ArrowUpRight size={16} />
        </Link>
      )}
      <div className="experience-member-metrics">
        <span>
          <Eye size={14} /> {experience.views.toLocaleString("en-IN")}
        </span>
        <span>
          <Heart size={14} /> {experience.likeCount}
        </span>
        <span>
          <MessageCircle size={14} /> {experience.commentCount}
        </span>
      </div>
    </article>
  );
}

export function MemberExperiencesDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Experience[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadMine = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiRequest<Experience[]>("community/experiences/mine");
      setRows(data);
      setAuthenticated(true);
    } catch (reason) {
      setAuthenticated(false);
      setError(messageOf(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  const counts = useMemo(
    () => ({
      ALL: rows.length,
      APPROVED: rows.filter((item) => item.status === "APPROVED").length,
      PENDING: rows.filter((item) => item.status === "PENDING").length,
      REJECTED: rows.filter((item) => ["REJECTED", "REVISION_REQUESTED"].includes(item.status))
        .length,
    }),
    [rows],
  );
  const filtered = rows.filter(
    (item) =>
      filter === "ALL" ||
      (filter === "REJECTED"
        ? ["REJECTED", "REVISION_REQUESTED"].includes(item.status)
        : item.status === filter),
  );

  const logout = async () => {
    try {
      const response = await apiRequest("community/experiences/auth/otp/logout", {
        method: "POST",
      });
      setNotice(response.message || "Signed out.");
      setAuthenticated(false);
      setRows([]);
    } catch (reason) {
      setError(messageOf(reason));
    }
  };

  return (
    <section className="experience-dashboard-shell">
      <div className="experience-dashboard-heading">
        <div>
          <p className="eyebrow">YOUR MEMBER SPACE</p>
          <h1>My Experiences</h1>
          <p>Follow every story from the moment you share it to the day it goes live.</p>
        </div>
        <Button asChild>
          <Link to="/experiences/share">
            <Plus /> Add New Experience <ArrowRight />
          </Link>
        </Button>
      </div>
      {!authenticated ? (
        <div className="experience-dashboard-login">
          <ExperienceSignIn onVerified={() => void loadMine()} />
          {error && !error.includes("Sign in") && (
            <p className="experience-alert experience-alert-error">{error}</p>
          )}
        </div>
      ) : (
        <>
          <div className="experience-dashboard-stats">
            {[
              ["My stories", counts.ALL, UsersRound],
              ["Approved", counts.APPROVED, Check],
              ["Pending review", counts.PENDING, Eye],
              ["Needs attention", counts.REJECTED, CircleAlert],
            ].map(([label, value, Icon]) => (
              <div key={String(label)}>
                <span>
                  <Icon size={17} /> {String(label)}
                </span>
                <strong>{String(value)}</strong>
              </div>
            ))}
          </div>
          <div className="experience-dashboard-toolbar">
            <div className="experience-dashboard-tabs">
              {(["ALL", "APPROVED", "PENDING", "REJECTED"] as const).map((status) => (
                <button
                  type="button"
                  key={status}
                  className={filter === status ? "active" : ""}
                  onClick={() => setFilter(status)}
                >
                  {status === "ALL"
                    ? "All stories"
                    : status === "REJECTED"
                      ? "Rejected / edits"
                      : status.replace("_", " ")}
                  <span>{counts[status]}</span>
                </button>
              ))}
            </div>
            <button type="button" className="experience-text-button" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
          {notice && <p className="experience-alert experience-alert-success">{notice}</p>}
          {error && <p className="experience-alert experience-alert-error">{error}</p>}
          {loading ? (
            <LoadingState label="Loading your submissions" />
          ) : filtered.length ? (
            <div className="experience-member-list">
              {filtered.map((experience) => (
                <MemberExperienceRow key={experience.id} experience={experience} />
              ))}
            </div>
          ) : (
            <div className="experience-empty experience-empty-small">
              <Mountain />
              <h3>{rows.length ? "No stories in this view." : "Your first story belongs here."}</h3>
              <p>
                {rows.length
                  ? "Choose another status to see more of your experiences."
                  : "Share a stay, a creative retreat or a celebration with the Gulsaga community."}
              </p>
              <Button asChild>
                <Link to="/experiences/share">
                  Share an experience <ArrowRight />
                </Link>
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

type AdminStats = {
  totalExperiences: number;
  pendingSubmissions: number;
  approvedExperiences: number;
  rejectedSubmissions: number;
  featuredExperiences: number;
  uploadedPhotos: number;
  uploadedVideos: number;
  averageRating: number | null;
};

type AdminIdentity = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
};

function AdminMedia({ media }: { media: ExperienceMedia }) {
  return <ExperienceMedia media={media} protectedContent />;
}

export function ExperienceAdminPanel() {
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);
  const [identityChecking, setIdentityChecking] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [rows, setRows] = useState<Experience[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<Record<string, Experience>>({});
  const { experiencesPageContent, updateExperiencesPageContent, createPreviewMedia, saveStatus } =
    useHomeContent();

  const loadIdentity = useCallback(async () => {
    if (!getToken("admin")) {
      setIdentity(null);
      setIdentityChecking(false);
      return;
    }

    setIdentityChecking(true);
    try {
      const { data } = await apiRequest<AdminIdentity>("auth/admin/me");
      if (!data.permissions.includes("experiences") && data.role !== "SUPER_ADMIN") {
        setIdentity(null);
        setError("This administrator account does not have experience moderation permission.");
        return;
      }
      setIdentity(data);
      setError("");
    } catch (reason) {
      setIdentity(null);
      setError(messageOf(reason));
    } finally {
      setIdentityChecking(false);
    }
  }, []);

  useEffect(() => {
    void loadIdentity();
    window.addEventListener(AUTH_EVENT, loadIdentity);
    return () => window.removeEventListener(AUTH_EVENT, loadIdentity);
  }, [loadIdentity]);

  const refresh = useCallback(async () => {
    if (!identity) return;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ status, page: "1" });
      const [list, analytics] = await Promise.all([
        apiRequest<{ rows: Experience[]; total: number }>(`admin/experiences?${query}`),
        apiRequest<AdminStats>("admin/experiences/analytics"),
      ]);
      setRows(list.data.rows);
      setStats(analytics.data);
    } catch (reason) {
      setError(messageOf(reason));
      if (reason instanceof Error && /sign in/i.test(reason.message)) setIdentity(null);
    } finally {
      setLoading(false);
    }
  }, [identity, status]);

  useEffect(() => {
    if (identity) void refresh();
  }, [identity, refresh]);

  const moderate = async (id: string, action: string) => {
    setActionId(id);
    setError("");
    try {
      await apiRequest(`admin/experiences/${id}/moderate`, {
        method: "PATCH",
        body: JSON.stringify({
          action,
          ...(["REJECT", "REQUEST_CHANGES", "REMOVE"].includes(action)
            ? { reason: reasons[id] || "" }
            : {}),
        }),
      });
      await refresh();
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setActionId("");
    }
  };

  const toggleDetail = async (experience: Experience) => {
    if (details[experience.id]) {
      setDetails((current) => {
        const next = { ...current };
        delete next[experience.id];
        return next;
      });
      return;
    }
    try {
      const { data } = await apiRequest<Experience>(`admin/experiences/${experience.id}`);
      setDetails((current) => ({ ...current, [experience.id]: data }));
    } catch (reason) {
      setError(messageOf(reason));
    }
  };

  if (!identity) {
    return (
      <section className="experience-admin-shell">
        <div className="experience-admin-login-copy">
          <p className="eyebrow">SECURE ADMINISTRATION</p>
          <h1>Experience Management</h1>
          <p>
            Review member stories, preview their media and manage publication using your existing
            administrator sign-in.
          </p>
        </div>
        <div className="experience-admin-login">
          {identityChecking ? (
            <LoadingState label="Checking your administrator session" />
          ) : (
            <>
              {error && <p className="experience-alert experience-alert-error">{error}</p>}
              <Button asChild>
                <Link to="/login">Return to administrator sign in</Link>
              </Button>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="experience-admin-shell">
      <div className="experience-admin-heading">
        <div>
          <p className="eyebrow">CONNECTED ADMIN · {identity.name}</p>
          <h1>Experience Management</h1>
          <p>Review submissions and decide what becomes part of the public member community.</p>
        </div>
        <button
          className="experience-text-button"
          type="button"
          onClick={async () => {
            try {
              await apiRequest("auth/admin/logout", { method: "POST" });
              setIdentity(null);
            } catch (reason) {
              setError(messageOf(reason));
            }
          }}
        >
          Sign out
        </button>
      </div>
      <section className="experience-admin-hero-settings">
        <div>
          <p className="eyebrow">PUBLIC PAGE APPEARANCE</p>
          <h2>Experience page hero</h2>
          <p>Update the public page image and copy. Changes are saved to the database.</p>
          <label>
            Eyebrow
            <input
              value={experiencesPageContent.heroEyebrow}
              onChange={(event) =>
                updateExperiencesPageContent({
                  ...experiencesPageContent,
                  heroEyebrow: event.target.value,
                })
              }
            />
          </label>
          <label>
            Heading
            <input
              value={experiencesPageContent.heroTitle}
              onChange={(event) =>
                updateExperiencesPageContent({
                  ...experiencesPageContent,
                  heroTitle: event.target.value,
                })
              }
            />
          </label>
          <label>
            Highlight
            <input
              value={experiencesPageContent.heroHighlight}
              onChange={(event) =>
                updateExperiencesPageContent({
                  ...experiencesPageContent,
                  heroHighlight: event.target.value,
                })
              }
            />
          </label>
          <label>
            Description
            <textarea
              value={experiencesPageContent.heroDescription}
              onChange={(event) =>
                updateExperiencesPageContent({
                  ...experiencesPageContent,
                  heroDescription: event.target.value,
                })
              }
            />
          </label>
          <label>
            Replace hero image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (!file) return;
                updateExperiencesPageContent({
                  ...experiencesPageContent,
                  heroMedia: createPreviewMedia(file),
                });
                event.currentTarget.value = "";
              }}
            />
          </label>
          <p className="experience-admin-save-status" role="status">
            {saveStatus.message ?? "Changes save automatically."}
          </p>
        </div>
        <img src={experiencesPageContent.heroMedia.src} alt="Current experiences page hero" />
      </section>
      {stats && (
        <div className="experience-admin-stats">
          {[
            ["Total experiences", stats.totalExperiences],
            ["Pending review", stats.pendingSubmissions],
            ["Approved", stats.approvedExperiences],
            ["Rejected", stats.rejectedSubmissions],
            ["Photos", stats.uploadedPhotos],
            ["Videos", stats.uploadedVideos],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <span>{String(label)}</span>
              <strong>{Number(value).toLocaleString("en-IN")}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="experience-admin-toolbar">
        <div>
          {["PENDING", "APPROVED", "REJECTED", "REVISION_REQUESTED", "REMOVED"].map((item) => (
            <button
              type="button"
              key={item}
              className={status === item ? "active" : ""}
              onClick={() => setStatus(item)}
            >
              {item.replaceAll("_", " ")}
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>
      {error && <p className="experience-alert experience-alert-error">{error}</p>}
      {loading ? (
        <LoadingState label="Loading moderation queue" />
      ) : rows.length ? (
        <div className="experience-admin-list">
          {rows.map((experience) => {
            const detail = details[experience.id];
            const needsReason = ["PENDING", "APPROVED", "REVISION_REQUESTED"].includes(
              experience.status,
            );
            return (
              <article className="experience-admin-card" key={experience.id}>
                <button
                  className="experience-admin-media"
                  type="button"
                  onClick={() => void toggleDetail(experience)}
                >
                  <AdminMedia media={experience.media[0]} />
                  <span>
                    <Eye size={14} /> {detail ? "Hide details" : "Preview"}
                  </span>
                </button>
                <div className="experience-admin-card-content">
                  <div className="experience-admin-card-head">
                    <div>
                      <p className="eyebrow">{experience.category?.name || "MEMBER STORY"}</p>
                      <h3>{experience.title}</h3>
                    </div>
                    <span
                      className={`experience-status experience-status-${experience.status.toLowerCase().replace("_", "-")}`}
                    >
                      {experience.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p>{experience.shortDescription}</p>
                  <div className="experience-admin-meta">
                    <span>
                      {experience.member?.displayName || "Member"}
                      {experience.member?.email ? ` · ${experience.member.email}` : ""}
                    </span>
                    <Stars value={experience.overallRating} size={12} />
                    <time>{new Date(experience.createdAt).toLocaleDateString("en-IN")}</time>
                  </div>
                  {detail && (
                    <div className="experience-admin-detail">
                      <p>{detail.story}</p>
                      <div>
                        {detail.media.map((media) => (
                          <AdminMedia key={media.id} media={media} />
                        ))}
                      </div>
                      <span>
                        {detail.verifiedStay
                          ? "Verified stay"
                          : detail.verifiedMember
                            ? "Verified member · stay not verified"
                            : "Community submission · stay not verified"}
                      </span>
                    </div>
                  )}
                  {needsReason && (
                    <label className="experience-moderation-reason">
                      {status === "PENDING"
                        ? "Reason (required for reject or changes)"
                        : "Moderator note"}
                      <input
                        value={reasons[experience.id] || ""}
                        onChange={(event) =>
                          setReasons({ ...reasons, [experience.id]: event.target.value })
                        }
                        placeholder="Add a note for the member when requesting changes"
                        maxLength={1000}
                      />
                    </label>
                  )}
                  <div className="experience-moderation-actions">
                    {experience.status !== "APPROVED" && experience.status !== "REMOVED" && (
                      <Button
                        disabled={actionId === experience.id}
                        onClick={() => void moderate(experience.id, "APPROVE")}
                      >
                        <Check /> Approve
                      </Button>
                    )}
                    {["PENDING", "APPROVED", "REVISION_REQUESTED"].includes(experience.status) && (
                      <>
                        <Button
                          variant="outline"
                          disabled={actionId === experience.id || !reasons[experience.id]?.trim()}
                          onClick={() => void moderate(experience.id, "REQUEST_CHANGES")}
                        >
                          Request changes
                        </Button>
                        <Button
                          variant="destructive"
                          disabled={actionId === experience.id || !reasons[experience.id]?.trim()}
                          onClick={() => void moderate(experience.id, "REJECT")}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {experience.status === "APPROVED" && (
                      <Button
                        variant="outline"
                        disabled={actionId === experience.id}
                        onClick={() =>
                          void moderate(
                            experience.id,
                            experience.featured ? "UNFEATURE" : "FEATURE",
                          )
                        }
                      >
                        {experience.featured ? "Unfeature" : "Feature on experiences"}
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="experience-empty experience-empty-small">
          <ShieldCheck />
          <h3>No {status.toLowerCase().replaceAll("_", " ")} experiences.</h3>
          <p>New member submissions will be listed here for review.</p>
        </div>
      )}
    </section>
  );
}
