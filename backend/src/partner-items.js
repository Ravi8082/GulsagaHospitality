// Partner portal extras: offers, experiences, media, team, support tickets, payouts, reviews and reports.
import express from 'express';
import { z } from 'zod';
import { fail } from './security.js';

const id = z.coerce.number().int().positive();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optionalDay = day.or(z.literal('')).default('');
const text = (max) => z.string().trim().max(max);
const safeUrl = z.string().trim().max(600).refine((v) => /^https:\/\//.test(v) || v.startsWith('/api/public/media/') || v.startsWith('/membership/'), 'Use an https link or an uploaded file.');

const dataSchemas = {
  offer: z.object({ image: safeUrl.or(z.literal('')).default(''), description: text(1000).default(''), discountPercent: z.number().int().min(0).max(90).default(0), price: z.number().int().min(0).max(100000000).default(0), validFrom: optionalDay, validTo: optionalDay }).strict(),
  experience: z.object({ image: safeUrl.or(z.literal('')).default(''), description: text(1000).default(''), price: z.number().int().min(0).max(100000000).default(0), duration: text(60).default(''), capacity: z.number().int().min(1).max(1000).default(1) }).strict(),
  media: z.object({ url: safeUrl, type: z.enum(['image', 'video']).default('image'), caption: text(200).default('') }).strict(),
  team: z.object({ email: z.string().trim().email().max(255), phone: text(30).default(''), role: z.enum(['Manager', 'Reservations', 'Front Desk', 'Accounts']).default('Reservations') }).strict(),
  ticket: z.object({ category: z.enum(['Booking', 'Payout', 'Technical', 'Property update', 'Other']).default('Other'), priority: z.enum(['Low', 'Normal', 'High']).default('Normal'), message: text(2000).min(3) }).strict(),
  payout: z.object({ amount: z.number().int().min(0).max(1000000000), periodStart: day, periodEnd: day, method: text(40).default('Bank transfer'), reference: text(80).default('') }).strict(),
  review: z.object({ rating: z.number().int().min(1).max(5), comment: text(1000).default('') }).strict(),
};
const partnerKinds = ['offer', 'experience', 'media', 'team', 'ticket'];
const deletableKinds = ['offer', 'experience', 'media', 'team'];
const adminKinds = ['payout', 'review'];
const allowedStatus = {
  offer: ['APPROVED', 'REJECTED', 'PENDING'], experience: ['APPROVED', 'REJECTED', 'PENDING'], media: ['APPROVED', 'REJECTED', 'PENDING'], team: ['APPROVED', 'REJECTED', 'PENDING'],
  ticket: ['OPEN', 'ANSWERED', 'CLOSED'], payout: ['PENDING', 'PROCESSING', 'PAID'], review: ['PUBLISHED', 'HIDDEN'],
};
const asDate = (column) => `DATE_FORMAT(${column}, '%Y-%m-%d')`;

const dto = (row) => ({ id: row.id, kind: row.kind, title: row.title, status: row.status, data: JSON.parse(row.data), reviewNote: row.review_note, createdAt: row.created_at });

export const reviewStats = async (sql, resortId) => {
  const rows = await sql('partner_items').where({ resort_id: resortId, kind: 'review', status: 'PUBLISHED' }).select('data');
  const ratings = rows.map((r) => JSON.parse(r.data).rating).filter(Number.isFinite);
  return { reviews: ratings.length, averageRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null };
};

export function registerPartnerItems(property, { sql, upload, saveImage, alertAdmin }) {
  property.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) throw fail(400, 'Choose an image to upload.');
    res.status(201).json({ url: await saveImage(req.file) });
  });

  property.get('/items', async (req, res) => {
    const kind = z.enum([...partnerKinds, ...adminKinds]).parse(req.query.kind);
    const rows = await sql('partner_items').where({ resort_id: req.resortId, kind }).orderBy('id', 'desc').limit(200);
    res.json({ rows: rows.map(dto) });
  });

  property.post('/items', async (req, res) => {
    const d = z.object({ kind: z.enum(partnerKinds), title: text(200).min(2), data: z.record(z.unknown()) }).strict().parse(req.body);
    const data = dataSchemas[d.kind].parse(d.data);
    const [itemId] = await sql('partner_items').insert({ resort_id: req.resortId, kind: d.kind, title: d.title, data: JSON.stringify(data), status: d.kind === 'ticket' ? 'OPEN' : 'PENDING', created_by: req.partner.id });
    alertAdmin?.(req.resortId, `New partner ${d.kind}`, `"${d.title}" was submitted and is waiting for approval.`);
    res.status(201).json({ id: itemId });
  });

  property.delete('/items/:itemId', async (req, res) => {
    const removed = await sql('partner_items').where({ id: id.parse(req.params.itemId), resort_id: req.resortId }).whereIn('kind', deletableKinds).delete();
    if (!removed) throw fail(404, 'Item not found.');
    res.status(204).end();
  });

  property.get('/reports', async (req, res) => {
    const bookings = await sql('partner_bookings as b').leftJoin('partner_rooms as r', 'r.id', 'b.room_id').where('b.resort_id', req.resortId)
      .select('b.status', 'b.amount', 'b.guests', 'r.name as roomName', sql.raw(`${asDate('b.check_in')} AS checkIn`), sql.raw(`${asDate('b.check_out')} AS checkOut`));
    const rooms = await sql('partner_rooms').where({ resort_id: req.resortId, active: true }).select('total_units');
    const units = rooms.reduce((sum, room) => sum + room.total_units, 0);
    const earning = bookings.filter((b) => ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(b.status));
    const nights = (b) => Math.max(0, Math.round((new Date(b.checkOut) - new Date(b.checkIn)) / 86400000));
    const today = new Date(new Date().toISOString().slice(0, 10));
    const monthly = [];
    for (let back = 5; back >= 0; back -= 1) {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - back, 1));
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
      const days = (end - start) / 86400000;
      const inMonth = bookings.filter((b) => b.status !== 'CANCELLED' && new Date(b.checkIn) < end && new Date(b.checkOut) > start);
      const usedNights = inMonth.reduce((sum, b) => sum + Math.max(0, Math.round((Math.min(new Date(b.checkOut), end) - Math.max(new Date(b.checkIn), start)) / 86400000)), 0);
      const startedHere = earning.filter((b) => new Date(b.checkIn) >= start && new Date(b.checkIn) < end);
      monthly.push({ month: start.toISOString().slice(0, 7), bookings: startedHere.length, revenue: startedHere.reduce((s, b) => s + b.amount, 0), occupancy: units ? Math.min(100, Math.round((usedNights / (units * days)) * 100)) : null });
    }
    const byRoom = {};
    for (const b of earning) {
      const key = b.roomName ?? 'Not assigned';
      byRoom[key] ??= { room: key, bookings: 0, revenue: 0 };
      byRoom[key].bookings += 1;
      byRoom[key].revenue += b.amount;
    }
    const paid = await sql('partner_items').where({ resort_id: req.resortId, kind: 'payout', status: 'PAID' }).select('data');
    const earned = earning.reduce((s, b) => s + b.amount, 0);
    const paidOut = paid.reduce((s, r) => s + (JSON.parse(r.data).amount ?? 0), 0);
    res.json({
      totals: { bookings: bookings.length, cancelled: bookings.filter((b) => b.status === 'CANCELLED').length, earned, paidOut, balance: Math.max(0, earned - paidOut), averageValue: earning.length ? Math.round(earned / earning.length) : 0, averageStay: earning.length ? Math.round((earning.reduce((s, b) => s + nights(b), 0) / earning.length) * 10) / 10 : 0 },
      monthly,
      rooms: Object.values(byRoom).sort((a, b) => b.revenue - a.revenue),
    });
  });
}

export function registerPartnerItemsAdmin(router, { sql }) {
  router.get('/items', async (req, res) => {
    const q = z.object({ kind: z.enum([...partnerKinds, ...adminKinds]).optional(), status: text(20).optional() }).parse(req.query);
    const query = sql('partner_items as i').join('resorts as r', 'r.id', 'i.resort_id').orderBy('i.id', 'desc').limit(200).select('i.*', 'r.name as resortName');
    if (q.kind) query.where('i.kind', q.kind);
    if (q.status) query.where('i.status', q.status);
    res.json({ rows: (await query).map((row) => ({ ...dto(row), resortId: row.resort_id, resortName: row.resortName })) });
  });

  router.post('/items', async (req, res) => {
    const d = z.object({ resortId: id, kind: z.enum(adminKinds), title: text(200).min(2), status: text(20).optional(), data: z.record(z.unknown()) }).strict().parse(req.body);
    if (!(await sql('resorts').where({ id: d.resortId }).first('id'))) throw fail(404, 'Property not found.');
    const status = d.status ?? (d.kind === 'payout' ? 'PENDING' : 'PUBLISHED');
    if (!allowedStatus[d.kind].includes(status)) throw fail(400, 'Invalid status.');
    const [itemId] = await sql('partner_items').insert({ resort_id: d.resortId, kind: d.kind, title: d.title, data: JSON.stringify(dataSchemas[d.kind].parse(d.data)), status, reviewed_by: req.user.email });
    res.status(201).json({ id: itemId });
  });

  router.patch('/items/:itemId', async (req, res) => {
    const d = z.object({ status: text(20), note: text(1000).optional() }).strict().parse(req.body);
    const row = await sql('partner_items').where({ id: id.parse(req.params.itemId) }).first();
    if (!row) throw fail(404, 'Item not found.');
    if (!allowedStatus[row.kind].includes(d.status)) throw fail(400, 'Invalid status for this item.');
    await sql('partner_items').where({ id: row.id }).update({ status: d.status, reviewed_by: req.user.email, ...(d.note !== undefined ? { review_note: d.note || null } : {}) });
    res.json({ id: row.id, status: d.status });
  });

  router.delete('/items/:itemId', async (req, res) => {
    if (!(await sql('partner_items').where({ id: id.parse(req.params.itemId) }).delete())) throw fail(404, 'Item not found.');
    res.status(204).end();
  });
}
