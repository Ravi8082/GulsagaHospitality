import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import request from "supertest";
import { createNewsletterOtpRouter } from "../src/experience-routes.js";

const noDatabase = new Proxy(
  {},
  {
    get() {
      assert.fail("Newsletter verification must not read or write the database.");
    },
  },
);

function createTestApp() {
  const deliveries = [];
  const app = express();
  app.use(express.json());
  app.use(
    "/otp",
    createNewsletterOtpRouter({
      db: noDatabase,
      otpLimit: (_req, _res, next) => next(),
      sendEmail: async (to, content) => deliveries.push({ to, ...content }),
    }),
  );
  return { app, deliveries };
}

test("newsletter OTP is verified in memory without touching the database", async () => {
  const { app, deliveries } = createTestApp();
  const email = "guest@example.com";
  const sent = await request(app).post("/otp/send").send({ email });

  assert.equal(sent.status, 200);
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].to, email);
  const code = deliveries[0].text.match(/code is (\d{6})/)?.[1];
  assert.ok(code);

  const verified = await request(app).post("/otp/verify").send({ email, code });
  assert.equal(verified.status, 200);
  assert.match(verified.body.message, /No address, OTP or subscription details were saved to a database/);

  const reused = await request(app).post("/otp/verify").send({ email, code });
  assert.equal(reused.status, 410);
});

test("newsletter OTP requests enforce the resend cooldown", async () => {
  const { app, deliveries } = createTestApp();
  const payload = { email: "guest@example.com" };

  assert.equal((await request(app).post("/otp/send").send(payload)).status, 200);
  const second = await request(app).post("/otp/send").send(payload);

  assert.equal(second.status, 429);
  assert.equal(deliveries.length, 1);
});
