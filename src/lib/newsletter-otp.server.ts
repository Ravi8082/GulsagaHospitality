type SendOtpEmail = (email: string, otp: string) => Promise<void>;

type OtpChallenge = {
  code: string | null;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  windowStartedAt: number;
  sendsInWindow: number;
};

type RateLimit = {
  windowStartedAt: number;
  count: number;
};

const otpLifetimeMs = 10 * 60 * 1000;
const rateWindowMs = 60 * 60 * 1000;
const resendCooldownMs = 60 * 1000;
const maxAttempts = 5;
const maxEmailsPerAddressPerHour = 5;
const maxEmailsPerIpPerHour = 10;

export class NewsletterOtpConfigurationError extends Error {}

export class NewsletterOtpDeliveryError extends Error {}

function jsonResponse(status: number, message: string) {
  return Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
}

function generateOtp() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0]! % 1_000_000).padStart(6, "0");
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;

  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function createNewsletterOtpService(sendEmail: SendOtpEmail, now: () => number = Date.now) {
  const challenges = new Map<string, OtpChallenge>();
  const ipLimits = new Map<string, RateLimit>();
  const pendingEmails = new Set<string>();

  const pruneExpiredState = (time: number) => {
    for (const [email, challenge] of challenges) {
      if (time - challenge.windowStartedAt >= rateWindowMs) challenges.delete(email);
      else if (time >= challenge.expiresAt) challenge.code = null;
    }

    for (const [ip, limit] of ipLimits) {
      if (time - limit.windowStartedAt >= rateWindowMs) ipLimits.delete(ip);
    }
  };

  return async function handleNewsletterOtp(request: Request, ip: string) {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse(400, "Invalid request body.");
    }

    if (!payload || typeof payload !== "object") {
      return jsonResponse(400, "Invalid request body.");
    }

    const body = payload as Record<string, unknown>;
    const email = normalizeEmail(body["email"]);
    if (!email) return jsonResponse(400, "Enter a valid email address.");

    const time = now();
    pruneExpiredState(time);

    if (body["action"] === "send") {
      const current = challenges.get(email);
      if (pendingEmails.has(email))
        return jsonResponse(429, "Please wait before requesting another code.");
      if (current && time - current.lastSentAt < resendCooldownMs) {
        return jsonResponse(429, "Please wait a minute before requesting another code.");
      }
      if (
        current &&
        time - current.windowStartedAt < rateWindowMs &&
        current.sendsInWindow >= maxEmailsPerAddressPerHour
      ) {
        return jsonResponse(429, "Too many codes requested. Please try again later.");
      }

      const ipLimit = ipLimits.get(ip);
      if (
        ipLimit &&
        time - ipLimit.windowStartedAt < rateWindowMs &&
        ipLimit.count >= maxEmailsPerIpPerHour
      ) {
        return jsonResponse(429, "Too many codes requested. Please try again later.");
      }

      const otp = generateOtp();
      pendingEmails.add(email);
      try {
        await sendEmail(email, otp);
      } catch (error) {
        if (error instanceof NewsletterOtpConfigurationError) {
          return jsonResponse(503, "Email verification is not configured yet.");
        }
        if (error instanceof NewsletterOtpDeliveryError) {
          console.error("Newsletter OTP email delivery failed.");
          return jsonResponse(502, "We couldn't send the code. Please try again later.");
        }
        throw error;
      } finally {
        pendingEmails.delete(email);
      }

      const sameWindow = current && time - current.windowStartedAt < rateWindowMs;
      challenges.set(email, {
        code: otp,
        expiresAt: time + otpLifetimeMs,
        attempts: 0,
        lastSentAt: time,
        windowStartedAt: sameWindow ? current.windowStartedAt : time,
        sendsInWindow: sameWindow ? current.sendsInWindow + 1 : 1,
      });

      const sameIpWindow = ipLimit && time - ipLimit.windowStartedAt < rateWindowMs;
      ipLimits.set(ip, {
        windowStartedAt: sameIpWindow ? ipLimit.windowStartedAt : time,
        count: sameIpWindow ? ipLimit.count + 1 : 1,
      });

      return jsonResponse(200, "A verification code has been sent to your email.");
    }

    if (body["action"] === "verify") {
      const challenge = challenges.get(email);
      if (!challenge?.code) {
        return jsonResponse(410, "That code has expired. Request a new one.");
      }
      if (time >= challenge.expiresAt) {
        challenge.code = null;
        return jsonResponse(410, "That code has expired. Request a new one.");
      }
      if (challenge.attempts >= maxAttempts) {
        challenge.code = null;
        return jsonResponse(429, "Too many incorrect attempts. Request a new code.");
      }
      if (typeof body["code"] !== "string" || !/^\d{6}$/.test(body["code"])) {
        return jsonResponse(400, "Enter the six-digit verification code.");
      }
      if (body["code"] !== challenge.code) {
        challenge.attempts += 1;
        if (challenge.attempts >= maxAttempts) {
          challenge.code = null;
          return jsonResponse(429, "Too many incorrect attempts. Request a new code.");
        }
        return jsonResponse(400, "That code doesn't match. Please try again.");
      }

      challenge.code = null;
      return jsonResponse(
        200,
        "Email verified. No email address or subscription details were saved.",
      );
    }

    return jsonResponse(400, "Choose a valid verification action.");
  };
}

export async function sendNewsletterOtpWithResend(email: string, otp: string) {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  const apiKey = runtime.process?.env?.["RESEND_API_KEY"];
  const from = runtime.process?.env?.["RESEND_FROM_EMAIL"];
  if (!apiKey || !from) throw new NewsletterOtpConfigurationError();

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Your Gulsaga email verification code",
        text: `Your Gulsaga verification code is ${otp}. It expires in 10 minutes. If you didn't request this code, you can ignore this email.`,
        html: `<p>Your Gulsaga verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${otp}</p><p>This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>`,
      }),
    });
  } catch {
    throw new NewsletterOtpDeliveryError();
  }

  if (!response.ok) throw new NewsletterOtpDeliveryError();
}
