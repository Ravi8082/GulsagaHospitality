import { Router } from "express";
import { z } from "zod";
import { fail } from "./security.js";

const nullableText = (limit) => z.string().trim().max(limit).nullable().optional();
const imageUrl = z
  .string()
  .url()
  .max(600)
  .refine((value) => value.startsWith("https://"))
  .nullable()
  .optional();
const order = z.number().int().min(0).max(10000);

const safeUrl = z
  .string()
  .trim()
  .max(600)
  .refine((value) => /^(https:\/\/|mailto:|tel:|\/(?!\/))/.test(value), "Use https, mailto, tel or a site path.");
const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120);

const collections = {
  network_partners: {
    table: "network_partners",
    schema: z
      .object({
        slug,
        name: z.string().trim().min(2).max(180),
        category: z.string().trim().min(2).max(80),
        city: nullableText(120),
        country: nullableText(120),
        property_type: nullableText(80),
        description: nullableText(12000),
        logo_url: imageUrl,
        image_url: imageUrl,
        website: imageUrl,
        lat: z.number().min(-90).max(90).nullable().optional(),
        lng: z.number().min(-180).max(180).nullable().optional(),
        verified: z.boolean().optional(),
        featured: z.boolean().optional(),
        published: z.boolean().optional(),
        sort_order: order,
      })
      .strict(),
  },
  experience_catalog: {
    table: "experience_catalog",
    schema: z
      .object({
        slug,
        title: z.string().trim().min(2).max(180),
        category: nullableText(80),
        summary: nullableText(500),
        description: nullableText(12000),
        image_url: imageUrl,
        link_url: safeUrl.nullable().optional(),
        featured: z.boolean().optional(),
        published: z.boolean().optional(),
        sort_order: order,
      })
      .strict(),
  },
  contact_channels: {
    table: "contact_channels",
    schema: z
      .object({
        kind: z.enum(["phone", "email", "whatsapp", "address", "hours", "map", "social"]),
        label: z.string().trim().min(1).max(120),
        value: z.string().trim().min(1).max(300),
        url: safeUrl.nullable().optional(),
        published: z.boolean().optional(),
        sort_order: order,
      })
      .strict(),
  },
  site_links: {
    table: "site_links",
    schema: z
      .object({
        area: z.enum(["header", "footer", "legal", "social", "cta"]),
        label: z.string().trim().min(1).max(120),
        url: safeUrl,
        published: z.boolean().optional(),
        sort_order: order,
      })
      .strict(),
  },
  destinations: {
    table: "destinations",
    schema: z
      .object({
        slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
        name: z.string().trim().min(2).max(160),
        region: z.string().trim().min(2).max(160),
        theme: z.string().trim().min(2).max(80),
        tagline: nullableText(255),
        description: nullableText(12000),
        image_url: imageUrl,
        rating: z.number().min(0).max(5).nullable().optional(),
        lat: z.number().min(-90).max(90).nullable().optional(),
        lng: z.number().min(-180).max(180).nullable().optional(),
        featured: z.boolean().optional(),
        sort_order: order,
      })
      .strict(),
  },
  resorts: {
    table: "resorts",
    schema: z
      .object({
        slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
        name: z.string().trim().min(2).max(180),
        location: z.string().trim().min(2).max(180),
        stars: z.number().int().min(1).max(5).nullable().optional(),
        category: nullableText(80),
        description: nullableText(12000),
        image_url: imageUrl,
        website: z
          .string()
          .url()
          .max(300)
          .refine((value) => value.startsWith("https://"))
          .nullable()
          .optional(),
        featured: z.boolean().optional(),
        sort_order: order,
      })
      .strict(),
  },
  benefits: {
    table: "benefits",
    schema: z
      .object({
        title: z.string().trim().min(2).max(160),
        description: nullableText(12000),
        icon: nullableText(60),
        sort_order: order,
      })
      .strict(),
  },
  plans: {
    table: "plans",
    schema: z
      .object({
        code: z.string().trim().min(2).max(60),
        name: z.string().trim().min(2).max(160),
        subtitle: nullableText(255),
        price: z.number().finite().min(0).max(999999999999),
        currency: z.string().trim().min(1).max(8).optional(),
        gst_note: nullableText(120),
        down_payment: z.number().finite().min(0).max(999999999999).nullable().optional(),
        balance: z.number().finite().min(0).max(999999999999).nullable().optional(),
        emi_quarterly: z.number().finite().min(0).max(999999999999).nullable().optional(),
        emi_monthly: z.number().finite().min(0).max(999999999999).nullable().optional(),
        seats_total: z.number().int().min(0).max(10000000).nullable().optional(),
        seats_taken: z.number().int().min(0).max(10000000).nullable().optional(),
        badge: nullableText(80),
        featured: z.boolean().optional(),
        sort_order: order,
      })
      .strict(),
  },
  plan_features: {
    table: "plan_features",
    schema: z
      .object({
        plan_id: z.number().int().positive(),
        label: z.string().trim().min(2).max(160),
        value: nullableText(255),
        included: z.boolean().optional(),
        sort_order: order,
      })
      .strict(),
  },
  steps: {
    table: "steps",
    schema: z
      .object({
        step_no: z.number().int().min(1).max(100),
        title: z.string().trim().min(2).max(160),
        description: nullableText(12000),
        icon: nullableText(60),
        sort_order: order,
      })
      .strict(),
  },
  faqs: {
    table: "faqs",
    schema: z
      .object({
        question: z.string().trim().min(2).max(300),
        answer: z.string().trim().min(2).max(20000),
        sort_order: order,
      })
      .strict(),
  },
  stats: {
    table: "stats",
    schema: z
      .object({
        label: z.string().trim().min(2).max(160),
        value: z.number().finite().min(0).max(999999999999),
        prefix: nullableText(20),
        suffix: nullableText(20),
        sort_order: order,
      })
      .strict(),
  },
  testimonials: {
    table: "testimonials",
    schema: z
      .object({
        name: z.string().trim().min(2).max(160),
        location: nullableText(160),
        quote: z.string().trim().min(2).max(20000),
        rating: z.number().int().min(1).max(5).nullable().optional(),
        image_url: imageUrl,
        sort_order: order,
      })
      .strict(),
  },
  themes: {
    table: "themes",
    schema: z
      .object({
        slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
        name: z.string().trim().min(2).max(160),
        description: nullableText(12000),
        image_url: imageUrl,
        sort_order: order,
      })
      .strict(),
  },
};

const publicCollections = [
  "destinations",
  "resorts",
  "benefits",
  "plans",
  "steps",
  "faqs",
  "stats",
  "testimonials",
  "themes",
];
const publishedCollections = ["network_partners", "experience_catalog", "contact_channels", "site_links"];

export async function getPublicHospitality({ sql, db }) {
  const [records, planFeatures, settings, socialLinks] = await Promise.all([
    Promise.all(
      [...publicCollections, ...publishedCollections].map(async (name) => {
        const collection = collections[name];
        const query = sql(collection.table).select("*").orderBy("sort_order", "asc");
        if (publishedCollections.includes(name)) query.where({ published: true });
        return [name, await query];
      }),
    ),
    sql("plan_features").select("*").orderBy("sort_order", "asc"),
    db.siteSetting.findMany(),
    db.socialLink.findMany({
      where: { verified: true },
      select: { label: true, url: true },
    }),
  ]);

  return {
    collections: Object.fromEntries([...records, ["plan_features", planFeatures]]),
    settings: Object.fromEntries(settings.map(({ key, value }) => [key, value])),
    socialLinks,
  };
}

export function createHospitalityAdminRouter({ sql, db, can, audit }) {
  const router = Router();
  const track = (req, collection, recordId, action, before, after) =>
    sql("collection_changes").insert({
      collection,
      record_id: String(recordId),
      action,
      before_data: before ? JSON.stringify(before) : null,
      after_data: after ? JSON.stringify(after) : null,
      admin_id: req.user.id,
      admin_email: req.user.email,
    });
  router.use((req, res, next) => {
    if (!can(req.user, "content")) return next(fail(403, "Permission denied."));
    next();
  });

  router.get("/:collection", async (req, res) => {
    const collection = Object.hasOwn(collections, req.params.collection)
      ? collections[req.params.collection]
      : null;
    if (!collection) throw fail(404, "Hospitality content collection not found.");
    const page = z.coerce.number().int().min(1).default(1).parse(req.query.page);
    const [rows, count] = await Promise.all([
      sql(collection.table)
        .select("*")
        .orderBy("sort_order", "asc")
        .limit(50)
        .offset((page - 1) * 50),
      sql(collection.table).count({ total: "*" }).first(),
    ]);
    res.json({ rows, total: Number(count?.total ?? 0), page, pageSize: 50 });
  });

  router.post("/:collection", async (req, res) => {
    const name = req.params.collection;
    const collection = Object.hasOwn(collections, name) ? collections[name] : null;
    if (!collection) throw fail(404, "Hospitality content collection not found.");
    const data = collection.schema.parse(req.body);
    if (name === "plan_features") {
      const plan = await sql("plans").where({ id: data.plan_id }).first("id");
      if (!plan) throw fail(400, "Choose an existing membership plan.");
    }
    const [id] = await sql(collection.table).insert(data);
    const row = await sql(collection.table).where({ id }).first();
    await track(req, name, id, "CREATE", null, row);
    await audit(db, req.user, `CREATE_HOSPITALITY_${name.toUpperCase()}`, String(id));
    res.status(201).json(row);
  });

  router.put("/:collection/:id", async (req, res) => {
    const name = req.params.collection;
    const collection = Object.hasOwn(collections, name) ? collections[name] : null;
    if (!collection) throw fail(404, "Hospitality content collection not found.");
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const data = collection.schema.parse(req.body);
    if (name === "plan_features") {
      const plan = await sql("plans").where({ id: data.plan_id }).first("id");
      if (!plan) throw fail(400, "Choose an existing membership plan.");
    }
    const before = await sql(collection.table).where({ id }).first();
    const updated = await sql(collection.table).where({ id }).update(data);
    if (!updated) throw fail(404, "Hospitality content item not found.");
    const row = await sql(collection.table).where({ id }).first();
    await track(req, name, id, "UPDATE", before, row);
    await audit(db, req.user, `UPDATE_HOSPITALITY_${name.toUpperCase()}`, String(id));
    res.json(row);
  });

  router.delete("/:collection/:id", async (req, res) => {
    const name = req.params.collection;
    const collection = Object.hasOwn(collections, name) ? collections[name] : null;
    if (!collection) throw fail(404, "Hospitality content collection not found.");
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const before = await sql(collection.table).where({ id }).first();
    const deleted = await sql.transaction(async (trx) => {
      if (name === "plans") await trx("plan_features").where({ plan_id: id }).delete();
      return trx(collection.table).where({ id }).delete();
    });
    if (!deleted) throw fail(404, "Hospitality content item not found.");
    await track(req, name, id, "DELETE", before, null);
    await audit(db, req.user, `DELETE_HOSPITALITY_${name.toUpperCase()}`, String(id));
    res.json({ message: "Hospitality content item deleted." });
  });

  return router;
}
