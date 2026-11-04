import express from 'express';
import { backsFor, ensureBacks } from './member-backs.js';

const BOOKED = ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'];
const month = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}` };

export function createAdminOpsRouter({ db, sql, audit, adminMail, notify, config }) {
  const router = express.Router();

  router.get('/members', async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 80);
    const status = String(req.query.status || '').toUpperCase();
    const where = {};
    if (q) where.OR = [{ email: { contains: q } }, { displayName: { contains: q } }, { membershipApplication: { is: { phone: { contains: q } } } }];
    if (status === 'NONE') where.membershipApplication = { is: null };
    else if (['PENDING', 'ACTIVE', 'REJECTED', 'EXPIRED'].includes(status)) where.membershipApplication = { is: { status } };
    const rows = await db.communityUser.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 200,
      select: { id: true, email: true, displayName: true, enabled: true, createdAt: true, membershipApplication: { select: { plan: true, status: true, memberCode: true, phone: true, city: true, years: true, decidedAt: true } } },
    });
    res.json({ rows });
  });

  router.patch('/members/:id', async (req, res) => {
    const enabled = req.body?.enabled;
    if (typeof enabled !== 'boolean') return res.status(400).json({ message: 'enabled must be true or false.' });
    const row = await db.communityUser.update({ where: { id: String(req.params.id) }, data: { enabled }, select: { id: true, enabled: true } });
    await audit(db, req.user, enabled ? 'ENABLE_MEMBER' : 'DISABLE_MEMBER', row.id);
    res.json(row);
  });

  router.get('/bookings', async (req, res) => {
    const status = String(req.query.status || '').toUpperCase();
    const q = String(req.query.q || '').trim().slice(0, 80);
    const base = () => sql('partner_bookings as b').leftJoin('resorts as r', 'r.id', 'b.resort_id').leftJoin('partner_rooms as m', 'm.id', 'b.room_id');
    const query = base().orderBy('b.id', 'desc').limit(300).select('b.id', 'b.guest_name as guest', 'b.guest_contact as contact', 'r.name as resort', 'm.name as room', 'b.guests', 'b.amount', 'b.status', sql.raw("DATE_FORMAT(b.check_in,'%Y-%m-%d') AS checkIn"), sql.raw("DATE_FORMAT(b.check_out,'%Y-%m-%d') AS checkOut"));
    if (status) query.where('b.status', status);
    if (q) query.where((w) => w.where('b.guest_name', 'like', `%${q}%`).orWhere('r.name', 'like', `%${q}%`).orWhere('b.guest_contact', 'like', `%${q}%`));
    const [rows, totals] = await Promise.all([query, sql('partner_bookings').select('status').count({ n: '*' }).sum({ amount: 'amount' }).groupBy('status')]);
    const apps = await db.membershipApplication.findMany({ where: { status: 'ACTIVE' }, select: { phone: true, fullName: true, plan: true, memberCode: true } });
    const byTail = new Map(apps.map((a) => [String(a.phone).replace(/\D/g, '').slice(-10), a]));
    for (const r of rows) {
      const m = byTail.get(String(r.contact || '').replace(/\D/g, '').slice(-10));
      r.member = m && String(r.contact || '').replace(/\D/g, '').length >= 10 ? { name: m.fullName, plan: m.plan, code: m.memberCode } : null;
    }
    res.json({
      rows,
      summary: {
        byStatus: Object.fromEntries(totals.map((t) => [t.status, Number(t.n)])),
        revenue: totals.filter((t) => BOOKED.includes(t.status)).reduce((a, t) => a + Number(t.amount || 0), 0),
      },
    });
  });

  router.get('/alerts', async (req, res) => {
    const since = Math.max(0, Number(req.query.since) || 0);
    const [latest, fresh, items] = await Promise.all([
      sql('partner_bookings').max({ id: 'id' }).first(),
      sql('partner_bookings').where('id', '>', since).count({ n: '*' }).first(),
      sql('partner_bookings as b').leftJoin('resorts as r', 'r.id', 'b.resort_id').orderBy('b.id', 'desc').limit(8).select('b.id', 'b.guest_name as guest', 'r.name as resort', 'b.status', 'b.amount', 'b.guests', 'b.created_at as createdAt', sql.raw("DATE_FORMAT(b.check_in,'%Y-%m-%d') AS checkIn"), sql.raw("DATE_FORMAT(b.check_out,'%Y-%m-%d') AS checkOut")),
    ]);
    res.json({ latestId: Number(latest?.id || 0), fresh: Number(fresh?.n || 0), items });
  });

  router.get('/activity', async (req, res) => {
    const kind = String(req.query.kind || '');
    const lim = Math.min(200, Math.max(10, Number(req.query.limit) || 80));
    const name = (q) => q.leftJoin('resorts as r', 'r.id', 'x.resort_id').select('r.name as resort');
    const [items, enq, books, rooms, profiles, changes] = await Promise.all([
      name(sql('partner_items as x')).select('x.id', 'x.kind', 'x.title', 'x.status', 'x.data', 'x.review_note as note', 'x.created_at as at').orderBy('x.id', 'desc').limit(lim),
      name(sql('partner_enquiries as x')).select('x.id', 'x.kind', 'x.name', 'x.contact', 'x.message', 'x.status', 'x.created_at as at').orderBy('x.id', 'desc').limit(lim),
      name(sql('partner_bookings as x')).select('x.id', 'x.guest_name as name', 'x.guest_contact as contact', 'x.guests', 'x.status', 'x.amount', 'x.created_at as at', sql.raw("DATE_FORMAT(x.check_in,'%d %b') AS ci"), sql.raw("DATE_FORMAT(x.check_out,'%d %b') AS co")).orderBy('x.id', 'desc').limit(lim),
      name(sql('partner_rooms as x')).select('x.id', 'x.name', 'x.updated_at as at').orderBy('x.updated_at', 'desc').limit(30),
      name(sql('partner_profiles as x')).select('x.resort_id as id', 'x.updated_at as at').orderBy('x.updated_at', 'desc').limit(30),
      name(sql('partner_change_requests as x')).select('x.id', 'x.entity', 'x.status', 'x.created_at as at').orderBy('x.id', 'desc').limit(lim),
    ]);
    const asObj = (v) => { if (!v) return {}; if (typeof v === 'object') return v; try { return JSON.parse(v) } catch { return {} } };
    const row = (type, id, at, resort, title, detail, status, extra = {}) => ({ key: `${type}-${id}`, type, at, resort: resort || 'Partner property', title, detail: detail || '', status: status || null, ...extra });
    const rupee = (n) => (Number(n) ? `₹${Number(n).toLocaleString('en-IN')}` : 'Quote pending');
    const all = [
      ...items.map((i) => row(i.kind === 'offer' ? 'offer' : 'item', `i${i.id}`, i.at, i.resort, i.kind === 'offer' ? `New offer: ${i.title}` : `New ${i.kind}: ${i.title}`, '', i.status, { itemId: i.id, kind: i.kind, fields: asObj(i.data), note: i.note || '' })),
      ...enq.map((e) => row('enquiry', `e${e.id}`, e.at, e.resort, `${e.kind || 'General'} enquiry from ${e.name}`, String(e.message || '').slice(0, 140), e.status, { fields: { Name: e.name, Contact: e.contact, Type: e.kind, Message: e.message } })),
      ...books.map((b) => row('booking', `b${b.id}`, b.at, b.resort, `Booking BK-${b.id} · ${b.name}`, `${b.ci} → ${b.co}${Number(b.amount) ? ` · ${rupee(b.amount)}` : ''}`, b.status, { fields: { Guest: b.name, Contact: b.contact, Guests: b.guests, Stay: `${b.ci} → ${b.co}`, Amount: rupee(b.amount) } })),
      ...rooms.map((r) => row('room', `r${r.id}`, r.at, r.resort, `Room updated: ${r.name}`, '')),
      ...profiles.map((p) => row('profile', `p${p.id}`, p.at, p.resort, 'Property profile updated', '')),
      ...changes.map((c) => row('change', `c${c.id}`, c.at, c.resort, `Change request: ${c.entity}`, '', c.status)),
    ].filter((a) => a.at && (!kind || a.type === kind)).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, lim);
    const counts = {};
    for (const a of all) counts[a.type] = (counts[a.type] || 0) + 1;
    res.json({ rows: all, counts, pendingItems: Number((await sql('partner_items').where({ status: 'PENDING' }).count({ n: '*' }).first())?.n || 0) });
  });

  router.get('/partner-enquiries', async (req, res) => {
    const status = String(req.query.status || '');
    const q = String(req.query.q || '').trim().slice(0, 80);
    const query = sql('partner_enquiries as e').leftJoin('resorts as r', 'r.id', 'e.resort_id').orderBy('e.id', 'desc').limit(300).select('e.id', 'e.kind', 'e.name', 'e.contact', 'e.message', 'e.status', 'e.created_at as createdAt', 'r.name as resort', sql.raw("DATE_FORMAT(e.follow_up_on,'%Y-%m-%d') AS followUpOn"));
    if (status) query.where('e.status', status);
    if (q) query.where((w) => w.where('e.name', 'like', `%${q}%`).orWhere('e.contact', 'like', `%${q}%`).orWhere('r.name', 'like', `%${q}%`));
    res.json({ rows: await query });
  });

  router.get('/members/:id/backs', async (req, res) => res.json(await backsFor(sql, String(req.params.id))));

  router.post('/members/:id/backs', async (req, res) => {
    const kind = String(req.body?.kind || '').toUpperCase();
    const amount = Number(req.body?.amount);
    const note = String(req.body?.note || '').trim().slice(0, 255) || null;
    if (!['ELIGIBLE', 'CREDIT'].includes(kind)) return res.status(400).json({ message: 'Choose Eligible booking or Credited.' });
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) return res.status(400).json({ message: 'Enter a valid amount.' });
    const user = await db.communityUser.findUnique({ where: { id: String(req.params.id) }, select: { id: true } });
    if (!user) return res.status(404).json({ message: 'Member not found.' });
    await ensureBacks(sql);
    await sql('member_backs').insert({ user_id: user.id, kind, amount, note, created_by: req.user.email });
    await audit(db, req.user, `BACK_${kind}`, user.id);
    res.status(201).json(await backsFor(sql, user.id));
  });

  router.delete('/members/:id/backs/:entryId', async (req, res) => {
    await ensureBacks(sql);
    await sql('member_backs').where({ id: Number(req.params.entryId), user_id: String(req.params.id) }).delete();
    await audit(db, req.user, 'BACK_DELETE', String(req.params.id));
    res.json(await backsFor(sql, String(req.params.id)));
  });

  router.get('/members/:id', async (req, res) => {
    const m = await db.communityUser.findUnique({ where: { id: String(req.params.id) }, select: { id: true, email: true, displayName: true, enabled: true, createdAt: true, membershipApplication: true, experiences: { select: { id: true, title: true, status: true, createdAt: true }, take: 10, orderBy: { createdAt: 'desc' } } } });
    if (!m) return res.status(404).json({ message: 'Member not found.' });
    const tail = String(m.membershipApplication?.phone || '').replace(/\D/g, '').slice(-10);
    const bookings = tail.length === 10
      ? await sql('partner_bookings as b').leftJoin('resorts as r', 'r.id', 'b.resort_id').whereRaw("RIGHT(REGEXP_REPLACE(b.guest_contact,'[^0-9]',''),10) = ?", [tail]).orderBy('b.id', 'desc').limit(20).select('b.id', 'r.name as resort', 'b.status', 'b.amount', sql.raw("DATE_FORMAT(b.check_in,'%Y-%m-%d') AS checkIn"), sql.raw("DATE_FORMAT(b.check_out,'%Y-%m-%d') AS checkOut"))
      : [];
    res.json({ ...m, bookings });
  });

  router.get('/reviews', async (_req, res) => {
    const [partner, member] = await Promise.all([
      sql('partner_items as x').leftJoin('resorts as r', 'r.id', 'x.resort_id').where('x.kind', 'review').orderBy('x.id', 'desc').limit(200).select('x.id', 'x.title', 'x.status', 'x.data', 'x.created_at as at', 'r.name as resort'),
      db.memberExperience.findMany({ orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, title: true, status: true, overallRating: true, hospitalityRating: true, cleanlinessRating: true, locationRating: true, amenitiesRating: true, foodRating: true, resortId: true, createdAt: true, user: { select: { displayName: true } } } }),
    ]);
    const resorts = new Map((await sql('resorts').select('id', 'name')).map((r) => [r.id, r.name]));
    const parse = (s) => { try { return JSON.parse(s) } catch { return {} } };
    const partnerRows = partner.map((p) => { const d = parse(p.data); return { id: p.id, source: 'partner', title: p.title, resort: p.resort, rating: Number(d.rating) || 0, comment: d.comment || '', status: p.status, at: p.at } });
    const memberRows = member.map((m) => ({ id: m.id, source: 'member', title: m.title, resort: m.resortId ? resorts.get(m.resortId) ?? null : null, author: m.user?.displayName ?? '', rating: m.overallRating, status: m.status, at: m.createdAt }));
    const avg = (xs) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
    const live = [...partnerRows.filter((r) => r.status === 'PUBLISHED'), ...memberRows.filter((r) => r.status === 'APPROVED')];
    const byResort = {};
    for (const r of live) if (r.resort && r.rating) (byResort[r.resort] ||= []).push(r.rating);
    const distribution = [5, 4, 3, 2, 1].map((s) => ({ stars: s, count: live.filter((r) => r.rating === s).length }));
    res.json({
      average: avg(live.map((r) => r.rating).filter(Boolean)), total: live.length, distribution,
      resorts: Object.entries(byResort).map(([name, xs]) => ({ name, average: avg(xs), count: xs.length })).sort((a, b) => (b.average ?? 0) - (a.average ?? 0)),
      rows: [...partnerRows, ...memberRows].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 200),
    });
  });

  router.get('/media', async (_req, res) => {
    const parse = (s) => { try { return JSON.parse(s) } catch { return {} } };
    const rows = (await sql('partner_items as x').leftJoin('resorts as r', 'r.id', 'x.resort_id').where('x.kind', 'media').orderBy('x.id', 'desc').limit(300).select('x.id', 'x.title', 'x.status', 'x.data', 'x.review_note as note', 'x.created_at as at', 'r.name as resort'))
      .map((m) => { const d = parse(m.data); return { id: m.id, title: m.title, status: m.status, note: m.note, at: m.at, resort: m.resort, url: d.url || '', type: d.type || 'image', caption: d.caption || '' } });
    const files = await db.uploadedFile.groupBy({ by: ['purpose'], _count: { _all: true }, _sum: { size: true } });
    res.json({ rows, storage: files.map((f) => ({ purpose: f.purpose, files: f._count._all, bytes: f._sum.size ?? 0 })) });
  });

  router.get('/system', async (_req, res) => {
    const numbers = (process.env.WHATSAPP_ADMIN_NUMBERS || '').split(',').map((x) => x.trim()).filter(Boolean);
    const mask = (v) => (v.length > 4 ? `${'•'.repeat(v.length - 4)}${v.slice(-4)}` : v);
    const emails = await db.emailNotification.findMany({ orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, recipient: true, subject: true, state: true, attempts: true, lastError: true, createdAt: true } });
    let whatsapp = [];
    try { whatsapp = await sql('whatsapp_messages').whereIn('kind', ['alert', 'booking', 'enquiry']).where('direction', 'out').orderBy('id', 'desc').limit(30).select('id', 'phone', 'kind', 'body', 'status', 'created_at as at'); } catch { whatsapp = []; }
    res.json({
      channels: {
        email: { configured: Boolean(config?.MAIL_PROVIDER), provider: config?.MAIL_PROVIDER ?? null, to: config?.COMPANY_NOTIFICATION_EMAIL ?? null },
        whatsapp: { configured: Boolean(process.env.OPENWA_API_KEY && process.env.OPENWA_SESSION_ID), adminNumbers: numbers.map(mask) },
      },
      env: { frontendUrl: config?.FRONTEND_URL ?? null, node: process.version },
      emails, whatsapp,
    });
  });

  router.post('/system/test-alert', async (req, res) => {
    const text = 'Test alert from Gulsaga admin. If you can read this, alerts are working.';
    const result = await Promise.allSettled([adminMail?.('Test alert — Gulsaga', text), notify?.adminAlert?.(text)]);
    await audit(db, req.user, 'TEST_ALERT', 'system');
    res.json({ email: result[0]?.status ?? 'skipped', whatsapp: result[1]?.status ?? 'skipped' });
  });

  router.get('/reports', async (_req, res) => {
    const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1); since.setHours(0, 0, 0, 0);
    const [bookings, perResort, users, apps, contacts, partnerEnq, resorts] = await Promise.all([
      sql('partner_bookings').select('amount', 'status', 'created_at', 'check_in', 'check_out'),
      sql('partner_bookings as b').leftJoin('resorts as r', 'r.id', 'b.resort_id').whereIn('b.status', BOOKED).groupBy('r.name').select('r.name as resort').count({ n: '*' }).sum({ amount: 'b.amount' }).orderBy('amount', 'desc').limit(8),
      db.communityUser.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      db.membershipApplication.findMany({ select: { plan: true, status: true } }),
      db.contactSubmission.groupBy({ by: ['type'], _count: { _all: true } }),
      sql('partner_enquiries').select('kind').count({ n: '*' }).groupBy('kind'),
      sql('resorts').count({ n: '*' }).first(),
    ]);
    const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(since); d.setMonth(d.getMonth() + i); return month(d) });
    const revenueBy = Object.fromEntries(months.map((m) => [m, 0]));
    const bookingsBy = { ...revenueBy };
    const usersBy = { ...revenueBy };
    let nights = 0;
    for (const b of bookings) {
      const m = month(b.created_at);
      if (m in bookingsBy) bookingsBy[m] += 1;
      if (BOOKED.includes(b.status)) {
        if (m in revenueBy) revenueBy[m] += Number(b.amount || 0);
        nights += Math.max(0, Math.round((new Date(b.check_out) - new Date(b.check_in)) / 864e5)) || 0;
      }
    }
    for (const u of users) { const m = month(u.createdAt); if (m in usersBy) usersBy[m] += 1 }
    const planCount = {};
    for (const a of apps.filter((x) => x.status === 'ACTIVE')) planCount[a.plan] = (planCount[a.plan] || 0) + 1;
    const confirmed = bookings.filter((b) => BOOKED.includes(b.status));
    const cancelled = bookings.filter((b) => b.status === 'CANCELLED').length;
    res.json({
      kpi: {
        revenue: confirmed.reduce((a, b) => a + Number(b.amount || 0), 0),
        bookings: bookings.length,
        avgBooking: confirmed.length ? Math.round(confirmed.reduce((a, b) => a + Number(b.amount || 0), 0) / confirmed.length) : 0,
        nights,
        cancellationRate: bookings.length ? Math.round((cancelled / bookings.length) * 100) : 0,
        resorts: Number(resorts?.n || 0),
        pendingMemberships: apps.filter((a) => a.status === 'PENDING').length,
      },
      months: months.map((m) => ({ month: m, revenue: revenueBy[m], bookings: bookingsBy[m], signups: usersBy[m] })),
      topResorts: perResort.map((r) => ({ resort: r.resort || 'Unknown', bookings: Number(r.n), revenue: Number(r.amount || 0) })),
      plans: Object.entries(planCount).map(([plan, count]) => ({ plan, count })),
      enquiryTypes: [
        ...contacts.map((c) => ({ type: c.type, count: c._count._all, source: 'Website' })),
        ...partnerEnq.map((p) => ({ type: p.kind, count: Number(p.n), source: 'Partner' })),
      ],
    });
  });

  return router;
}
