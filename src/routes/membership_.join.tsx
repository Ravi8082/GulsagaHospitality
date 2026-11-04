import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Eye, EyeOff, LoaderCircle, MailCheck, ShieldCheck } from "lucide-react";
import { Layout } from "@/components/hotel-layout";
import { apiRequest } from "@/lib/experience-api";
import { useHomeContent } from "@/lib/home-content";
import { DestinationPitch } from "@/components/destination-pitch";
import { defaultDestinationPitches, defaultMembershipPlans, formatInr } from "@/lib/membership-data";
import { pageHead } from "@/lib/hotel-data";

const countries = ["India", "United States", "United Kingdom", "United Arab Emirates", "Other"];
const frequencies = ["1-2 times a year", "3-4 times a year", "5 or more times a year"];

export const Route = createFileRoute("/membership_/join")({
  validateSearch: (search: Record<string, unknown>): { plan?: string } => {
    const plan = search["plan"];
    return typeof plan === "string" && plan.length <= 60 ? { plan } : {};
  },
  head: () =>
    pageHead(
      "Join Gulsaga Membership",
      "Choose a membership plan, share your details and verify your email to apply.",
    ),
  component: JoinMembership,
});
const messageOf = (reason: unknown) =>
  reason instanceof Error ? reason.message : "The request could not be completed.";

function JoinMembership() {
  const { plan: initialPlan } = Route.useSearch();
  const { membershipPageContent, footerContent } = useHomeContent();
  const plans = (membershipPageContent.tiers ?? defaultMembershipPlans).filter((plan) => !plan.contactOnly);
  const [form, setForm] = useState({
    plan: initialPlan ?? "",
    fullName: "",
    email: "",
    phone: "",
    country: "India",
    city: "",
    family: "3",
    destinations: [] as string[],
    frequency: frequencies[0]!,
    requirements: "",
    password: "",
    confirm: "",
    terms: false,
  });
  const destinationOptions = (membershipPageContent.destinationPitches ?? defaultDestinationPitches).map(
    (pitch) => pitch.name,
  );
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; percent: number } | null>(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | "otp">(initialPlan ? 2 : 1);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const selected = plans.find((plan) => plan.id === form.plan) ?? plans[0];
  const activeStep = step === "otp" ? 3 : step;

  const toggleDestination = (name: string) =>
    set({
      destinations: form.destinations.includes(name)
        ? form.destinations.filter((item) => item !== name)
        : [...form.destinations, name],
    });

  const applyCoupon = async () => {
    setCouponMessage("");
    try {
      const result = await apiRequest<{ code: string; percent: number }>(
        "community/experiences/membership/coupon/check",
        { method: "POST", body: JSON.stringify({ code: couponInput }) },
      );
      setCoupon(result.data);
      setCouponMessage(`Coupon ${result.data.code} applied: ${result.data.percent}% off.`);
    } catch (reason) {
      setCoupon(null);
      setCouponMessage(messageOf(reason));
    }
  };

  const goReview = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setStep(3);
  };

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (form.password.length < 10 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      setError("Password needs at least 10 characters with a letter and a number.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!form.terms) {
      setError("Please accept the Terms & Conditions and Privacy Policy.");
      return;
    }
    setBusy(true);
    try {
      const result = await apiRequest<{ devCode?: string }>("community/experiences/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ email: form.email, displayName: form.fullName }),
      });
      setDevCode(result.data.devCode ?? "");
      setStep("otp");
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setError("");
    setBusy(true);
    try {
      await apiRequest("community/experiences/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ email: form.email, code }),
      });
      await apiRequest("community/experiences/auth/otp/password", {
        method: "POST",
        body: JSON.stringify({ password: form.password }),
      });
      await apiRequest("community/experiences/membership/apply", {
        method: "POST",
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          city: form.city,
          country: form.country,
          plan: selected.name,
          listAmount: selected.priceInr,
          years: selected.years,
          familyMembers: Number(form.family) || 1,
          destinations: form.destinations.join(", "),
          travelFrequency: form.frequency,
          requirements: form.requirements,
          ...(coupon ? { couponCode: coupon.code } : {}),
          acceptedTerms: form.terms,
        }),
      });
      window.location.assign("/dashboard");
    } catch (reason) {
      setError(messageOf(reason));
      setBusy(false);
    }
  };

  const summary = selected ? (
    <aside className="mjoin-summary">
      {selected.image ? <img className="mjoin-summary-img" src={selected.image} alt={selected.name} /> : null}      <span className="mjoin-summary-tag">Selected plan</span>
      <h2>{selected.name}</h2>
      <dl>
        <div>
          <dt>Validity</dt>
          <dd>{selected.years} Years</dd>
        </div>
        <div>
          <dt>Membership fee</dt>
          <dd>{selected.priceInr ? formatInr(selected.priceInr) : "On request"}</dd>
        </div>
        {coupon && selected.priceInr ? (
          <div>
            <dt>After {coupon.percent}% coupon</dt>
            <dd>{formatInr(Math.round((selected.priceInr * (100 - coupon.percent)) / 100))}</dd>
          </div>
        ) : null}
      </dl>
      <ul>
        {selected.features.filter(Boolean).map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
    </aside>
  ) : null;

  const waNumber = footerContent.whatsappNumber.replace(/\D/g, "");
  const waText = [
    membershipPageContent.whatsappMessage?.trim() || "Hello Gulsaga, I would like to know more.",
    selected ? `Plan: ${selected.name}` : "",
    form.destinations.length ? `Destinations: ${form.destinations.join(", ")}` : "",
    coupon ? `Coupon: ${coupon.code}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const steps = ["Select Plan", "Your Details", "Review & Submit"];

  return (
    <Layout experienceMode>
      <div className="mjoin-page">
        <div className="mjoin-band">
          <h1>Become a Member</h1>
        </div>
        <div className="mjoin-wrap">
          {membershipPageContent.offerText?.trim() ? (
            <p className="mjoin-offer">{membershipPageContent.offerText}</p>
          ) : null}
          <ol className="mjoin-steps">
            {steps.map((label, index) => (
              <li key={label} className={activeStep === index + 1 ? "on" : activeStep > index + 1 ? "done" : ""}>
                <span>{activeStep > index + 1 ? <Check size={14} /> : index + 1}</span>
                {label}
              </li>
            ))}
          </ol>

          {step === 1 ? (
            <div className="mjoin-card">
              <h2>Select your plan</h2>
              <div className="mjoin-picks">
                {plans.map((plan) => (
                  <button
                    type="button"
                    key={plan.id}
                    className={`mjoin-pick${selected?.id === plan.id ? " on" : ""}`}
                    onClick={() => set({ plan: plan.id })}
                  >
                    {plan.badge ? <em>{plan.badge}</em> : null}
                    <strong>{plan.name}</strong>
                    <span>
                      {formatInr(plan.priceInr)} · {plan.years} Years
                    </span>
                  </button>
                ))}
              </div>
              <button className="mjoin-btn" type="button" disabled={!selected} onClick={() => setStep(2)}>
                Continue
              </button>
            </div>
          ) : (
            <div className="mjoin-layout">
              {summary}
              {step === 2 ? (
                <form className="mjoin-card" onSubmit={goReview}>
                  <h2>Your details</h2>
                  <div className="mjoin-grid">
                    <label>
                      Full name *
                      <input required minLength={2} maxLength={100} autoComplete="name" value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />
                    </label>
                    <label>
                      Email address *
                      <input required type="email" autoComplete="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
                    </label>
                    <label>
                      Mobile number *
                      <input required type="tel" autoComplete="tel" pattern="[0-9+\s\-]{7,20}" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
                    </label>
                    <label>
                      Country *
                      <select value={form.country} onChange={(e) => set({ country: e.target.value })}>
                        {countries.map((country) => (
                          <option key={country}>{country}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      City *
                      <input required minLength={2} maxLength={80} autoComplete="address-level2" value={form.city} onChange={(e) => set({ city: e.target.value })} />
                    </label>
                    <label>
                      Family members
                      <input type="number" min={1} max={20} value={form.family} onChange={(e) => set({ family: e.target.value })} />
                    </label>
                  </div>
                  <div className="mjoin-field">
                    <span>Preferred destinations</span>
                    <div className="mjoin-chips">
                      {destinationOptions.map((name) => (
                        <button
                          type="button"
                          key={name}
                          className={form.destinations.includes(name) ? "on" : ""}
                          onClick={() => toggleDestination(name)}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.destinations.map((name) => (
                    <DestinationPitch key={name} place={name} />
                  ))}
                  <label>
                    Travel frequency
                    <select value={form.frequency} onChange={(e) => set({ frequency: e.target.value })}>
                      {frequencies.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Additional requirements
                    <textarea rows={3} maxLength={1000} value={form.requirements} onChange={(e) => set({ requirements: e.target.value })} />
                  </label>
                  <div className="mjoin-actions">
                    <button className="mjoin-link" type="button" onClick={() => setStep(1)}>
                      Change plan
                    </button>
                    <button className="mjoin-btn" type="submit">
                      Proceed to Review
                    </button>
                  </div>
                </form>
              ) : step === 3 ? (
                <form className="mjoin-card" onSubmit={sendCode}>
                  <h2>Review &amp; submit</h2>
                  <a className="mjoin-wa" href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer">
                    Questions? Chat with us on WhatsApp
                  </a>
                  <dl className="mjoin-review">
                    <div><dt>Name</dt><dd>{form.fullName}</dd></div>
                    <div><dt>Email</dt><dd>{form.email}</dd></div>
                    <div><dt>Mobile</dt><dd>{form.phone}</dd></div>
                    <div><dt>Location</dt><dd>{form.city}, {form.country}</dd></div>
                    <div><dt>Family members</dt><dd>{form.family}</dd></div>
                    <div><dt>Destinations</dt><dd>{form.destinations.join(", ") || "-"}</dd></div>
                  </dl>
                  <div className="mjoin-grid">
                    <label>
                      Create password *
                      <span className="mjoin-pass">
                        <input required type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={(e) => set({ password: e.target.value })} />
                        <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((v) => !v)}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </span>
                    </label>
                    <label>
                      Confirm password *
                      <input required type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.confirm} onChange={(e) => set({ confirm: e.target.value })} />
                    </label>
                  </div>
                  <div className="mjoin-coupon">
                    <label>
                      Coupon code (optional)
                      <input value={couponInput} maxLength={40} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} />
                    </label>
                    <button className="mjoin-link" type="button" disabled={couponInput.trim().length < 3} onClick={() => void applyCoupon()}>
                      Apply
                    </button>
                  </div>
                  {couponMessage ? <p className={coupon ? "mjoin-ok" : "mjoin-error"}>{couponMessage}</p> : null}
                  <label className="mjoin-terms">
                    <input type="checkbox" checked={form.terms} onChange={(e) => set({ terms: e.target.checked })} />
                    <span>I agree to the <a href="/policies?doc=terms" target="_blank" rel="noreferrer">Terms &amp; Conditions</a> and <a href="/policies?doc=privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</span>
                  </label>
                  {error ? <p className="mjoin-error">{error}</p> : null}
                  <div className="mjoin-actions">
                    <button className="mjoin-link" type="button" onClick={() => setStep(2)}>
                      Back
                    </button>
                    <button className="mjoin-btn" type="submit" disabled={busy}>
                      {busy ? <LoaderCircle className="experience-spin" size={18} /> : null}
                      Verify Email &amp; Submit
                    </button>
                  </div>
                </form>
              ) : (
                <form className="mjoin-card mjoin-otp" onSubmit={verify}>
                  <span className="mjoin-icon">
                    <MailCheck />
                  </span>
                  <h2>Verify Your Email</h2>
                  <p className="mjoin-sub">We have sent a 6-digit OTP to {form.email}</p>
                  {devCode ? (
                    <p className="mjoin-error" style={{ background: "#eef6ea", color: "#1d4d2b" }}>
                      Test mode: email is not configured. Your code is <strong>{devCode}</strong>
                    </p>
                  ) : null}
                  <input
                    className="mjoin-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    minLength={6}
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                  {error ? <p className="mjoin-error">{error}</p> : null}
                  <button className="mjoin-btn" type="submit" disabled={busy}>
                    {busy ? <LoaderCircle className="experience-spin" size={18} /> : <ShieldCheck size={18} />}
                    Verify OTP
                  </button>
                  <button
                    className="mjoin-link"
                    type="button"
                    onClick={() => {
                      setStep(3);
                      setCode("");
                      setError("");
                    }}
                  >
                    Change email
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}