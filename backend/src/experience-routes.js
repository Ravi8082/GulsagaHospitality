import { Router } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { z } from "zod";
import { config } from "./config.js";
import { sendNow, template } from "./email.js";
import { fail, hash, makeOtp, equal, can } from "./security.js";
import { signToken, bearerToken, verifyToken } from "./jwt.js";

const emailSchema = z.string().trim().toLowerCase().email().max(255);
const uuidSchema = z.string().uuid();
const ratingSchema = z.number().int().min(1).max(5);
const contentSchema = z
  .object({
    title: z.string().trim().min(5).max(180),
    categoryId: uuidSchema,
    destinationId: z.number().int().positive().nullable().optional(),
    resortId: z.number().int().positive().nullable().optional(),
    shortDescription: z.string().trim().min(10).max(500),
    story: z.string().trim().min(50).max(30000),
    visitDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    overallRating: ratingSchema,
    hospitalityRating: ratingSchema,
    cleanlinessRating: ratingSchema,
    locationRating: ratingSchema,
    amenitiesRating: ratingSchema,
    foodRating: ratingSchema,
    consentToPublish: z.literal(true),
  })
  .strict();

const commentSchema = z
  .object({
    body: z.string().trim().min(2).max(2000),
    parentId: uuidSchema.nullable().optional(),
  })
  .strict();

const reportSchema = z
  .object({
    reason: z.enum(["SPAM", "ABUSE", "MISLEADING", "COPYRIGHT", "PRIVACY", "OTHER"]),
    details: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

const ratingInputSchema = z
  .object({
    hospitality: ratingSchema,
    cleanliness: ratingSchema,
    location: ratingSchema,
    amenities: ratingSchema,
    food: ratingSchema,
    overall: ratingSchema,
  })
  .strict();

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(30).default(12),
  search: z.string().trim().max(160).default(""),
  category: z.string().trim().max(60).optional(),
  sort: z.enum(["latest", "highest-rated", "most-liked"]).default("latest"),
});

function jsonResponse(res, status, message) {
  res.status(status).json({ message });
}

function parseMultipartData(value) {
  try {
    return JSON.parse(value ?? "{}");
  } catch {
    throw fail(400, "Invalid experience data.");
  }
}

function experienceDTO(row, { includeStory = true } = {}) {
  const media = (row.media ?? []).map((item) => ({
    id: item.id,
    kind: item.kind,
    altText: item.altText,
    displayOrder: item.displayOrder,
    url: `${config.API_PUBLIC_URL}/api/community/experiences/media/${item.uploadedFileId}`,
    mime: item.uploadedFile?.mime ?? null,
    thumbnailUrl: item.thumbnailStorageKey
      ? `${config.API_PUBLIC_URL}/api/public/experience-media/${item.uploadedFileId}?thumbnail=1`
      : null,
  }));
  return {
    id: row.id,
    title: row.title,
    shortDescription: row.shortDescription,
    ...(includeStory ? { story: row.story } : {}),
    category: row.category
      ? { id: row.category.id, name: row.category.name, slug: row.category.slug }
      : null,
    destinationId: row.destinationId,
    resortId: row.resortId,
    visitDate: row.visitDate,
    overallRating: row.overallRating,
    ratings: {
      hospitality: row.hospitalityRating,
      cleanliness: row.cleanlinessRating,
      location: row.locationRating,
      amenities: row.amenitiesRating,
      food: row.foodRating,
    },
    status: row.status,
    moderationReason: row.moderationReason ?? null,
    featured: row.featured,
    verifiedMember: row.user?.memberVerified === true,
    verifiedStay: row.verifiedStay === true,
    member: row.user
      ? {
          displayName: row.user.displayName,
          ...(row.user.email ? { email: row.user.email } : {}),
          verifiedMember: row.user.memberVerified === true,
        }
      : null,
    media,
    views: row.views,
    likeCount: row._count?.likes ?? 0,
    commentCount: row._count?.comments ?? 0,
    averageCommunityRating: row.averageCommunityRating ?? null,
    communityRatingCount: row._count?.ratings ?? 0,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
  };
}

function adminExperienceDTO(row, { includeStory = true } = {}) {
  const experience = experienceDTO(row, { includeStory });
  return {
    ...experience,
    media: experience.media.map((media, index) => ({
      ...media,
      url: `${config.API_PUBLIC_URL}/api/admin/experiences/${row.id}/media/${row.media[index].id}`,
    })),
  };
}

const publicInclude = {
  user: { select: { id: true, displayName: true, memberVerified: true } },
  category: { select: { id: true, name: true, slug: true } },
  media: {
    orderBy: { displayOrder: "asc" },
    include: { uploadedFile: { select: { mime: true } } },
  },
  _count: { select: { likes: true, comments: { where: { status: "APPROVED" } }, ratings: true } },
};

async function ratedExperienceDTOs(db, rows) {
  if (!rows.length) return [];
  const averages = await db.experienceRating.groupBy({
    by: ["experienceId"],
    where: { experienceId: { in: rows.map((row) => row.id) } },
    _avg: { overall: true },
  });
  const averageById = new Map(averages.map((item) => [item.experienceId, item._avg.overall]));
  return rows.map((row) =>
    experienceDTO(
      { ...row, averageCommunityRating: averageById.get(row.id) ?? null },
      { includeStory: false },
    ),
  );
}

function authenticatedMember(db) {
  return async (req, res, next) => {
    try {
      const claims = verifyToken(bearerToken(req), "member");
      const memberId = claims ? claims.sub : req.session.communityUserId;
      const user = memberId ? await db.communityUser.findUnique({ where: { id: memberId } }) : null;
      if (!user?.enabled) throw fail(401, "Sign in with your email to continue.");
      req.communityUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

function authenticatedAdmin(req, res, next) {
  if (!can(req.user, "experiences")) return next(fail(403, "Experience moderation permission required."));
  next();
}

function makeOtpService({ db, otpLimit, newsletterOnly = false, sendEmail = sendNow }) {
  const challenges = new Map();
  const sendWindows = new Map();
  const sendLocks = new Set();
  const lifetimeMs = 10 * 60 * 1000;
  const cooldownMs = 60 * 1000;
  const hourlyLimit = 5;

  const prune = (now) => {
    for (const [email, challenge] of challenges) {
      if (now >= challenge.expiresAt || now - challenge.windowStartedAt >= 60 * 60 * 1000) {
        challenges.delete(email);
      }
    }
    for (const [email, window] of sendWindows) {
      if (now - window.startedAt >= 60 * 60 * 1000) sendWindows.delete(email);
    }
  };

  const router = Router();
  router.use(otpLimit);
  router.post("/send", async (req, res) => {
    const data = z
      .object({
        email: emailSchema,
        displayName: z.string().trim().min(2).max(100).optional(),
      })
      .strict()
      .parse(req.body);
    const now = Date.now();
    prune(now);
    const email = data.email;
    const window = sendWindows.get(email);

    if (sendLocks.has(email)) return jsonResponse(res, 429, "Please wait before requesting another code.");
    if (window && now - window.lastSentAt < cooldownMs) {
      return jsonResponse(res, 429, "Please wait a minute before requesting another code.");
    }
    if (window && now - window.startedAt < 60 * 60 * 1000 && window.count >= hourlyLimit) {
      return jsonResponse(res, 429, "Too many codes requested. Please try again later.");
    }

    const code = makeOtp();
    sendLocks.add(email);
    try {
      await sendEmail(
        email,
        template(
          "Your Gulsaga member verification code",
          `Your code is ${code}. It expires in 10 minutes. If you did not request this code, ignore this email.`,
        ),
      );
    } catch {
      return jsonResponse(res, 503, "Email delivery is not configured or available. Try again later.");
    } finally {
      sendLocks.delete(email);
    }

    challenges.set(email, {
      codeHash: hash(`${email}:COMMUNITY:${code}`, config.OTP_SECRET),
      attempts: 0,
      expiresAt: now + lifetimeMs,
      displayName: data.displayName ?? "",
    });
    sendWindows.set(email, {
      startedAt: window && now - window.startedAt < 60 * 60 * 1000 ? window.startedAt : now,
      count: window && now - window.startedAt < 60 * 60 * 1000 ? window.count + 1 : 1,
      lastSentAt: now,
    });
    res.json({
      message: "If email delivery is configured, a verification code has been sent.",
      expiresIn: lifetimeMs / 1000,
      resendAfter: cooldownMs / 1000,
    });
  });

  router.post("/verify", async (req, res) => {
    const data = z
      .object({ email: emailSchema, code: z.string().regex(/^\d{6}$/) })
      .strict()
      .parse(req.body);
    const email = data.email;
    const challenge = challenges.get(email);
    if (!challenge || Date.now() >= challenge.expiresAt) {
      challenges.delete(email);
      return jsonResponse(res, 410, "That code expired. Request a new one.");
    }
    if (challenge.attempts >= 5) {
      challenges.delete(email);
      return jsonResponse(res, 429, "Too many incorrect attempts. Request a new code.");
    }
    if (!equal(challenge.codeHash, hash(`${email}:COMMUNITY:${data.code}`, config.OTP_SECRET))) {
      challenge.attempts += 1;
      if (challenge.attempts >= 5) challenges.delete(email);
      return jsonResponse(res, 400, "That code doesn't match. Please try again.");
    }

    challenges.delete(email);
    if (newsletterOnly) {
      return res.json({
        message: "Email verified. No address, OTP or subscription details were saved to a database.",
      });
    }

    const user = await db.communityUser.upsert({
      where: { email },
      update: {},
      create: {
        email,
        displayName:
          challenge.displayName || email.slice(0, email.indexOf("@")).slice(0, 100) || "Gulsaga Member",
      },
    });
    if (!user.enabled) throw fail(403, "This account is currently disabled.");
    await new Promise((resolve, reject) =>
      req.session.regenerate((error) => (error ? reject(error) : resolve())),
    );
    req.session.communityUserId = user.id;
    res.json({
      message: "Email verified. The one-time code was kept only in server memory and has been deleted.",
      user: { id: user.id, displayName: user.displayName, memberVerified: user.memberVerified },
      csrfToken: req.apiCsrfToken,
      token: signToken({ sub: user.id, typ: "member" }),
    });
  });

  if (!newsletterOnly) {
    router.get("/me", authenticatedMember(db), (req, res) =>
      res.json({
        user: {
          id: req.communityUser.id,
          displayName: req.communityUser.displayName,
          email: req.communityUser.email,
          memberVerified: Boolean(req.communityUser.memberVerified),
          joinedAt: req.communityUser.createdAt,
        },
      }),
    );
    router.post("/logout", authenticatedMember(db), async (req, res) => {
      await new Promise((resolve, reject) =>
        req.session.destroy((error) => (error ? reject(error) : resolve())),
      );
      res.clearCookie("Gulsaga.member.sid", {
        httpOnly: true,
        secure: config.production,
        sameSite: process.env.COOKIE_SAME_SITE || "lax",
      });
      res.json({ message: "Signed out." });
    });
  }

  return router;
}

function makeUploadMiddleware() {
  const maxBytes = Number(process.env.MAX_EXPERIENCE_UPLOAD_BYTES || 104857600);
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 8, fields: 2, fieldSize: 40000, parts: 10 },
  });
}

export function createExperienceRouter({ db, sql, audit, saveFile, readFile, removeFile, otpLimit }) {
  const router = Router();
  const upload = makeUploadMiddleware();
  const member = authenticatedMember(db);

  router.get("/categories", async (req, res) => {
    res.json(
      await db.experienceCategory.findMany({
        where: { enabled: true },
        select: { id: true, slug: true, name: true },
        orderBy: { displayOrder: "asc" },
      }),
    );
  });

  router.use("/auth/otp", makeOtpService({ db, otpLimit }));
  router.use("/media/:fileId", async (req, res, next) => {
    try {
      const fileId = uuidSchema.parse(req.params.fileId);
      const media = await db.experienceMedia.findFirst({
        where: { uploadedFileId: fileId },
        include: {
          uploadedFile: true,
          experience: { select: { status: true, userId: true } },
        },
      });
      if (!media) throw fail(404, "Experience media not found.");
      const ownerCanView = media.experience.userId === req.session.communityUserId;
      if (media.experience.status !== "APPROVED" && !ownerCanView) {
        throw fail(404, "Experience media not found.");
      }
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Content-Type", media.uploadedFile.mime);
      res.setHeader("Content-Disposition", "inline");
      res.send(await readFile(media.uploadedFile));
    } catch (error) {
      next(error);
    }
  });

  router.get("/", async (req, res) => {
    const query = pageSchema.parse(req.query);
    const where = {
      status: "APPROVED",
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search } },
              { shortDescription: { contains: query.search } },
              { story: { contains: query.search } },
            ],
          }
        : {}),
    };
    const orderBy =
      query.sort === "highest-rated"
        ? [{ overallRating: "desc" }, { publishedAt: "desc" }]
        : query.sort === "most-liked"
          ? [{ likes: { _count: "desc" } }, { publishedAt: "desc" }]
          : [{ publishedAt: "desc" }];
    const [rows, total] = await Promise.all([
      db.memberExperience.findMany({
        where,
        include: publicInclude,
        orderBy,
        take: query.pageSize,
        skip: (query.page - 1) * query.pageSize,
      }),
      db.memberExperience.count({ where }),
    ]);
    res.json({
      rows: await ratedExperienceDTOs(db, rows),
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  });

  router.get("/featured", async (req, res) => {
    const rows = await db.memberExperience.findMany({
      where: { status: "APPROVED", featured: true },
      include: publicInclude,
      orderBy: { publishedAt: "desc" },
      take: 6,
    });
    res.json(await ratedExperienceDTOs(db, rows));
  });

  router.get("/mine", member, async (req, res) => {
    const rows = await db.memberExperience.findMany({
      where: { userId: req.communityUser.id, status: { not: "REMOVED" } },
      include: { ...publicInclude, moderationHistory: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(rows.map(experienceDTO));
  });

  router.get("/notifications", member, async (req, res) => {
    const rows = await db.experienceNotification.findMany({
      where: { userId: req.communityUser.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(rows);
  });

  router.patch("/notifications/:id/read", member, async (req, res) => {
    const id = uuidSchema.parse(req.params.id);
    const result = await db.experienceNotification.updateMany({
      where: { id, userId: req.communityUser.id, readAt: null },
      data: { readAt: new Date() },
    });
    if (!result.count) throw fail(404, "Notification not found.");
    res.json({ message: "Notification marked as read." });
  });

  router.post("/", member, upload.array("media", 8), async (req, res) => {
    const input = contentSchema.parse(parseMultipartData(req.body.data));
    const category = await db.experienceCategory.findFirst({
      where: { id: input.categoryId, enabled: true },
    });
    if (!category) throw fail(400, "Choose an available experience category.");
    if (input.destinationId && !(await sql("destinations").where({ id: input.destinationId }).first("id"))) {
      throw fail(400, "Choose an existing destination.");
    }
    if (input.resortId && !(await sql("resorts").where({ id: input.resortId }).first("id"))) {
      throw fail(400, "Choose an existing resort.");
    }

    const files = [];
    try {
      for (const file of req.files ?? []) files.push(await saveFile(file, "EXPERIENCE_MEDIA"));
      const row = await db.$transaction(async (tx) => {
        const uploaded = [];
        for (const file of files) {
          uploaded.push(
            await tx.uploadedFile.create({
              data: { ...file, purpose: "EXPERIENCE_MEDIA", published: false },
            }),
          );
        }
        return tx.memberExperience.create({
          data: {
            userId: req.communityUser.id,
            categoryId: category.id,
            destinationId: input.destinationId ?? null,
            resortId: input.resortId ?? null,
            title: input.title,
            shortDescription: input.shortDescription,
            story: input.story,
            visitDate: input.visitDate ? new Date(`${input.visitDate}T00:00:00.000Z`) : null,
            overallRating: input.overallRating,
            hospitalityRating: input.hospitalityRating,
            cleanlinessRating: input.cleanlinessRating,
            locationRating: input.locationRating,
            amenitiesRating: input.amenitiesRating,
            foodRating: input.foodRating,
            status: "PENDING",
            media: {
              create: uploaded.map((file, index) => ({
                uploadedFileId: file.id,
                kind: file.mime.startsWith("video/") ? "VIDEO" : "IMAGE",
                displayOrder: index,
              })),
            },
          },
          include: publicInclude,
        });
      });
      res.status(201).json({
        message: "Your experience is pending admin review and is not public yet.",
        experience: experienceDTO(row),
      });
    } catch (error) {
      await Promise.all(files.map((file) => removeFile(file)));
      throw error;
    }
  });

  router.put("/:id", member, upload.array("media", 8), async (req, res) => {
    const id = uuidSchema.parse(req.params.id);
    const input = contentSchema.parse(parseMultipartData(req.body.data));
    const current = await db.memberExperience.findFirst({
      where: {
        id,
        userId: req.communityUser.id,
        status: { in: ["REJECTED", "REVISION_REQUESTED"] },
      },
      include: { media: { include: { uploadedFile: true } } },
    });
    if (!current) throw fail(404, "Only rejected or revision-requested experiences can be edited.");
    const category = await db.experienceCategory.findFirst({
      where: { id: input.categoryId, enabled: true },
    });
    if (!category) throw fail(400, "Choose an available experience category.");
    const files = [];
    try {
      for (const file of req.files ?? []) files.push(await saveFile(file, "EXPERIENCE_MEDIA"));
      const row = await db.$transaction(async (tx) => {
        const uploaded = [];
        for (const file of files) {
          uploaded.push(
            await tx.uploadedFile.create({
              data: { ...file, purpose: "EXPERIENCE_MEDIA", published: false },
            }),
          );
        }
        return tx.memberExperience.update({
          where: { id },
          data: {
            categoryId: category.id,
            destinationId: input.destinationId ?? null,
            resortId: input.resortId ?? null,
            title: input.title,
            shortDescription: input.shortDescription,
            story: input.story,
            visitDate: input.visitDate ? new Date(`${input.visitDate}T00:00:00.000Z`) : null,
            overallRating: input.overallRating,
            hospitalityRating: input.hospitalityRating,
            cleanlinessRating: input.cleanlinessRating,
            locationRating: input.locationRating,
            amenitiesRating: input.amenitiesRating,
            foodRating: input.foodRating,
            status: "PENDING",
            moderationReason: null,
            featured: false,
            publishedAt: null,
            ...(uploaded.length
              ? {
                  media: {
                    deleteMany: {},
                    create: uploaded.map((file, index) => ({
                      uploadedFileId: file.id,
                      kind: file.mime.startsWith("video/") ? "VIDEO" : "IMAGE",
                      displayOrder: index,
                    })),
                  },
                }
              : {}),
          },
          include: publicInclude,
        });
      });
      if (files.length) {
        for (const media of current.media) {
          await removeFile(media.uploadedFile);
          await db.uploadedFile.delete({ where: { id: media.uploadedFileId } });
        }
      }
      res.json({
        message: "Updated experience returned to the pending review queue.",
        experience: experienceDTO(row),
      });
    } catch (error) {
      await Promise.all(files.map((file) => removeFile(file)));
      throw error;
    }
  });

  router.delete("/:id", member, async (req, res) => {
    const id = uuidSchema.parse(req.params.id);
    const row = await db.memberExperience.findFirst({
      where: {
        id,
        userId: req.communityUser.id,
        status: { in: ["PENDING", "REJECTED", "REVISION_REQUESTED"] },
      },
      include: { media: { include: { uploadedFile: true } } },
    });
    if (!row) throw fail(404, "Only pending or rejected experiences can be deleted.");
    await db.memberExperience.delete({ where: { id } });
    for (const media of row.media) {
      await removeFile(media.uploadedFile);
      await db.uploadedFile.delete({ where: { id: media.uploadedFileId } });
    }
    res.json({ message: "Experience deleted." });
  });

  router.get("/:id", async (req, res) => {
    const id = uuidSchema.parse(req.params.id);
    const row = await db.memberExperience.findFirst({
      where: { id, status: "APPROVED" },
      include: {
        ...publicInclude,
        ratings: {
          select: {
            hospitality: true,
            cleanliness: true,
            location: true,
            amenities: true,
            food: true,
            overall: true,
          },
          take: 100,
        },
        comments: {
          where: { status: "APPROVED", parentId: null },
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { displayName: true, memberVerified: true } },
            replies: {
              where: { status: "APPROVED" },
              orderBy: { createdAt: "asc" },
              include: { user: { select: { displayName: true, memberVerified: true } } },
            },
          },
          take: 100,
        },
      },
    });
    if (!row) throw fail(404, "Experience not found.");
    const average = await db.experienceRating.aggregate({
      where: { experienceId: id },
      _avg: { overall: true },
    });

    const viewerHash = hash(
    `${id}:${req.ip}:${req.get("user-agent") ?? ""}`,
    config.OTP_SECRET,
    );
    const inserted = await db.experienceView.createMany({
    data: { experienceId: id, viewerHash },
    skipDuplicates: true,
    });
    if (inserted.count) {
    await db.memberExperience.update({ where: { id }, data: { views: { increment: 1 } } });
    }
    res.json({
      ...experienceDTO(row),
      averageCommunityRating: average._avg.overall,
      comments: row.comments,
      ratingBreakdown: row.ratings,
    });
  });

  router.post("/:id/likes/toggle", member, async (req, res) => {
    const id = uuidSchema.parse(req.params.id);
    const experience = await db.memberExperience.findFirst({
      where: { id, status: "APPROVED" },
      select: { id: true, userId: true },
    });
    if (!experience) throw fail(404, "Experience not found.");
    const result = await db.$transaction(async (tx) => {
      const deleted = await tx.experienceLike.deleteMany({
        where: { experienceId: id, userId: req.communityUser.id },
      });
      if (deleted.count) return false;
      await tx.experienceLike.create({ data: { experienceId: id, userId: req.communityUser.id } });
      if (experience.userId !== req.communityUser.id) {
        await tx.experienceNotification.create({
          data: {
            userId: experience.userId,
            experienceId: id,
            kind: "LIKE",
            message: `${req.communityUser.displayName} liked your experience.`,
          },
        });
      }
      return true;
    });
    res.json({ liked: result });
  });

  router.post("/:id/ratings", member, async (req, res) => {
    const id = uuidSchema.parse(req.params.id);
    const ratings = ratingInputSchema.parse(req.body);
    const experience = await db.memberExperience.findFirst({
      where: { id, status: "APPROVED" },
      select: { id: true, userId: true },
    });
    if (!experience) throw fail(404, "Experience not found.");
    if (experience.userId === req.communityUser.id) throw fail(403, "You cannot rate your own experience.");
    const existing = await db.experienceRating.findUnique({
      where: { experienceId_userId: { experienceId: id, userId: req.communityUser.id } },
    });
    if (existing) throw fail(409, "You have already rated this experience.");
    const row = await db.experienceRating.create({
      data: { ...ratings, experienceId: id, userId: req.communityUser.id },
    });
    res.status(201).json(row);
  });

  router.patch("/:id/ratings", member, async (req, res) => {
    const id = uuidSchema.parse(req.params.id);
    const ratings = ratingInputSchema.parse(req.body);
    const experience = await db.memberExperience.findFirst({
      where: { id, status: "APPROVED" },
      select: { id: true, userId: true },
    });
    if (!experience) throw fail(404, "Experience not found.");
    if (experience.userId === req.communityUser.id) {
      throw fail(403, "You cannot rate your own experience.");
    }
    const existing = await db.experienceRating.findUnique({
      where: { experienceId_userId: { experienceId: id, userId: req.communityUser.id } },
      select: { id: true },
    });
    if (!existing) throw fail(404, "Submit a rating before editing it.");
    const row = await db.experienceRating.update({
      where: { id: existing.id },
      data: ratings,
    });
    res.json(row);
  });

  router.post("/:id/comments", member, async (req, res) => {
    const id = uuidSchema.parse(req.params.id);
    const data = commentSchema.parse(req.body);
    const experience = await db.memberExperience.findFirst({
      where: { id, status: "APPROVED" },
      select: { id: true, userId: true },
    });
    if (!experience) throw fail(404, "Experience not found.");
    if (data.parentId) {
      const parent = await db.experienceComment.findFirst({
        where: { id: data.parentId, experienceId: id, status: "APPROVED" },
        select: { id: true },
      });
      if (!parent) throw fail(400, "Replies must reference an approved comment on this experience.");
    }
    const comment = await db.experienceComment.create({
      data: {
        experienceId: id,
        userId: req.communityUser.id,
        parentId: data.parentId ?? null,
        body: data.body,
        status: "PENDING",
      },
    });
    if (experience.userId !== req.communityUser.id) {
      await db.experienceNotification.create({
        data: {
          userId: experience.userId,
          experienceId: id,
          kind: "COMMENT",
          message: `${req.communityUser.displayName} commented on your experience. The comment is awaiting moderation.`,
        },
      });
    }
    res.status(201).json({
      message: "Your comment is awaiting moderation.",
      id: comment.id,
      status: comment.status,
    });
  });

  router.post("/:id/reports", member, async (req, res) => {
    const id = uuidSchema.parse(req.params.id);
    const report = reportSchema.parse(req.body);
    const experience = await db.memberExperience.findFirst({
      where: { id, status: "APPROVED" },
      select: { id: true },
    });
    if (!experience) throw fail(404, "Experience not found.");
    await db.experienceReport.create({
      data: {
        ...report,
        experienceId: id,
        userId: req.communityUser.id,
        status: "OPEN",
      },
    });
    res.status(201).json({ message: "Report sent to the moderation team." });
  });

  return router;
}

export function createNewsletterOtpRouter({ db, otpLimit, sendEmail }) {
  return makeOtpService({ db, otpLimit, newsletterOnly: true, sendEmail });
}

export function createExperienceAdminRouter({ db, sql, audit, readFile }) {
  const router = Router();
  router.use(authenticatedAdmin);

  router.get("/", async (req, res) => {
    const status = z
      .enum(["PENDING", "APPROVED", "REJECTED", "REVISION_REQUESTED", "REMOVED"])
      .optional()
      .parse(req.query.status);
    const page = z.coerce.number().int().min(1).default(1).parse(req.query.page);
    const where = status ? { status } : {};
    const [rows, total] = await Promise.all([
      db.memberExperience.findMany({
        where,
        include: {
          ...publicInclude,
          user: { select: { id: true, email: true, displayName: true, memberVerified: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        skip: (page - 1) * 50,
      }),
      db.memberExperience.count({ where }),
    ]);
    res.json({
      rows: rows.map((row) => adminExperienceDTO(row, { includeStory: false })),
      total,
      page,
      pageSize: 50,
    });
  });

  router.get("/analytics", async (req, res) => {
    const [
      total,
      pending,
      approved,
      rejected,
      featured,
      mediaCounts,
      average,
      popularResorts,
      popularDestinations,
    ] = await Promise.all([
      db.memberExperience.count(),
      db.memberExperience.count({ where: { status: "PENDING" } }),
      db.memberExperience.count({ where: { status: "APPROVED" } }),
      db.memberExperience.count({ where: { status: "REJECTED" } }),
      db.memberExperience.count({ where: { status: "APPROVED", featured: true } }),
      db.experienceMedia.groupBy({ by: ["kind"], _count: { id: true } }),
      db.experienceRating.aggregate({ where: { experience: { status: "APPROVED" } }, _avg: { overall: true } }),
      db.memberExperience.groupBy({
        by: ["resortId"],
        where: { status: "APPROVED", resortId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      db.memberExperience.groupBy({
        by: ["destinationId"],
        where: { status: "APPROVED", destinationId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
    ]);
    const resortIds = popularResorts.flatMap((item) => (item.resortId ? [item.resortId] : []));
    const destinationIds = popularDestinations.flatMap((item) =>
      item.destinationId ? [item.destinationId] : [],
    );
    const [resorts, destinations, monthly] = await Promise.all([
      resortIds.length ? sql("resorts").whereIn("id", resortIds).select("id", "name", "location") : [],
      destinationIds.length
        ? sql("destinations").whereIn("id", destinationIds).select("id", "name", "region")
        : [],
      db.$queryRaw`
        SELECT DATE_FORMAT(createdAt, '%Y-%m') AS month, COUNT(*) AS submissions
        FROM MemberExperience
        WHERE createdAt >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
        ORDER BY month ASC
      `,
    ]);
    res.json({
      totalExperiences: total,
      pendingSubmissions: pending,
      approvedExperiences: approved,
      rejectedSubmissions: rejected,
      featuredExperiences: featured,
      uploadedPhotos: mediaCounts.find((item) => item.kind === "IMAGE")?._count.id ?? 0,
      uploadedVideos: mediaCounts.find((item) => item.kind === "VIDEO")?._count.id ?? 0,
      averageRating: average._avg.overall,
      popularResorts: popularResorts.map((item) => ({
        ...resorts.find((row) => row.id === item.resortId),
        experiences: item._count.id,
      })),
      popularDestinations: popularDestinations.map((item) => ({
        ...destinations.find((row) => row.id === item.destinationId),
        experiences: item._count.id,
      })),
      monthlySubmissions: monthly,
    });
  });

  router.get("/reports", async (req, res) => {
    const status = z.enum(["OPEN", "REVIEWED", "DISMISSED"]).optional().parse(req.query.status);
    const rows = await db.experienceReport.findMany({
      where: status ? { status } : {},
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        experience: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(rows);
  });

  router.patch("/reports/:id", async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const data = z.object({ status: z.enum(["REVIEWED", "DISMISSED"]) }).strict().parse(req.body);
    const row = await db.experienceReport.update({
      where: { id },
      data: { status: data.status, reviewedById: req.user.id, reviewedAt: new Date() },
    });
    await audit(db, req.user, "REVIEW_EXPERIENCE_REPORT", id);
    res.json(row);
  });

  router.get("/comments", async (req, res) => {
    const status = z.enum(["PENDING", "APPROVED", "REJECTED"]).optional().parse(req.query.status);
    const rows = await db.experienceComment.findMany({
      where: status ? { status } : {},
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        experience: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(rows);
  });

  router.patch("/comments/:id", async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const data = z
      .object({ status: z.enum(["APPROVED", "REJECTED"]), reason: z.string().trim().max(1000).optional() })
      .strict()
      .parse(req.body);
    const current = await db.experienceComment.findUnique({ where: { id } });
    if (!current) throw fail(404, "Comment not found.");
    const row = await db.$transaction(async (tx) => {
      const updated = await tx.experienceComment.update({
        where: { id },
        data: { status: data.status, moderatorId: req.user.id, moderatedAt: new Date() },
      });
      await tx.experienceModerationHistory.create({
        data: {
          experienceId: current.experienceId,
          adminId: req.user.id,
          action: `COMMENT_${data.status}`,
          reason: data.reason || null,
        },
      });
      if (data.status === "APPROVED" && current.userId !== req.user.id) {
        const owner = await tx.memberExperience.findUnique({
          where: { id: current.experienceId },
          select: { userId: true },
        });
        if (owner && owner.userId !== current.userId) {
          await tx.experienceNotification.create({
            data: {
              userId: current.userId,
              experienceId: current.experienceId,
              kind: "COMMENT_APPROVED",
              message: "Your comment has been approved.",
            },
          });
        }
      }
      await audit(tx, req.user, `MODERATE_EXPERIENCE_COMMENT_${data.status}`, id);
      return updated;
    });
    res.json(row);
  });

  router.patch("/:id/moderate", async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const data = z
      .object({
        action: z.enum(["APPROVE", "REJECT", "REQUEST_CHANGES", "FEATURE", "UNFEATURE", "REMOVE"]),
        reason: z.string().trim().max(1000).optional(),
      })
      .strict()
      .parse(req.body);
    const current = await db.memberExperience.findUnique({ where: { id } });
    if (!current) throw fail(404, "Experience not found.");
    if (["REJECT", "REQUEST_CHANGES"].includes(data.action) && !data.reason?.trim()) {
      throw fail(400, "A moderation reason is required.");
    }
    if (["FEATURE", "UNFEATURE"].includes(data.action) && current.status !== "APPROVED") {
      throw fail(400, "Only approved experiences can be featured.");
    }
    const update =
      data.action === "APPROVE"
        ? { status: "APPROVED", moderationReason: null, featured: false, publishedAt: new Date() }
        : data.action === "REJECT"
          ? {
              status: "REJECTED",
              moderationReason: data.reason,
              featured: false,
              publishedAt: null,
            }
          : data.action === "REQUEST_CHANGES"
            ? {
                status: "REVISION_REQUESTED",
                moderationReason: data.reason,
                featured: false,
                publishedAt: null,
              }
            : data.action === "FEATURE"
              ? { featured: true }
              : data.action === "UNFEATURE"
                ? { featured: false }
                : { status: "REMOVED", featured: false, publishedAt: null, moderationReason: data.reason || "Removed by administrator." };
    const row = await db.$transaction(async (tx) => {
      const updated = await tx.memberExperience.update({
        where: { id },
        data: { ...update, moderatedAt: new Date(), moderatedById: req.user.id },
        include: { ...publicInclude, user: { select: { displayName: true, memberVerified: true } } },
      });
      await tx.experienceModerationHistory.create({
        data: {
          experienceId: id,
          adminId: req.user.id,
          action: data.action,
          reason: data.reason || null,
        },
      });
      const message =
        data.action === "APPROVE"
          ? "Your experience was approved and is now public."
          : data.action === "REJECT"
            ? `Your experience was rejected: ${data.reason}`
            : data.action === "REQUEST_CHANGES"
              ? `Changes were requested for your experience: ${data.reason}`
              : data.action === "REMOVE"
                ? "Your published experience was removed by an administrator."
                : `Your experience was ${data.action === "FEATURE" ? "featured" : "unfeatured"}.`;
      await tx.experienceNotification.create({
        data: {
          userId: current.userId,
          experienceId: id,
          kind: `MODERATION_${data.action}`,
          message,
        },
      });
      await audit(tx, req.user, `MODERATE_EXPERIENCE_${data.action}`, id);
      return updated;
    });
    res.json(adminExperienceDTO(row));
  });

  router.patch("/members/:id/verification", async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const data = z.object({ memberVerified: z.boolean() }).strict().parse(req.body);
    const user = await db.communityUser.update({
      where: { id },
      data: { memberVerified: data.memberVerified },
      select: { id: true, displayName: true, memberVerified: true },
    });
    await audit(db, req.user, "VERIFY_COMMUNITY_MEMBER", id);
    res.json(user);
  });

  router.patch("/members/:id/status", async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const data = z.object({ enabled: z.boolean() }).strict().parse(req.body);
    const user = await db.communityUser.update({
      where: { id },
      data: { enabled: data.enabled },
      select: { id: true, email: true, displayName: true, enabled: true },
    });
    await audit(db, req.user, "UPDATE_COMMUNITY_MEMBER_STATUS", id);
    res.json(user);
  });

  router.get("/members", async (req, res) => {
    const page = z.coerce.number().int().min(1).default(1).parse(req.query.page);
    const [rows, total] = await Promise.all([
      db.communityUser.findMany({
        select: {
          id: true,
          email: true,
          displayName: true,
          memberVerified: true,
          enabled: true,
          createdAt: true,
          _count: { select: { experiences: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        skip: (page - 1) * 50,
      }),
      db.communityUser.count(),
    ]);
    res.json({ rows, total, page, pageSize: 50 });
  });

  router.get("/:id/media/:mediaId", async (req, res) => {
    const experienceId = uuidSchema.parse(req.params.id);
    const mediaId = uuidSchema.parse(req.params.mediaId);
    const media = await db.experienceMedia.findFirst({
      where: { id: mediaId, experienceId },
      include: { uploadedFile: true },
    });
    if (!media) throw fail(404, "Experience media not found.");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Content-Type", media.uploadedFile.mime);
    res.setHeader("Content-Disposition", "inline");
    res.send(await readFile(media.uploadedFile));
  });

  router.get("/:id", async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const row = await db.memberExperience.findUnique({
      where: { id },
      include: {
        ...publicInclude,
        user: { select: { id: true, displayName: true, email: true, memberVerified: true } },
        moderationHistory: {
          orderBy: { createdAt: "desc" },
          include: { admin: { select: { name: true } } },
        },
        reports: { orderBy: { createdAt: "desc" }, include: { user: { select: { email: true } } } },
      },
    });
    if (!row) throw fail(404, "Experience not found.");
    res.json({
      ...adminExperienceDTO(row),
      user: {
        id: row.user.id,
        email: row.user.email,
        displayName: row.user.displayName,
        memberVerified: row.user.memberVerified,
      },
      moderationHistory: row.moderationHistory,
      reports: row.reports,
    });
  });

  return router;
}
