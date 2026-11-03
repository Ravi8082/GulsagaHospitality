import { describe, expect, it, vi } from "vitest";
import { createNewsletterOtpService } from "@/lib/newsletter-otp.server";

function request(body: unknown) {
  return new Request("http://localhost/api/newsletter-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("newsletter email verification", () => {
  it("sends a random code, verifies it once, and does not include it in the API response", async () => {
    const sentCodes: string[] = [];
    const sendEmail = vi.fn(async (_email: string, code: string) => {
      sentCodes.push(code);
    });
    const handle = createNewsletterOtpService(sendEmail);

    const sendResponse = await handle(
      request({ action: "send", email: " Guest@Example.com " }),
      "127.0.0.1",
    );
    const sendBody = await sendResponse.json();

    expect(sendResponse.status).toBe(200);
    expect(sendBody.message).toMatch(/sent to your email/i);
    expect(sentCodes).toHaveLength(1);
    expect(sentCodes[0]).toMatch(/^\d{6}$/);
    expect(JSON.stringify(sendBody)).not.toContain(sentCodes[0]);
    expect(sendEmail).toHaveBeenCalledWith("guest@example.com", sentCodes[0]);

    const verifyResponse = await handle(
      request({ action: "verify", email: "guest@example.com", code: sentCodes[0] }),
      "127.0.0.1",
    );
    expect(verifyResponse.status).toBe(200);
    expect((await verifyResponse.json()).message).toMatch(/No email address.*saved/i);

    const reuseResponse = await handle(
      request({ action: "verify", email: "guest@example.com", code: sentCodes[0] }),
      "127.0.0.1",
    );
    expect(reuseResponse.status).toBe(410);
  });

  it("rejects incorrect codes and rate-limits resends without another email", async () => {
    let sentCode = "";
    const sendEmail = vi.fn(async (_email: string, code: string) => {
      sentCode = code;
    });
    const handle = createNewsletterOtpService(sendEmail);

    const firstResponse = await handle(
      request({ action: "send", email: "guest@example.com" }),
      "127.0.0.1",
    );
    expect(firstResponse.status).toBe(200);

    const resendResponse = await handle(
      request({ action: "send", email: "guest@example.com" }),
      "127.0.0.1",
    );
    expect(resendResponse.status).toBe(429);
    expect(sendEmail).toHaveBeenCalledTimes(1);

    const incorrectResponse = await handle(
      request({
        action: "verify",
        email: "guest@example.com",
        code: sentCode === "999999" ? "000000" : "999999",
      }),
      "127.0.0.1",
    );
    expect(incorrectResponse.status).toBe(400);
  });

  it("rejects invalid addresses and malformed requests", async () => {
    const handle = createNewsletterOtpService(vi.fn(async () => {}));

    expect(
      (await handle(request({ action: "send", email: "not-an-email" }), "127.0.0.1")).status,
    ).toBe(400);
    expect(
      (await handle(new Request("http://localhost", { method: "POST" }), "127.0.0.1")).status,
    ).toBe(400);
  });
});
