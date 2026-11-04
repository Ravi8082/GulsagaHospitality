// Partner brand/profile data (logo, map address, facts) and self-service branch creation.
import { z } from 'zod';
import { fail } from './security.js';

const str = (max) => z.string().trim().max(max);
const text = (max) => str(max).optional().default('');
const safeUrl = z.string().trim().max(600).refine((v) => /^https:\/\//.test(v) || v.startsWith('/api/public/media/'), 'Use an https link or an uploaded file.');
const coord = (min, max) => z.number().min(min).max(max).nullable().optional();

const details = z.object({
  totalRooms: z.number().int().min(0).max(5000).nullable().default(null),
  checkIn: text(20),
  checkOut: text(20),
  roomTypes: z.array(str(80)).max(30).default([]),
  roomAmenities: z.array(str(80)).max(40).default([]),
  distances: z.array(z.object({ label: str(120), distance: text(40), time: text(40) })).max(20).default([]),
  dining: z.array(z.object({ name: str(120), description: text(600) })).max(20).default([]),
  banquet: z.object({ available: z.boolean().default(false), capacity: z.number().int().min(0).max(100000).nullable().default(null), description: text(1000) }).default({}),
  recreation: z.array(str(80)).max(30).default([]),
  sightseeing: z.array(z.object({ name: str(120), distance: text(40), description: text(600) })).max(30).default([]),
  policies: text(2000),
}).default({});

export const profileBody = z.object({
  logoUrl: safeUrl.or(z.literal('')).default(''),
  tagline: text(200),
  address: text(500),
  city: text(120),
  state: text(120),
  pincode: text(12),
  lat: coord(-90, 90),
  lng: coord(-180, 180),
  contactPhone: text(40),
  contactEmail: z.string().trim().max(255).email().or(z.literal('')).default(''),
  details,
}).strict();

const branchBody = z.object({
  name: str(180).min(2),
  location: str(180).min(2),
  category: text(80),
  profile: profileBody.partial().default({}),
}).strict();

const slugify = (value) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'property';

const toRow = (resortId, p) => ({
  resort_id: resortId,
  logo_url: p.logoUrl || null,
  tagline: p.tagline || null,
  address: p.address || null,
  city: p.city || null,
  state: p.state || null,
  pincode: p.pincode || null,
  lat: p.lat ?? null,
  lng: p.lng ?? null,
  contact_phone: p.contactPhone || null,
  contact_email: p.contactEmail || null,
  details: JSON.stringify(p.details ?? {}),
});

export const emptyProfile = { logoUrl: '', tagline: '', address: '', city: '', state: '', pincode: '', lat: null, lng: null, contactPhone: '', contactEmail: '', details: details.parse(undefined) };

const fromRow = (r) => {
  if (!r) return emptyProfile;
  let parsed = {};
  try { parsed = JSON.parse(r.details || '{}'); } catch { parsed = {}; }
  const safe = details.safeParse(parsed);
  return {
    logoUrl: r.logo_url ?? '', tagline: r.tagline ?? '', address: r.address ?? '', city: r.city ?? '', state: r.state ?? '', pincode: r.pincode ?? '',
    lat: r.lat === null ? null : Number(r.lat), lng: r.lng === null ? null : Number(r.lng),
    contactPhone: r.contact_phone ?? '', contactEmail: r.contact_email ?? '', details: safe.success ? safe.data : emptyProfile.details,
  };
};

// New properties stay unlisted (hidden from the public site and the WhatsApp assistant) until an administrator publishes them.
export async function createResort(trx, { name, location, category = '', profile = {} }) {
  const base = slugify(`${name} ${location}`);
  let slug = base;
  for (let n = 2; await trx('resorts').where({ slug }).first('id'); n += 1) slug = `${base}-${n}`;
  const [resortId] = await trx('resorts').insert({ slug, name, location, category: category || 'Associate Property', listed: false });
  const parsed = profileBody.parse(profile);
  await trx('partner_profiles').insert(toRow(resortId, { ...parsed, city: parsed.city || location }));
  return resortId;
}

export function registerPartnerProfile(property, { sql }) {
  property.get('/profile', async (req, res) => {
    res.json({ profile: fromRow(await sql('partner_profiles').where({ resort_id: req.resortId }).first()) });
  });
  property.put('/profile', async (req, res) => {
    const d = profileBody.parse(req.body);
    if ((d.lat === null || d.lat === undefined) !== (d.lng === null || d.lng === undefined)) throw fail(400, 'Set both latitude and longitude, or leave both empty.');
    await sql('partner_profiles').insert(toRow(req.resortId, d)).onConflict('resort_id').merge();
    res.json({ profile: d });
  });
}

// Lets a partner add another branch or product; it stays hidden until Gulsaga publishes it.
export function registerPartnerBranches(router, { sql, properties }) {
  router.post('/properties', async (req, res) => {
    const d = branchBody.parse(req.body);
    const resortId = await sql.transaction(async (trx) => {
      const created = await createResort(trx, d);
      await trx('partner_property_access').insert({ partner_user_id: req.partner.id, resort_id: created });
      return created;
    });
    const rows = await properties(req.partner.id);
    res.status(201).json({ id: resortId, properties: rows });
  });
}

// Only properties a partner manages and the admin has published; no address, phone or email.
export async function getPublicPartnerProperties({ sql }) {
  const rows = await sql('resorts as r')
    .join('partner_profiles as p', 'p.resort_id', 'r.id')
    .where('r.listed', true)
    .orderBy('r.id', 'asc')
    .select('r.id', 'r.name', 'r.slug', 'r.location', 'r.category', 'r.description', 'r.image_url as imageUrl', 'p.logo_url as logoUrl', 'p.tagline', 'p.city', 'p.state');
  return rows;
}