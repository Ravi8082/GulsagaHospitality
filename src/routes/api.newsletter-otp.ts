import { createFileRoute } from "@tanstack/react-router";
import {
  createNewsletterOtpService,
  sendNewsletterOtpWithResend,
} from "@/lib/newsletter-otp.server";

const handleNewsletterOtp = createNewsletterOtpService(sendNewsletterOtpWithResend);

export const Route = createFileRoute("/api/newsletter-otp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = request.headers.get("cf-connecting-ip") ?? "local";
        return handleNewsletterOtp(request, ip);
      },
    },
  },
});
