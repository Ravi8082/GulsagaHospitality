// Terms & policies: admin-written text or an uploaded PDF, plus an audit log of who accepted which version.
import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { fail } from './security.js';
import { enqueue, processOutbox } from './email.js';
import { saveFile, readFile, removeFile } from './storage.js';

const DEFAULTS = [
  { slug: 'terms', title: 'Terms & Conditions', body: 'These Terms & Conditions govern enquiries, bookings and memberships made through Gulsaga. Please replace this text from Admin > Terms & Policies.' },
  { slug: 'privacy', title: 'Privacy Policy', body: 'This Privacy Policy explains how Gulsaga collects and uses your details. Please replace this text from Admin > Terms & Policies.' },
];
let ready = false;

async function ensure(sql) {
  if (ready) return;
  if (!(await sql.schema.hasTable('legal_policies'))) {
    await sql.schema.createTable('legal_policies', (t) => {
      t.string('slug', 40).primary();
      t.string('title', 160).notNullable();
      t.text('body', 'longtext').nullable();
      t.string('pdf_id', 36).nullable();
      t.string('pdf_name', 200).nullable();
      t.integer('version').notNullable().defaultTo(1);
      t.string('updated_by', 120).nullable();
      t.timestamp('updated_at').defaultTo(sql.fn.now());
    });
  }
  if (!(await sql.schema.hasTable('policy_acceptances'))) {
    await sql.schema.createTable('policy_acceptances', (t) => {
      t.increments('id');
      t.string('context', 20).notNullable().index();
      t.string('name', 120).nullable();
      t.string('email', 255).notNullable().index();
      t.string('phone', 30).nullable();
      t.string('reference', 80).nullable();
      t.string('policies', 255).notNullable();
      t.string('ip', 64).nullable();
      t.string('user_agent', 255).nullable();
      t.timestamp('created_at').defaultTo(sql.fn.now());
    });
  }
  for (const d of DEFAULTS) {
    if (!(await sql('legal_policies').where({ slug: d.slug }).first())) await sql('legal_policies').insert(d);
  }
  ready = true;
}

const view = (r, withBody) => ({
  slug: r.slug, title: r.title, version: r.version, hasPdf: Boolean(r.pdf_id), pdfName: r.pdf_name, updatedAt: r.updated_at,
  ...(withBody ? { body: r.body || '' } : {}),
});

// Records acceptance of every current policy and emails the person plus the company. Throws if the person did not accept.
export async function recordAcceptance({ db, sql }, { context, name, email, phone, reference, accepted, req, adminTo }) {
  if (accepted !== true) throw fail(400, 'Please accept the Terms & Conditions and Privacy Policy to continue.');
  await ensure(sql);
  const rows = await sql('legal_policies').select('slug', 'title', 'version').orderBy('slug');
  const list = rows.map((r) => `${r.title} (v${r.version})`).join(', ');
  await sql('policy_acceptances').insert({
    context, name: name || null, email, phone: phone || null, reference: reference || null, policies: list.slice(0, 255),
    ip: (req?.ip || '').slice(0, 64), user_agent: String(req?.get?.('User-Agent') || '').slice(0, 255),
  });
  const when = new Date().toISOString();
  const what = context === 'membership' ? 'membership application' : 'enquiry';
  await db.$transaction(async (tx) => {
    await enqueue(tx, email, 'Gulsaga — your acceptance of our Terms & Policies',
      `Hello ${name || ''},\n\nThis confirms you accepted the following with your ${what} on ${when}:\n${list}\n\nYou can read them any time on our website.\n\n— Gulsaga`);
    if (adminTo) await enqueue(tx, adminTo, `Terms accepted — ${name || email} (${what})`,
      `Name: ${name || '-'}\nEmail: ${email}\nPhone: ${phone || '-'}\nFor: ${what}${reference ? ` (${reference})` : ''}\nAccepted: ${list}\nTime: ${when}\nIP: ${req?.ip || '-'}`);
  });
  processOutbox().catch(() => {});
}

export function createPublicPolicyRouter({ db, sql, config }) {
  const router = express.Router();
  const limit = rateLimit({ windowMs: 15 * 60000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
  router.get('/', async (req, res) => {
    await ensure(sql);
    res.json((await sql('legal_policies').orderBy('slug')).map((r) => view(r)));
  });
  router.get('/:slug', async (req, res) => {
    await ensure(sql);
    const r = await sql('legal_policies').where({ slug: req.params.slug }).first();
    if (!r) throw fail(404, 'Policy not found.');
    res.json(view(r, true));
  });
  router.get('/:slug/pdf', async (req, res) => {
    await ensure(sql);
    const r = await sql('legal_policies').where({ slug: req.params.slug }).first();
    const file = r?.pdf_id && (await db.uploadedFile.findFirst({ where: { id: r.pdf_id, purpose: 'POLICY' } }));
    if (!file) throw fail(404, 'PDF not found.');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="policy.pdf"');
    res.send(await readFile(file));
  });
  router.post('/accept', limit, async (req, res) => {
    const data = z.object({
      context: z.enum(['enquiry', 'membership']), name: z.string().trim().min(2).max(120), email: z.string().trim().toLowerCase().email().max(255),
      phone: z.string().trim().max(30).optional(), reference: z.string().trim().max(80).optional(), accepted: z.boolean(),
    }).strict().parse(req.body);
    await recordAcceptance({ db, sql }, { ...data, req, adminTo: config.COMPANY_NOTIFICATION_EMAIL });
    res.status(201).json({ ok: true });
  });
  return router;
}

export function createAdminPolicyRouter({ db, sql, audit, upload }) {
  const router = express.Router();
  const actor = (req) => String(req.user?.email || req.user?.name || 'admin').slice(0, 120);
  router.get('/', async (req, res) => {
    await ensure(sql);
    res.json((await sql('legal_policies').orderBy('slug')).map((r) => view(r, true)));
  });
  router.put('/:slug', async (req, res) => {
    await ensure(sql);
    const data = z.object({ title: z.string().trim().min(2).max(160), body: z.string().max(200000) }).strict().parse(req.body);
    const cur = await sql('legal_policies').where({ slug: req.params.slug }).first();
    if (!cur) throw fail(404, 'Policy not found.');
    await sql('legal_policies').where({ slug: cur.slug }).update({ ...data, version: cur.version + 1, updated_by: actor(req), updated_at: sql.fn.now() });
    await audit(db, req.user, 'UPDATE_POLICY', cur.slug);
    res.json(view(await sql('legal_policies').where({ slug: cur.slug }).first(), true));
  });
  router.post('/:slug/pdf', upload.single('file'), async (req, res) => {
    await ensure(sql);
    const cur = await sql('legal_policies').where({ slug: req.params.slug }).first();
    if (!cur) throw fail(404, 'Policy not found.');
    const stored = await saveFile(req.file, 'POLICY');
    try {
      const row = await db.uploadedFile.create({ data: { ...stored, published: false } });
      await sql('legal_policies').where({ slug: cur.slug }).update({ pdf_id: row.id, pdf_name: stored.originalName, version: cur.version + 1, updated_by: actor(req), updated_at: sql.fn.now() });
    } catch (e) { await removeFile(stored); throw e; }
    await audit(db, req.user, 'UPLOAD_POLICY_PDF', cur.slug);
    res.json(view(await sql('legal_policies').where({ slug: cur.slug }).first(), true));
  });
  router.delete('/:slug/pdf', async (req, res) => {
    await ensure(sql);
    const cur = await sql('legal_policies').where({ slug: req.params.slug }).first();
    if (!cur) throw fail(404, 'Policy not found.');
    await sql('legal_policies').where({ slug: cur.slug }).update({ pdf_id: null, pdf_name: null, version: cur.version + 1, updated_by: actor(req), updated_at: sql.fn.now() });
    res.json(view(await sql('legal_policies').where({ slug: cur.slug }).first(), true));
  });
  router.get('/acceptances/log', async (req, res) => {
    await ensure(sql);
    const rows = await sql('policy_acceptances').orderBy('id', 'desc').limit(500);
    res.json(rows.map((r) => ({ id: r.id, context: r.context, name: r.name, email: r.email, phone: r.phone, reference: r.reference, policies: r.policies, ip: r.ip, at: r.created_at })));
  });
  return router;
}
