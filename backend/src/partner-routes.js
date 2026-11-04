// Partner portal API: JWT sign-in, property-scoped operations and the administrator approval queue.
import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { fail } from './security.js';
import { signToken, bearerToken, verifyToken } from './jwt.js';
import * as schemas from './validation.js';
import { generatePassword } from './passwords.js';
import { paymentMap } from './whatsapp.js';
import { applyBookingStatus } from './partner-bookings.js';
import { registerPartnerItems, registerPartnerItemsAdmin, reviewStats } from './partner-items.js';
import { registerPartnerProfile, registerPartnerBranches, createResort } from './partner-profile.js';

const id = z.coerce.number().int().positive();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const safeUrl = z.string().trim().max(600).refine((v) => /^https:\/\//.test(v) || v.startsWith('/api/public/media/'), 'Use an https link or an uploaded file.');
const roomBody = z.object({ name: z.string().trim().min(2).max(160), description: z.string().max(2000).optional().default(''), capacity: z.number().int().min(1).max(50), totalUnits: z.number().int().min(1).max(500), baseRate: z.number().int().min(0).max(10000000), amenities: z.array(z.string().max(80)).max(40).default([]), active: z.boolean().default(true), imageUrl: safeUrl.or(z.literal('')).default('') }).strict();
const bookingBody = z.object({ roomId: id.nullable().optional(), guestName: z.string().trim().min(2).max(160), guestContact: z.string().max(255).optional().default(''), checkIn: day, checkOut: day, guests: z.number().int().min(1).max(100).default(1), amount: z.number().int().min(0).max(100000000).default(0), status: z.enum(['PENDING', 'CONFIRMED']).default('PENDING') }).strict().refine((b) => b.checkOut > b.checkIn, 'Check-out must be after check-in.');
const enquiryBody = z.object({ kind: z.enum(['General', 'Wedding', 'Corporate', 'Group', 'Art Residency']).default('General'), name: z.string().trim().min(2).max(160), contact: z.string().max(255).optional().default(''), message: z.string().max(2000).optional().default(''), followUpOn: day.nullable().optional() }).strict();
const propertyChange = z.object({ description: z.string().max(4000).optional(), website: safeUrl.optional(), imageUrl: safeUrl.optional(), category: z.string().trim().min(2).max(80).optional() }).strict().refine((v) => Object.keys(v).length > 0, 'Change at least one field.');
const asDate = (column) => `DATE_FORMAT(${column}, '%Y-%m-%d')`;

const nightsInside = (booking, start, end) => {
  const from = Math.max(new Date(booking.check_in).getTime(), start.getTime());
  const to = Math.min(new Date(booking.check_out).getTime(), end.getTime());
  return Math.max(0, Math.round((to - from) / 86400000));
};

export function createPartnerRouter({ sql, notify, upload, saveImage, adminMail }) {
  const resortLabel = async (id) => (await sql('resorts').where({ id }).first('name'))?.name || `Resort ${id}`;
  // Fire-and-forget head-office alert by email and WhatsApp; never blocks or fails the partner's request.
  const alertAdmin = (resortId, subject, body) => {
    Promise.resolve().then(async () => {
      const text = `${await resortLabel(resortId)}: ${body}`;
      await Promise.allSettled([adminMail?.(`${subject} — Gulsaga`, `${text}\n\nOpen Admin > Partner activity to review.`), notify?.adminAlert?.(`${subject}. ${text}`)]);
    }).catch((e) => console.error('Admin alert failed:', e.message));
  };
  // WhatsApp alerts are best-effort: never let them fail or slow down a portal request.
  const wa = (task) => { Promise.resolve().then(() => task(notify)).catch((e) => console.error('WhatsApp hook failed:', e.message)); };
  // Adds the Razorpay payment status (set for WhatsApp bookings) to booking rows shown in the portal.
  const withPayment = async (rows) => { const pay = await paymentMap(sql, rows.map((r) => r.id)).catch(() => new Map()); return rows.map((r) => ({ ...r, paymentStatus: pay.get(r.id)?.status ?? null })); };
  const router = express.Router();

  router.post('/login', async (req, res) => {
    const data = schemas.login.parse(req.body);
    const user = await sql('partner_users').where({ email: data.email }).first();
    const valid = await bcrypt.compare(data.password, user?.password_hash || '$2b$12$1jOC05eoEJhhBTTDHXeQfeDbTmULoSKGHJSYXHb35RKLYBU3OV6H.');
    if (!user || !user.enabled || !valid) throw fail(401, 'Invalid email or password.');
    res.json({ token: signToken({ sub: user.id, typ: 'partner', v: user.session_version }), partner: partnerDTO(user), properties: await properties(user.id) });
  });

  const partnerDTO = (u) => ({ id: u.id, name: u.name, email: u.email, mustChangePassword: Boolean(u.must_change_password) });

  const properties = (partnerId) => sql('partner_property_access as a').join('resorts as r', 'r.id', 'a.resort_id').leftJoin('partner_profiles as p', 'p.resort_id', 'r.id').where('a.partner_user_id', partnerId).orderBy('r.id').select('r.id', 'r.name', 'r.location', 'r.image_url as imageUrl', 'r.category', 'r.description', 'r.website', 'r.listed', 'p.logo_url as logoUrl');

  router.use(async (req, res, next) => {
    try {
      const claims = verifyToken(bearerToken(req), 'partner');
      const user = claims ? await sql('partner_users').where({ id: claims.sub }).first() : null;
      if (!user || !user.enabled || user.session_version !== claims.v) throw fail(401, 'Please sign in.');
      req.partner = user;
      next();
    } catch (error) {
      next(error);
    }
  });

  router.get('/me', async (req, res) => res.json({ partner: partnerDTO(req.partner), properties: await properties(req.partner.id) }));

  router.post('/change-password', async (req, res) => {
    const d = z.object({ currentPassword: z.string().min(1).max(128), password: schemas.password }).strict().parse(req.body);
    if (!(await bcrypt.compare(d.currentPassword, req.partner.password_hash))) throw fail(400, 'Your current password is not correct.');
    if (d.currentPassword === d.password) throw fail(400, 'Choose a password different from the current one.');
    await sql('partner_users').where({ id: req.partner.id }).update({ password_hash: await bcrypt.hash(d.password, 12), must_change_password: false, session_version: sql.raw('session_version + 1') });
    const user = await sql('partner_users').where({ id: req.partner.id }).first();
    res.json({ token: signToken({ sub: user.id, typ: 'partner', v: user.session_version }), partner: partnerDTO(user) });
  });

  router.use('/properties', (req, res, next) => next(req.partner.must_change_password ? fail(403, 'Change your temporary password before continuing.') : undefined));

  registerPartnerBranches(router, { sql, properties });

  // Every property route is limited to the properties assigned to the signed-in partner.
  const property = express.Router({ mergeParams: true });
  router.use('/properties/:resortId', async (req, res, next) => {
    try {
      const resortId = id.parse(req.params.resortId);
      const access = await sql('partner_property_access').where({ partner_user_id: req.partner.id, resort_id: resortId }).first();
      if (!access) throw fail(403, 'You do not have access to this property.');
      req.resortId = resortId;
      next();
    } catch (error) {
      next(error);
    }
  }, property);

  const ownRoom = async (req) => {
    const room = await sql('partner_rooms').where({ id: id.parse(req.params.roomId), resort_id: req.resortId }).first();
    if (!room) throw fail(404, 'Room not found.');
    return room;
  };

  registerPartnerItems(property, { sql, upload, saveImage, alertAdmin });
  registerPartnerProfile(property, { sql });

  property.get('/overview', async (req, res) => {
    const resort = await sql('resorts').where({ id: req.resortId }).first();
    const bookings = await sql('partner_bookings').where({ resort_id: req.resortId }).select('id', 'status', 'guests', 'amount', sql.raw(`${asDate('check_in')} AS check_in`), sql.raw(`${asDate('check_out')} AS check_out`));
    const rooms = await sql('partner_rooms').where({ resort_id: req.resortId, active: true }).select('total_units');
    const units = rooms.reduce((sum, room) => sum + room.total_units, 0);
    const live = bookings.filter((b) => b.status !== 'CANCELLED');
    const counts = Object.fromEntries(['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'PENDING'].map((s) => [s, bookings.filter((b) => b.status === s).length]));
    const today = new Date(new Date().toISOString().slice(0, 10));
    const monthly = [];
    for (let back = 5; back >= 0; back -= 1) {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - back, 1));
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
      const days = (end - start) / 86400000;
      const nights = live.reduce((sum, b) => sum + nightsInside(b, start, end), 0);
      monthly.push({ month: start.toISOString().slice(0, 7), occupancy: units ? Math.min(100, Math.round((nights / (units * days)) * 100)) : null });
    }
    const [pendingEnquiries] = await sql('partner_enquiries').where({ resort_id: req.resortId, status: 'NEW' }).count({ n: '*' });
    const recentEnquiries = await sql('partner_enquiries').where({ resort_id: req.resortId }).orderBy('id', 'desc').limit(4).select('id', 'kind', 'name', 'message', 'status', 'created_at');
    const recentBookings = await sql('partner_bookings as b').leftJoin('partner_rooms as r', 'r.id', 'b.room_id').where('b.resort_id', req.resortId).orderBy('b.id', 'desc').limit(5).select('b.id', 'b.guest_name as guestName', 'r.name as roomName', 'b.amount', 'b.status', sql.raw(`${asDate('b.check_in')} AS checkIn`), sql.raw(`${asDate('b.check_out')} AS checkOut`));
    res.json({
      property: { id: resort.id, name: resort.name, location: resort.location, category: resort.category, imageUrl: resort.image_url },
      totals: { bookings: bookings.length, guests: live.reduce((s, b) => s + b.guests, 0), revenue: bookings.filter((b) => ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(b.status)).reduce((s, b) => s + b.amount, 0), occupancy: monthly.at(-1).occupancy, ...(await reviewStats(sql, req.resortId)) },
      snapshot: counts,
      monthly,
      pendingBookings: counts.PENDING,
      newEnquiries: Number(pendingEnquiries.n),
      recentBookings: await withPayment(recentBookings),
      recentEnquiries,
    });
  });

  property.get('/rooms', async (req, res) => {
    const rooms = await sql('partner_rooms').where({ resort_id: req.resortId }).orderBy('id');
    const live = await sql('partner_bookings').where({ resort_id: req.resortId }).whereIn('status', ['CONFIRMED', 'CHECKED_IN']).whereRaw('check_in <= CURDATE() AND check_out > CURDATE()').groupBy('room_id').select('room_id').count({ n: '*' });
    const upcoming = await sql('partner_bookings').where({ resort_id: req.resortId }).whereIn('status', ['PENDING', 'CONFIRMED']).whereRaw('check_in >= CURDATE()').groupBy('room_id').select('room_id').count({ n: '*' });
    const by = (list) => new Map(list.map((x) => [x.room_id, Number(x.n)]));
    const tonight = by(live); const next = by(upcoming);
    res.json({ rows: rooms.map((r) => ({ ...r, amenities: r.amenities ? JSON.parse(r.amenities) : [], occupiedTonight: Math.min(r.total_units, tonight.get(r.id) ?? 0), upcomingBookings: next.get(r.id) ?? 0 })) });
  });
  property.patch('/rooms/:roomId/rate', async (req, res) => {
    const room = await ownRoom(req);
    const d = z.object({ percent: z.number().int().min(-90).max(300) }).strict().parse(req.body);
    const baseRate = Math.max(0, Math.round(room.base_rate * (1 + d.percent / 100)));
    await sql('partner_rooms').where({ id: room.id }).update({ base_rate: baseRate });
    res.json({ id: room.id, baseRate });
  });
  property.post('/rooms', async (req, res) => {
    const d = roomBody.parse(req.body);
    const [roomId] = await sql('partner_rooms').insert({ resort_id: req.resortId, name: d.name, description: d.description, capacity: d.capacity, total_units: d.totalUnits, base_rate: d.baseRate, amenities: JSON.stringify(d.amenities), active: d.active, image_url: d.imageUrl || null });
    res.status(201).json({ id: roomId });
  });
  property.put('/rooms/:roomId', async (req, res) => {
    const room = await ownRoom(req);
    const d = roomBody.parse(req.body);
    await sql('partner_rooms').where({ id: room.id }).update({ name: d.name, description: d.description, capacity: d.capacity, total_units: d.totalUnits, base_rate: d.baseRate, amenities: JSON.stringify(d.amenities), active: d.active, image_url: d.imageUrl || null });
    res.json({ id: room.id });
  });
  property.delete('/rooms/:roomId', async (req, res) => {
    const room = await ownRoom(req);
    await sql.transaction(async (trx) => { await trx('room_inventory').where({ room_id: room.id }).delete(); await trx('partner_rooms').where({ id: room.id }).delete(); });
    res.json({ id: room.id });
  });

  property.get('/rooms/:roomId/inventory', async (req, res) => {
    const room = await ownRoom(req);
    const range = z.object({ from: day, to: day }).parse(req.query);
    const rows = await sql('room_inventory').where({ room_id: room.id }).whereBetween('stay_date', [range.from, range.to]).orderBy('stay_date').select(sql.raw(`${asDate('stay_date')} AS date`), 'available_units as availableUnits', 'stop_sell as stopSell', 'min_stay as minStay', 'rate');
    res.json({ room: { id: room.id, totalUnits: room.total_units, baseRate: room.base_rate }, rows });
  });
  property.put('/rooms/:roomId/inventory', async (req, res) => {
    const room = await ownRoom(req);
    const d = z.object({ dates: z.array(day).min(1).max(366), availableUnits: z.number().int().min(0).max(room.total_units), stopSell: z.boolean().default(false), minStay: z.number().int().min(1).max(30).default(1), rate: z.number().int().min(0).max(10000000).nullable().default(null) }).strict().parse(req.body);
    await sql.transaction(async (trx) => {
      for (const date of d.dates) await trx('room_inventory').insert({ room_id: room.id, stay_date: date, available_units: d.availableUnits, stop_sell: d.stopSell, min_stay: d.minStay, rate: d.rate }).onConflict(['room_id', 'stay_date']).merge();
    });
    res.json({ updated: d.dates.length });
  });

  property.get('/bookings', async (req, res) => res.json({ rows: await withPayment(await sql('partner_bookings as b').leftJoin('partner_rooms as r', 'r.id', 'b.room_id').where('b.resort_id', req.resortId).orderBy('b.id', 'desc').limit(200).select('b.id', 'b.guest_name as guestName', 'b.guest_contact as guestContact', 'r.name as roomName', 'b.room_id as roomId', 'b.guests', 'b.amount', 'b.status', 'b.inventory_held as inventoryHeld', sql.raw(`${asDate('b.check_in')} AS checkIn`), sql.raw(`${asDate('b.check_out')} AS checkOut`))) }));
  property.post('/bookings', async (req, res) => {
    const d = bookingBody.parse(req.body);
    if (d.roomId && !(await sql('partner_rooms').where({ id: d.roomId, resort_id: req.resortId }).first())) throw fail(400, 'Choose a room from this property.');
    const bookingId = await sql.transaction(async (trx) => {
      const [newId] = await trx('partner_bookings').insert({ resort_id: req.resortId, room_id: d.roomId ?? null, guest_name: d.guestName, guest_contact: d.guestContact, check_in: d.checkIn, check_out: d.checkOut, guests: d.guests, amount: d.amount, status: 'PENDING' });
      if (d.status !== 'PENDING') await applyBookingStatus(trx, { id: newId, resort_id: req.resortId, check_in: d.checkIn, check_out: d.checkOut, room_id: null, inventory_held: false }, d.status, d.roomId ?? null);
      return newId;
    });
    wa((n) => n?.bookingCreated(req.resortId, { id: bookingId, guestName: d.guestName, guestContact: d.guestContact, checkIn: d.checkIn, checkOut: d.checkOut, guests: d.guests, status: d.status }));
    alertAdmin(req.resortId, 'New partner booking', `BK-${bookingId} for ${d.guestName}, ${d.checkIn} to ${d.checkOut}, ${d.guests} guest(s).`);
    res.status(201).json({ id: bookingId });
  });
  property.patch('/bookings/:bookingId', async (req, res) => {
    const d = z.object({ status: z.enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']), roomId: id.nullable().optional() }).strict().parse(req.body);
    const bookingId = id.parse(req.params.bookingId);
    const result = await sql.transaction(async (trx) => {
      const booking = await trx('partner_bookings').where({ id: bookingId, resort_id: req.resortId }).forUpdate().first();
      if (!booking) throw fail(404, 'Booking not found.');
      let roomId = d.roomId !== undefined ? d.roomId : booking.room_id;
      if (!roomId && ['CONFIRMED', 'CHECKED_IN'].includes(d.status)) {
        const active = await trx('partner_rooms').where({ resort_id: req.resortId, active: true }).select('id');
        if (active.length === 1) roomId = active[0].id;
      }
      return applyBookingStatus(trx, booking, d.status, roomId ?? null);
    });
    wa((n) => n?.bookingStatus(req.resortId, bookingId));
    res.json({ status: d.status, ...result });
  });
  property.get('/enquiries', async (req, res) => res.json({ rows: await sql('partner_enquiries').where({ resort_id: req.resortId }).orderBy('id', 'desc').limit(200).select('id', 'kind', 'name', 'contact', 'message', 'status', 'created_at', sql.raw(`${asDate('follow_up_on')} AS followUpOn`)) }));
  property.post('/enquiries', async (req, res) => {
    const d = enquiryBody.parse(req.body);
    const [enquiryId] = await sql('partner_enquiries').insert({ resort_id: req.resortId, kind: d.kind, name: d.name, contact: d.contact, message: d.message, follow_up_on: d.followUpOn ?? null });
    wa((n) => n?.enquiryCreated(req.resortId, { kind: d.kind, name: d.name, contact: d.contact, message: d.message }));
    alertAdmin(req.resortId, 'New partner enquiry', `${d.kind} enquiry from ${d.name} (${d.contact || 'no contact'}).`);
    res.status(201).json({ id: enquiryId });
  });
  property.patch('/enquiries/:enquiryId', async (req, res) => {
    const d = z.object({ status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED']).optional(),     followUpOn: day.nullable().optional(), message: z.string().max(2000).optional() }).strict().parse(req.body);
        const update = { ...(d.status ? { status: d.status } : {}), ...(d.message !== undefined ? { message: d.message } : {}), ...(d.followUpOn !== undefined ? { follow_up_on: d.followUpOn } : {}) };
    if (!Object.keys(update).length) throw fail(400, 'Nothing to update.');
    const changed = await sql('partner_enquiries').where({ id: id.parse(req.params.enquiryId), resort_id: req.resortId }).update(update);
    if (!changed) throw fail(404, 'Enquiry not found.');
    res.json(update);
  });

  // Public property details change only after a Gulsaga administrator approves the request.
  property.get('/change-requests', async (req, res) => res.json({ rows: (await sql('partner_change_requests').where({ resort_id: req.resortId }).orderBy('id', 'desc').limit(50)).map((r) => ({ id: r.id, status: r.status, reviewNote: r.review_note, createdAt: r.created_at, payload: JSON.parse(r.payload) })) }));
  property.post('/change-requests', async (req, res) => {
    const payload = propertyChange.parse(req.body);
    const [requestId] = await sql('partner_change_requests').insert({ resort_id: req.resortId, entity: 'property', payload: JSON.stringify(payload), submitted_by: req.partner.id });
    alertAdmin(req.resortId, 'Property change request', 'The partner submitted property changes for approval.');
    res.status(201).json({ id: requestId, status: 'PENDING' });
  });

  return router;
}

// Administrator side: create partner accounts, assign properties and review change requests.
export function createPartnerAdminRouter({ sql }) {
  const router = express.Router();
  const link = async (trx, partnerId, resortIds) => {
    await trx('partner_property_access').where({ partner_user_id: partnerId }).delete();
    for (const resortId of resortIds) await trx('partner_property_access').insert({ partner_user_id: partnerId, resort_id: resortId });
  };
  const body = z.object({ resortIds: z.array(id).max(50) });
  const newProperty = z.object({ name: z.string().trim().min(2).max(180), location: z.string().trim().min(2).max(180), category: z.string().trim().max(80).optional() }).strict();

  router.get('/', async (req, res) => {
    const users = await sql('partner_users').orderBy('id', 'desc').select('id', 'name', 'email', 'enabled', 'created_at');
    const access = await sql('partner_property_access as a').join('resorts as r', 'r.id', 'a.resort_id').select('a.partner_user_id', 'r.id', 'r.name', 'r.listed');
    res.json({ rows: users.map((u) => { const own = access.filter((a) => a.partner_user_id === u.id); return { ...u, resortIds: own.map((a) => a.id), properties: own.map((a) => ({ id: a.id, name: a.name, listed: Boolean(a.listed) })) }; }) });
  });
  router.post('/', async (req, res) => {
    const d = body.extend({ name: z.string().trim().min(2).max(120), email: schemas.email, newProperty: newProperty.optional() }).strict().parse(req.body);
    if (!d.resortIds.length && !d.newProperty) throw fail(400, 'Enter the property name and location, or pick an existing property.');
    const password = generatePassword();
    const hashed = await bcrypt.hash(password, 12);
    const partnerId = await sql.transaction(async (trx) => {
      if (await trx('partner_users').where({ email: d.email }).first()) throw fail(409, 'A partner with this email already exists.');
      const [created] = await trx('partner_users').insert({ name: d.name, email: d.email, password_hash: hashed, must_change_password: true });
      const resortIds = [...d.resortIds];
      if (d.newProperty) resortIds.push(await createResort(trx, d.newProperty));
      await link(trx, created, resortIds);
      return created;
    });
    res.status(201).json({ id: partnerId, temporaryPassword: password });
  });
  router.put('/properties/:resortId/listed', async (req, res) => {
    const resortId = id.parse(req.params.resortId);
    const d = z.object({ listed: z.boolean() }).strict().parse(req.body);
    if (!(await sql('resorts').where({ id: resortId }).update({ listed: d.listed }))) throw fail(404, 'Property not found.');
    res.json({ id: resortId, listed: d.listed });
  });
  router.post('/:id/reset-password', async (req, res) => {
    const partnerId = id.parse(req.params.id);
    const password = generatePassword();
    const changed = await sql('partner_users').where({ id: partnerId }).update({ password_hash: await bcrypt.hash(password, 12), must_change_password: true, session_version: sql.raw('session_version + 1') });
    if (!changed) throw fail(404, 'Partner not found.');
    res.json({ id: partnerId, temporaryPassword: password });
  });
  router.delete('/:id', async (req, res) => {
    const partnerId = id.parse(req.params.id);
    await sql.transaction(async (trx) => {
      await trx('partner_property_access').where({ partner_user_id: partnerId }).delete();
      if (!(await trx('partner_users').where({ id: partnerId }).delete())) throw fail(404, 'Partner not found.');
    });
    res.status(204).end();
  });
  router.put('/:id', async (req, res) => {
    const partnerId = id.parse(req.params.id);
    const d = body.extend({ enabled: z.boolean(), password: schemas.password.optional() }).strict().parse(req.body);
    await sql.transaction(async (trx) => {
      const update = { enabled: d.enabled, session_version: sql.raw('session_version + 1') };
      if (d.password) update.password_hash = await bcrypt.hash(d.password, 12);
      if (!(await trx('partner_users').where({ id: partnerId }).update(update))) throw fail(404, 'Partner not found.');
      await link(trx, partnerId, d.resortIds);
    });
    res.json({ id: partnerId });
  });

  registerPartnerItemsAdmin(router, { sql });

  router.get('/change-requests', async (req, res) => res.json({ rows: (await sql('partner_change_requests as c').join('resorts as r', 'r.id', 'c.resort_id').orderBy('c.id', 'desc').limit(100).select('c.id', 'c.status', 'c.payload', 'c.review_note', 'c.created_at', 'r.name as resortName')).map((r) => ({ ...r, payload: JSON.parse(r.payload) })) }));
  router.post('/change-requests/:id/:decision', async (req, res) => {
    const requestId = id.parse(req.params.id);
    const decision = z.enum(['approve', 'reject']).parse(req.params.decision);
    const note = z.object({ note: z.string().max(500).optional() }).strict().parse(req.body ?? {}).note ?? null;
    await sql.transaction(async (trx) => {
      const row = await trx('partner_change_requests').where({ id: requestId, status: 'PENDING' }).forUpdate().first();
      if (!row) throw fail(404, 'Pending request not found.');
      if (decision === 'approve') {
        const p = propertyChange.parse(JSON.parse(row.payload));
        const update = { ...(p.description !== undefined ? { description: p.description } : {}), ...(p.website !== undefined ? { website: p.website } : {}), ...(p.imageUrl !== undefined ? { image_url: p.imageUrl } : {}), ...(p.category !== undefined ? { category: p.category } : {}) };
        const before = await trx('resorts').where({ id: row.resort_id }).first();
        await trx('resorts').where({ id: row.resort_id }).update(update);
        await trx('collection_changes').insert({ collection: 'resorts', record_id: String(row.resort_id), action: 'APPROVED', before_data: JSON.stringify(before), after_data: JSON.stringify({ ...before, ...update }), admin_id: req.user.id, admin_email: req.user.email });
      }
      await trx('partner_change_requests').where({ id: requestId }).update({ status: decision === 'approve' ? 'APPROVED' : 'REJECTED', reviewed_by: req.user.email, review_note: note, reviewed_at: new Date() });
    });
    res.json({ id: requestId, status: decision === 'approve' ? 'APPROVED' : 'REJECTED' });
  });

  return router;
}
