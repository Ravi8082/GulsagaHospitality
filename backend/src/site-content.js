// Administrator-edited page content stored as JSON, with a revision recorded for every change.
import { Router } from "express";
import { z } from "zod";
import { fail } from "./security.js";

export const contentKeys = [
  "home",
  "footer",
  "contact",
  "about",
  "destinationPage",
  "experiencePage",
  "networkPage",
  "adminDashboard",
  "destinations",
  "resortPage",
  "resorts",
  "membershipPage",
  "membershipOfferMedia",
  "loginPage",
  "visibility",
];

const MAX_BYTES = 900_000;
const keySchema = z.enum(contentKeys);
const bodySchema = z.object({ data: z.union([z.record(z.unknown()), z.array(z.unknown())]) }).strict();

// Media must point to the site's own uploads, an https URL or a bundled asset path, never a script or blob URL.
function assertSafeUrls(value, depth = 0) {
  if (depth > 12) throw fail(400, "Content is nested too deeply.");
  if (typeof value === "string") {
    if (/^\s*(javascript|data|blob|vbscript):/i.test(value)) throw fail(400, "Unsafe link in content.");
  } else if (Array.isArray(value)) {
    value.forEach((item) => assertSafeUrls(item, depth + 1));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => assertSafeUrls(item, depth + 1));
  }
}

export async function getPublicSiteContent({ sql }) {
  const rows = await sql("site_content").select("content_key", "data", "version");
  return Object.fromEntries(
    rows.map((row) => [row.content_key, { data: JSON.parse(row.data), version: row.version }]),
  );
}

export function createSiteContentAdminRouter({ sql, can, audit, db }) {
  const router = Router();
  router.use((req, res, next) => {
    if (!can(req.user, "content")) return next(fail(403, "Permission denied."));
    next();
  });

  async function write(trx, key, data, user, action) {
    const json = JSON.stringify(data);
    if (Buffer.byteLength(json) > MAX_BYTES) throw fail(400, "This content is too large to save.");
    const current = await trx("site_content").where({ content_key: key }).forUpdate().first("version");
    const version = (current?.version ?? 0) + 1;
    if (current) {
      await trx("site_content").where({ content_key: key }).update({ data: json, version, updated_by: user.id });
    } else {
      await trx("site_content").insert({ content_key: key, data: json, version, updated_by: user.id });
    }
    await trx("content_revisions").insert({
      content_key: key,
      version,
      action,
      data: json,
      admin_id: user.id,
      admin_email: user.email,
    });
    return version;
  }

  router.get("/changes/all", async (req, res) => {
    const [revisions, collections] = await Promise.all([
      sql("content_revisions")
        .select("id", "content_key", "version", "action", "admin_email", "created_at")
        .orderBy("id", "desc")
        .limit(50),
      sql("collection_changes")
        .select("id", "collection", "record_id", "action", "admin_email", "created_at")
        .orderBy("id", "desc")
        .limit(50),
    ]);
    res.json({ revisions, collections });
  });

  router.get("/:key/revisions", async (req, res) => {
    const key = keySchema.parse(req.params.key);
    const rows = await sql("content_revisions")
      .where({ content_key: key })
      .select("id", "version", "action", "admin_email", "created_at")
      .orderBy("id", "desc")
      .limit(50);
    res.json({ rows });
  });

  router.put("/:key", async (req, res) => {
    const key = keySchema.parse(req.params.key);
    const { data } = bodySchema.parse(req.body);
    assertSafeUrls(data);
    const version = await sql.transaction((trx) => write(trx, key, data, req.user, "UPDATE"));
    await audit(db, req.user, `UPDATE_CONTENT_${key.toUpperCase()}`, key);
    res.json({ key, version });
  });

  router.post("/:key/revisions/:id/restore", async (req, res) => {
    const key = keySchema.parse(req.params.key);
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const revision = await sql("content_revisions").where({ id, content_key: key }).first();
    if (!revision) throw fail(404, "Revision not found.");
    const version = await sql.transaction((trx) =>
      write(trx, key, JSON.parse(revision.data), req.user, "RESTORE"),
    );
    await audit(db, req.user, `RESTORE_CONTENT_${key.toUpperCase()}`, String(id));
    res.json({ key, version, data: JSON.parse(revision.data) });
  });

  return router;
}
