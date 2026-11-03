import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import request from "supertest";
import {
  createExperienceAdminRouter,
  createExperienceRouter,
} from "../src/experience-routes.js";

const next = (_req, _res, callback) => callback();

test("public experience search only queries approved submissions", async () => {
  let receivedQuery;
  const db = {
    memberExperience: {
      findMany: async (query) => {
        receivedQuery = query;
        return [];
      },
      count: async () => 0,
    },
  };
  const app = express();
  app.use(
    "/community",
    createExperienceRouter({
      db,
      otpLimit: next,
      saveFile: async () => {},
      readFile: async () => {},
      removeFile: async () => {},
    }),
  );

  const response = await request(app).get("/community?search=mountain");

  assert.equal(response.status, 200);
  assert.equal(receivedQuery.where.status, "APPROVED");
  assert.equal(receivedQuery.where.OR[0].title.contains, "mountain");
  assert.deepEqual(response.body.rows, []);
});

test("the admin member list is not mistaken for an experience UUID", async () => {
  let experienceDetailRequested = false;
  const db = {
    communityUser: {
      findMany: async () => [{ id: "member-1", displayName: "Member" }],
      count: async () => 1,
    },
    memberExperience: {
      findUnique: async () => {
        experienceDetailRequested = true;
        return null;
      },
    },
  };
  const app = express();
  app.use((req, _res, callback) => {
    req.user = { enabled: true, role: "SUPER_ADMIN" };
    callback();
  });
  app.use("/admin", createExperienceAdminRouter({ db }));

  const response = await request(app).get("/admin/members");

  assert.equal(response.status, 200);
  assert.equal(response.body.total, 1);
  assert.equal(experienceDetailRequested, false);
});
