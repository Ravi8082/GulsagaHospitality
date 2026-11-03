// WhatsApp integration through OpenWA (https://github.com/rmyndharis/OpenWA).
//
// How it fits together:
//   WhatsApp user ──► OpenWA ──(webhook "message.received")──► POST /api/public/whatsapp/webhook (this file)
//   this file ──(POST /api/sessions/:id/messages/send-text)──► OpenWA ──► WhatsApp user   (auto-reply)
//   admin panel ──► POST /api/admin/whatsapp/bulk ──(send-bulk, paced)──► OpenWA            (bulk messages)
//
// OpenWA is a separate service (default http://127.0.0.1:2785). Configure it with the OPENWA_* variables in .env.
import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { fail } from './security.js';

// ---- Configuration (read at call time so tests / .env reloads work) ----
const cfg = () => ({
  baseUrl: (process.env.OPENWA_BASE_URL || 'http://127.0.0.1:2785').replace(/\/+$/, ''),
  apiKey: process.env.OPENWA_API_KEY || '',
  sessionId: process.env.OPENWA_SESSION_ID || '',
  webhookSecret: process.env.OPENWA_WEBHOOK_SECRET || '',
  countryCode: process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '91',
  autoReply: process.env.WHATSAPP_AUTO_REPLY !== 'false',
  // Gap between bulk messages. OpenWA allows 1000-60000 ms; a slower pace lowers the risk of a WhatsApp ban.
  bulkDelayMs: Math.min(60000, Math.max(1000, Number(process.env.WHATSAPP_BULK_DELAY_MS || 5000))),
  // Razorpay payment links sent inside the WhatsApp booking chat (test or live keys from the Razorpay dashboard).
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  advancePercent: Math.min(100, Math.max(1, Number(process.env.WHATSAPP_ADVANCE_PERCENT || 30))),
});

// ---- Auto-reply rules: first rule whose keyword appears in the incoming text wins ----
// Edit this list to change what the bot answers. `{{name}}` is replaced with the sender's WhatsApp name.
export const replyRules = [
  { keywords: ['stop', 'unsubscribe', 'band'], optOut: true, reply: 'You have been unsubscribed from Gulsaga messages. Send START any time to rejoin.' },
  { keywords: ['start', 'subscribe'], optIn: true, reply: 'Welcome back! You will receive Gulsaga updates again.' },
  { keywords: ['hi', 'hello', 'hey', 'namaste'], reply: 'Namaste {{name}}! Welcome to Gulsaga Hospitality 🌿\nReply BOOK to plan a stay, MEMBERSHIP for our plans, STATUS for your booking, TEAM to talk to us – or just ask me anything.' },
  { keywords: ['booking', 'book', 'reservation'], reply: 'Happy to help you book! Please share the resort, your dates and number of guests, and our team will confirm shortly. You can also use {{site}}/contact' },
  { keywords: ['contact', 'help', 'support'], reply: 'Our team will get back to you soon. You can also reach us at {{site}}/contact' },
];
const site = () => (process.env.FRONTEND_URL || 'https://gulsaga.com').replace(/\/+$/, '');
const fallbackReply = 'Thanks for messaging Gulsaga! Ask me about any resort or destination, or reply BOOKING. Our team will follow up shortly.';

// Pure function so it is easy to unit test: returns the matching rule or null.
export function matchRule(text) {
  const words = String(text || '').toLowerCase().split(/[^a-z0-9\u0900-\u097f]+/).filter(Boolean);
  return replyRules.find((rule) => rule.keywords.some((k) => words.includes(k))) || null;
}

// ---- Phone / chat id helpers ----
// OpenWA addresses people as "<digits>@c.us". Accepts "+91 98765-43210", "9876543210" or an existing chat id.
export function toChatId(input, countryCode = '91') {
  const raw = String(input || '').trim();
  if (raw.endsWith('@c.us') || raw.endsWith('@lid')) return raw; // @lid = privacy-masked WhatsApp id; must be answered as-is
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 10) digits = countryCode + digits; // local number without country code
  if (digits.length < 11 || digits.length > 15) return null;
  return `${digits}@c.us`;
}
const phoneOf = (chatId) => String(chatId).replace('@c.us', ''); // @lid ids keep their suffix so replies go to the right chat

// ---- Signature check ----
// OpenWA sends "X-OpenWA-Signature: sha256=<hex HMAC of the raw body using the webhook secret>".
export function verifySignature(rawBody, header, secret) {
  if (!secret || !header || !rawBody) return false;
  const expected = Buffer.from('sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex'));
  const given = Buffer.from(String(header));
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

// ---- OpenWA HTTP client ----
async function openwa(path, { method = 'GET', body } = {}) {
  const c = cfg();
  if (!c.apiKey || !c.sessionId) throw fail(503, 'WhatsApp is not configured. Set OPENWA_API_KEY and OPENWA_SESSION_ID.');
  let res;
  try {
    res = await fetch(`${c.baseUrl}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-API-Key': c.apiKey },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw fail(502, 'OpenWA is not reachable. Make sure it is running.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw fail(502, `OpenWA error ${res.status}: ${data.message || 'request failed'}`);
  return data;
}
export const sendText = (chatId, text) =>
  openwa(`/sessions/${cfg().sessionId}/messages/send-text`, { method: 'POST', body: { chatId, text } });

// ---- Storage: two small tables, created on first use so no Prisma migration is needed ----
//   whatsapp_contacts: people we may message (opted_in = 1 means allowed to receive bulk messages)
//   whatsapp_messages: log of every inbound / outbound message
let tablesReady;
function ensureTables(sql) {
  tablesReady ||= (async () => {
    if (!(await sql.schema.hasTable('whatsapp_contacts'))) {
      await sql.schema.createTable('whatsapp_contacts', (t) => {
        t.string('phone', 20).primary();
        t.string('name', 120).nullable();
        t.boolean('opted_in').notNullable().defaultTo(true);
        t.timestamp('created_at').defaultTo(sql.fn.now());
        t.timestamp('updated_at').defaultTo(sql.fn.now());
      });
    }
    if (!(await sql.schema.hasTable('whatsapp_partner_numbers'))) {
      // Staff phone numbers of each partner property: they receive booking/enquiry alerts and can reply CONFIRM/CANCEL.
      await sql.schema.createTable('whatsapp_partner_numbers', (t) => {
        t.increments('id');
        t.integer('resort_id').notNullable().index();
        t.string('phone', 20).notNullable();
        t.string('name', 120).nullable();
        t.unique(['resort_id', 'phone']);
      });
    }
    if (!(await sql.schema.hasTable('whatsapp_sessions'))) {
      // Conversation state for the guest booking / membership flows.
      await sql.schema.createTable('whatsapp_sessions', (t) => {
        t.string('phone', 30).primary();
        t.string('flow', 20).notNullable();
        t.string('step', 20).notNullable();
        t.text('data').nullable();
        t.timestamp('updated_at').defaultTo(sql.fn.now());
      });
    }
    if (!(await sql.schema.hasTable('whatsapp_payments'))) {
      // One Razorpay payment link per WhatsApp booking; status is refreshed by the poller below.
      await sql.schema.createTable('whatsapp_payments', (t) => {
        t.increments('id');
        t.integer('booking_id').notNullable().index();
        t.string('link_id', 60).nullable().unique(); // empty until the guest taps CONFIRM NOW / PAY
        t.string('short_url', 255).nullable();
        t.integer('amount').notNullable(); // rupees
        t.string('status', 20).notNullable().defaultTo('created'); // requested (partner set the amount) | created (link sent) | paid | expired | cancelled
        t.timestamp('created_at').defaultTo(sql.fn.now());
        t.timestamp('paid_at').nullable();
      });
    } else {
      // Older installs created these two columns NOT NULL; a "requested" payment has no link yet.
      await sql.raw('ALTER TABLE whatsapp_payments MODIFY link_id VARCHAR(60) NULL, MODIFY short_url VARCHAR(255) NULL').catch(() => {});
    }
    if (!(await sql.schema.hasTable('whatsapp_messages'))) {
      await sql.schema.createTable('whatsapp_messages', (t) => {
        t.increments('id');
        t.string('phone', 20).notNullable().index();
        t.string('direction', 10).notNullable(); // 'in' | 'out'
        t.string('kind', 12).notNullable(); // 'message' | 'auto-reply' | 'bulk'
        t.text('body').nullable();
        t.string('external_id', 120).nullable().unique(); // OpenWA message id: stops duplicate webhook retries
        t.string('status', 20).notNullable().defaultTo('ok');
        t.timestamp('created_at').defaultTo(sql.fn.now());
      });
    }
  })().catch((e) => { tablesReady = undefined; throw e; });
  return tablesReady;
}
const upsertContact = (sql, phone, name, optedIn) =>
  sql('whatsapp_contacts')
    .insert({ phone, name: name || null, opted_in: optedIn })
    .onConflict('phone')
    .merge(name ? { name, opted_in: optedIn, updated_at: sql.fn.now() } : { opted_in: optedIn, updated_at: sql.fn.now() });

// ---- AI replies ----
// Works with any OpenAI-compatible chat API (OpenAI, Groq, OpenRouter, Ollama...). Configure with AI_* in .env.
// If AI_API_KEY is empty or the call fails, the caller falls back to the keyword rules above.
const defaultPrompt =
  'You are the WhatsApp assistant of Gulsaga Hospitality, an Indian hospitality brand with resorts, destinations (Uttarakhand, Goa, Rajasthan, Himachal, Kerala), experiences and a membership programme. ' +
  'Answer any question helpfully and briefly (max 80 words), in the same language the guest uses (Hindi, Hinglish or English). ' +
  'For prices, availability or bookings you cannot confirm, say our team will follow up and point to https://gulsaga.com/contact. Never invent prices, policies or properties: only recommend resorts from the list below; if the guest asks for a place not in the list, say we do not have it there yet.';

// Real properties from the database, appended to the AI prompt.
async function resortContext(sql) {
  const rows = await sql('resorts').select('name', 'location', 'category', 'stars').orderBy('sort_order').limit(60).catch(() => []);
  return rows.length ? '\n\nOur resorts:\n' + rows.map((r) => `- ${r.name} (${r.location}, ${r.stars} star, ${r.category})`).join('\n') : '';
}

export async function aiReply(history, text, context = '') {
  const key = process.env.AI_API_KEY;
  const base = process.env.AI_BASE_URL;
  if (!key && !base) return null; // neither a key nor a keyless endpoint configured: AI is off
  try {
    const res = await fetch(`${(base || 'https://api.openai.com/v1').replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 300,
        // `context` carries real resort data from our database so the model does not invent properties.
        messages: [{ role: 'system', content: `${process.env.AI_SYSTEM_PROMPT || defaultPrompt}${context}` }, ...history, { role: 'user', content: text }],
      }),
      signal: AbortSignal.timeout(8000), // free AI can hang; fall back to DB/keyword answers quickly
    });
    if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
    const data = await res.json();
    return String(data.choices?.[0]?.message?.content || '').trim().slice(0, 1500) || null;
  } catch (e) {
    console.error('AI reply failed, using keyword fallback:', e.message);
    return null;
  }
}

// Last few messages of this chat so the AI understands follow-up questions.
async function recentHistory(sql, phone) {
  const rows = await sql('whatsapp_messages').where({ phone }).whereIn('kind', ['message', 'auto-reply']).orderBy('id', 'desc').limit(6);
  return rows.reverse().map((r) => ({ role: r.direction === 'in' ? 'user' : 'assistant', content: String(r.body || '') }));
}

// ---- Knowledge replies straight from the database (no external AI needed) ----
// Answers "tell me about <resort>", "resorts in Goa", "which resorts do you have" using the resorts table.
const stop = new Set(['the', 'in', 'at', 'of', 'and', 'a', 'to', 'is', 'resort', 'resorts', 'hotel', 'hotels', 'stay', 'want', 'best', 'another', 'other', 'you', 'have', 'any', 'for', 'can', 'what', 'which', 'show', 'tell', 'about', 'please', 'need', 'looking', 'good', 'ok', 'okay', 'hai', 'kya', 'mujhe', 'chahiye']);
const editDistance = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
// Deterministic, database-only answers for "resorts in <destination>" and "show other destinations".
// Tolerates typos ("kerla" -> Kerala). Runs BEFORE the AI so these common questions are instant and never invented.
export async function destinationReply(sql, text) {
  const t = String(text || '').toLowerCase();
  const words = t.split(/[^a-z]+/).filter((w) => w.length > 2 && !stop.has(w));
  const rows = (await sql('resorts').select('name', 'location', 'category', 'stars').orderBy('sort_order').limit(100)).filter((r) => !/global/i.test(r.location || ''));
  const destOf = (r) => String(r.location || '').split(',').pop().trim();
  const dests = [...new Set(rows.map(destOf))];
  const matches = (d, w) => d.toLowerCase().split(/\s+/).some((p) => p === w || (w.length >= 4 && (p.includes(w) || (p.length >= 4 && editDistance(p, w) <= 1))));
  const dest = dests.find((d) => words.some((w) => matches(d, w)));
  if (dest) {
    const list = rows.filter((r) => destOf(r) === dest).slice(0, 8).map((r) => `• ${r.name} – ${r.location} (${r.stars}★)`).join('\n');
    const others = dests.filter((d) => d !== dest).join(', ');
    return `Our stays in ${dest}:\n${list}\n\nReply BOOK to plan your stay here.\nOther destinations: ${others}.`;
  }
  if (/destin|another|other places|more places|where|kahan|kaha|konsi jagah/.test(t)) {
    return `We have stays in these destinations:\n${dests.map((d) => `• ${d}`).join('\n')}\n\nReply with a destination name to see its resorts, or BOOK to plan a stay.`;
  }
  return null;
}

export async function knowledgeReply(sql, text) {
  const byDestination = await destinationReply(sql, text);
  if (byDestination) return byDestination;
  const words = String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !stop.has(w));
  const wantsList = /\b(resorts?|hotels?|destinations?|properties|places|kahan|kaha|where)\b/i.test(text);
  if (!words.length && !wantsList) return null;
  const rows = await sql('resorts').select('name', 'location', 'category', 'stars', 'description', 'slug').orderBy('sort_order').limit(100);
  const hits = rows.filter((r) => words.some((w) => `${r.name} ${r.location}`.toLowerCase().includes(w)));
  if (hits.length === 1 || (hits.length && hits.length <= 3 && !wantsList)) {
    return hits.slice(0, 3).map((r) => `*${r.name}* – ${r.location} (${r.stars}★, ${r.category}).\n${String(r.description || '').slice(0, 220)}`).join('\n\n') + `\n\nMore: ${site()}/resorts\nReply BOOKING to plan your stay.`;
  }
  if (hits.length > 3 || (wantsList && rows.length)) {
    const list = (hits.length ? hits : rows).slice(0, 8).map((r) => `• ${r.name} – ${r.location}`).join('\n');
    return `Here are some of our stays:\n${list}\n\nSee all: ${site()}/resorts\nAsk me about any of them, or reply BOOKING.`;
  }
  return null;
}

// ---- Outgoing notifications: booking / enquiry messages to guests and partner staff ----
// Never throws: a WhatsApp problem must not break saving a booking in the partner portal.
const phoneFromText = (value) => {
  const lid = String(value || '').match(/\d+@lid/); // WhatsApp privacy ids are stored as-is
  if (lid) return lid[0];
  const match = String(value || '').match(/\+?\d[\d\s().-]{8,}\d/);
  return match ? toChatId(match[0], cfg().countryCode)?.replace('@c.us', '') || null : null;
};
const fmtDate = (d) => (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);
// Head-office numbers that get every WhatsApp booking / payment alert (WHATSAPP_ADMIN_NUMBERS=91xxxxxxxxxx,...).
const adminNumbers = () => (process.env.WHATSAPP_ADMIN_NUMBERS || '').split(',').map((x) => phoneFromText(x.trim())).filter(Boolean);

export function createWhatsappNotifier({ sql }) {
  const send = async (phone, text, kind, { staff = false } = {}) => {
    const c = cfg();
    if (!phone || !c.apiKey || !c.sessionId) return; // not configured: skip silently
    try {
      await ensureTables(sql);
      // Guests who sent STOP are never messaged; staff alerts ignore the opt-out list.
      if (!staff && (await sql('whatsapp_contacts').where({ phone, opted_in: false }).first())) return;
      let status = 'ok';
      try { await sendText(toChatId(phone, cfg().countryCode), text); } catch (e) { status = 'failed'; console.error('WhatsApp notify failed:', e.message); }
      await sql('whatsapp_messages').insert({ phone, direction: 'out', kind, body: text.slice(0, 2000), status });
    } catch (e) { console.error('WhatsApp notify error:', e.message); }
  };
  const staffFor = async (resortId) => { await ensureTables(sql); return (await sql('whatsapp_partner_numbers').where({ resort_id: resortId })).map((r) => r.phone); };
  const resortName = async (resortId) => (await sql('resorts').where({ id: resortId }).first('name'))?.name || 'Gulsaga';

  return {
    // Payment received (Razorpay): tell the guest, the property staff and head office.
    async bookingPaid(resortId, bookingId, amount) {
      const b = await sql('partner_bookings').where({ id: bookingId }).first();
      if (!b) return;
      const resort = await resortName(resortId);
      const dates = `${fmtDate(b.check_in)} to ${fmtDate(b.check_out)}`;
      await send(phoneFromText(b.guest_contact), `✅ Payment of ₹${Number(amount).toLocaleString('en-IN')} received! Your booking #${b.id} at ${resort} (${dates}) is CONFIRMED. We look forward to hosting you.`, 'booking');
      const staffText = `💰 Booking #${b.id} at ${resort} is PAID and CONFIRMED: ${b.guest_name}, ${dates}, ${b.guests} guest(s), advance ₹${Number(amount).toLocaleString('en-IN')}.`;
      for (const phone of [...(await staffFor(resortId)), ...adminNumbers()]) await send(phone, staffText, 'booking', { staff: true });
    },
    // New booking entered in the partner portal.
    async bookingCreated(resortId, b, { skipGuest = false, source = '' } = {}) {
      const resort = await resortName(resortId);
      // Head-office numbers (WHATSAPP_ADMIN_NUMBERS) are told about WhatsApp bookings; they are also listed in admin > WhatsApp.
      if (source) for (const n of adminNumbers()) {
        await send(n, `New ${source} booking #${b.id} at ${resort}: ${b.guest_name ?? b.guestName}, ${fmtDate(b.check_in ?? b.checkIn)} to ${fmtDate(b.check_out ?? b.checkOut)}, ${b.guests} guest(s).`, 'booking', { staff: true });
      }
      const guest = skipGuest ? null : phoneFromText(b.guest_contact ?? b.guestContact);
      await send(guest, `Hello ${b.guest_name ?? b.guestName}, your booking request at ${resort} (${fmtDate(b.check_in ?? b.checkIn)} to ${fmtDate(b.check_out ?? b.checkOut)}, ${b.guests} guest(s)) is received. Status: ${b.status}. Ref #${b.id}. Thank you – Gulsaga Hospitality`, 'booking');
      for (const phone of await staffFor(resortId)) {
        await send(phone, `New booking #${b.id} at ${resort}: ${b.guest_name ?? b.guestName}, ${fmtDate(b.check_in ?? b.checkIn)} to ${fmtDate(b.check_out ?? b.checkOut)}, ${b.guests} guest(s).\nReply CONFIRM ${b.id} or CANCEL ${b.id}. To choose the advance the guest pays, reply e.g. CONFIRM ${b.id} 2000.`, 'booking', { staff: true });
      }
    },
    // Booking status changed (portal button or a WhatsApp command from staff).
    async bookingStatus(resortId, bookingId) {
      const b = await sql('partner_bookings').where({ id: bookingId, resort_id: resortId }).first();
      if (!b) return;
      const resort = await resortName(resortId);
      const lines = {
        CONFIRMED: `Good news! Your booking #${b.id} at ${resort} (${fmtDate(b.check_in)} to ${fmtDate(b.check_out)}) is confirmed by the property.` + await payInvite(sql, b),
        CANCELLED: `Your booking #${b.id} at ${resort} has been cancelled. Reply here if you would like to rebook.`,
        CHECKED_IN: `Welcome to ${resort}! Your check-in is recorded. Message us any time during your stay.`,
        CHECKED_OUT: `Thank you for staying at ${resort}. We hope to see you again soon!`,
      };
      if (lines[b.status]) await send(phoneFromText(b.guest_contact), lines[b.status], 'booking');
    },
    // New enquiry (wedding, corporate, group...) logged for a property.
    async enquiryCreated(resortId, e) {
      const resort = await resortName(resortId);
      await send(phoneFromText(e.contact), `Hello ${e.name}, thank you for your ${e.kind} enquiry at ${resort}. Our team will get back to you shortly.`, 'enquiry');
      for (const phone of await staffFor(resortId)) await send(phone, `New ${e.kind} enquiry at ${resort} from ${e.name} (${e.contact || 'no contact'}): ${String(e.message || '').slice(0, 200)}`, 'enquiry', { staff: true });
    },
  };
}

// ---- Partner staff commands over WhatsApp ----
// Staff numbers (whatsapp_partner_numbers) can manage their own properties by chat:
//   BOOKINGS | ENQUIRIES | CONFIRM <id> | CANCEL <id> | HELP
// Partner commands: CONFIRM <id> [amount] – the optional amount (₹) is what the guest will be asked to pay.
async function partnerCommand(sql, notify, phone, text) {
  const resorts = (await sql('whatsapp_partner_numbers').where({ phone })).map((r) => r.resort_id);
  if (!resorts.length) return null; // not a partner number: handle as a normal guest
  const t = text.trim();
  let m;
  if ((m = t.match(/^(confirm|cancel)\s+#?(\d+)(?:\s+(?:₹|rs\.?\s*)?(\d[\d,]*))?/i))) {
    const status = m[1].toLowerCase() === 'confirm' ? 'CONFIRMED' : 'CANCELLED';
    const row = await sql('partner_bookings').where({ id: Number(m[2]) }).whereIn('resort_id', resorts).first();
    if (!row) return `Booking #${m[2]} was not found for your properties.`;
    await sql('partner_bookings').where({ id: row.id }).update({ status });
    const amount = m[3] ? Number(m[3].replace(/,/g, '')) : 0;
    if (status === 'CONFIRMED' && amount > 0 && razorpayOn()) await requestPayment(sql, row.id, amount);
    await notify.bookingStatus(row.resort_id, row.id); // tells the guest (with the CONFIRM NOW prompt when a payment is due)
    return `Booking #${row.id} is now ${status}. The guest has been notified${status === 'CONFIRMED' && amount > 0 && razorpayOn() ? ` and asked to pay ₹${amount.toLocaleString('en-IN')}` : ''}.${status === 'CONFIRMED' && amount > 0 && !razorpayOn() ? ' (Online payment is not enabled yet, so no payment request was sent.)' : ''}`;
  }
  if (/^bookings?$/i.test(t)) {
    const rows = await sql('partner_bookings').whereIn('resort_id', resorts).where({ status: 'PENDING' }).orderBy('id', 'desc').limit(10);
    return rows.length ? 'Pending bookings:\n' + rows.map((b) => `#${b.id} ${b.guest_name} ${fmtDate(b.check_in)}→${fmtDate(b.check_out)} (${b.guests})`).join('\n') + '\nReply CONFIRM <id> or CANCEL <id>.' : 'No pending bookings.';
  }
  if (/^enquir(y|ies)$/i.test(t)) {
    const rows = await sql('partner_enquiries').whereIn('resort_id', resorts).where({ status: 'NEW' }).orderBy('id', 'desc').limit(10);
    return rows.length ? 'New enquiries:\n' + rows.map((e) => `#${e.id} ${e.kind} – ${e.name} (${e.contact || '-'})`).join('\n') : 'No new enquiries.';
  }
  return 'Partner commands:\nBOOKINGS – pending bookings\nENQUIRIES – new enquiries\nCONFIRM <id> [amount] / CANCEL <id> – update a booking (amount = advance the guest pays)';
}

// ---- Guest self-service over WhatsApp: booking, membership, booking status, talk to team ----
// A small state machine. whatsapp_sessions keeps (flow, step, data) per phone so a multi-question
// conversation survives between messages. Typing MENU or EXIT at any time leaves the current flow.
const MENU = 'Gulsaga Hospitality – how can I help?\n1️⃣ Book a stay (reply BOOK)\n2️⃣ Membership plans (reply MEMBERSHIP)\n3️⃣ My booking status (reply STATUS)\n4️⃣ Pay for a booking (reply PAY)\n5️⃣ Talk to our team (reply TEAM)\nOr just ask me anything about our resorts and destinations.';
const SESSION_TTL_MS = 30 * 60 * 1000;
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');

// Accepts DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY or YYYY-MM-DD and returns YYYY-MM-DD (or null).
export function parseDate(input) {
  const s = String(input || '').trim();
  let y, mo, d, m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [y, mo, d] = [m[1], m[2], m[3]];
  else if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) [d, mo, y] = [m[1], m[2], m[3]];
  else return null;
  const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (dt.getUTCFullYear() !== Number(y) || dt.getUTCMonth() !== Number(mo) - 1 || dt.getUTCDate() !== Number(d)) return null;
  return dt.toISOString().slice(0, 10);
}
// Matches a numbered choice ("3") or a name fragment ("goa") against a list of {label} items.
const pickFrom = (items, text) => {
  const t = text.trim().toLowerCase();
  if (/^\d+$/.test(t)) return items[Number(t) - 1] || null;
  return items.find((i) => i.label.toLowerCase().includes(t)) || null;
};

// ---- Razorpay payment links ----
const razorpayOn = () => Boolean(cfg().razorpayKeyId && cfg().razorpayKeySecret);
async function razorpay(path, { method = 'GET', body } = {}) {
  const c = cfg();
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(`${c.razorpayKeyId}:${c.razorpayKeySecret}`).toString('base64') },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Razorpay ${res.status}: ${data?.error?.description || 'request failed'}`);
  return data;
}
// Creates the link for the advance (WHATSAPP_ADVANCE_PERCENT of the stay total) and stores it against the booking.
async function createPaymentLink(sql, booking, guestName, phone, resortName, { amount: fixed, paymentId } = {}) {
  const amount = fixed || Math.max(1, Math.round((booking.amount * cfg().advancePercent) / 100));
  const digits = String(phone).replace(/\D/g, '');
  const link = await razorpay('/payment_links', {
    method: 'POST',
    body: {
      amount: amount * 100, // paise
      currency: 'INR',
      accept_partial: false,
      reference_id: `GULBK${booking.id}-${Date.now().toString(36)}`,
      description: `Booking #${booking.id} at ${resortName}`.slice(0, 250),
      customer: { name: guestName, ...(/^\d{10,15}$/.test(digits) ? { contact: `+${digits}` } : {}) },
      notify: { sms: false, email: false }, // we deliver the link on WhatsApp ourselves
      reminder_enable: false,
    },
  });
  if (paymentId) await sql('whatsapp_payments').where({ id: paymentId }).update({ link_id: link.id, short_url: link.short_url, amount, status: 'created' });
  else await sql('whatsapp_payments').insert({ booking_id: booking.id, link_id: link.id, short_url: link.short_url, amount });
  return { amount, url: link.short_url };
}
// payment status per booking id, for the admin and partner dashboards
export async function paymentMap(sql, bookingIds) {
  if (!bookingIds.length) return new Map();
  await ensureTables(sql);
  const rows = await sql('whatsapp_payments').whereIn('booking_id', bookingIds).orderBy('id');
  return new Map(rows.map((r) => [r.booking_id, { status: r.status, amount: r.amount }])); // latest row wins
}
// Asks Razorpay whether a pending link was paid; on success confirms the booking and tells everyone.
async function settlePayment(sql, notify, payment) {
  const link = await razorpay(`/payment_links/${payment.link_id}`);
  if (link.status === 'paid') {
    await sql('whatsapp_payments').where({ id: payment.id }).update({ status: 'paid', paid_at: sql.fn.now() });
    const booking = await sql('partner_bookings').where({ id: payment.booking_id }).first();
    if (booking && booking.status === 'PENDING') await sql('partner_bookings').where({ id: booking.id }).update({ status: 'CONFIRMED' });
    if (booking) await notify.bookingPaid(booking.resort_id, booking.id, payment.amount);
    return 'paid';
  }
  if (['expired', 'cancelled'].includes(link.status)) await sql('whatsapp_payments').where({ id: payment.id }).update({ status: link.status });
  return link.status;
}
let pollerStarted = false;
function startPaymentPoller(sql, notify) {
  if (pollerStarted) return;
  pollerStarted = true;
  setInterval(async () => {
    if (!razorpayOn()) return;
    try {
      await ensureTables(sql);
      const pending = await sql('whatsapp_payments').where({ status: 'created' }).whereRaw('created_at > NOW() - INTERVAL 3 DAY').limit(30);
      for (const p of pending) await settlePayment(sql, notify, p).catch((e) => console.error('Payment check failed:', e.message));
    } catch (e) { console.error('Payment poller error:', e.message); }
  }, 30000).unref();
}
// ---- Partner confirmation -> "CONFIRM NOW" -> payment ----
// requestPayment records the amount the partner wants collected; the Razorpay link is created only when the guest replies CONFIRM NOW.
async function requestPayment(sql, bookingId, amount) {
  await ensureTables(sql);
  const open = await sql('whatsapp_payments').where({ booking_id: bookingId }).whereIn('status', ['requested', 'created']).first();
  if (open?.status === 'created') return; // a live link already exists
  if (open) await sql('whatsapp_payments').where({ id: open.id }).update({ amount });
  else await sql('whatsapp_payments').insert({ booking_id: bookingId, amount, status: 'requested' });
}
// Text appended to the "booking confirmed" message. Falls back to the default advance when the partner gave no amount.
async function payInvite(sql, b) {
  if (!razorpayOn()) return ' We look forward to hosting you.';
  await ensureTables(sql);
  if (await sql('whatsapp_payments').where({ booking_id: b.id, status: 'paid' }).first()) return ' We look forward to hosting you.';
  if (!(await sql('whatsapp_payments').where({ booking_id: b.id }).whereIn('status', ['requested', 'created']).first())) {
    if (!(b.amount > 0)) return ' We look forward to hosting you.';
    await requestPayment(sql, b.id, Math.max(1, Math.round((b.amount * cfg().advancePercent) / 100)));
  }
  const p = await sql('whatsapp_payments').where({ booking_id: b.id }).whereIn('status', ['requested', 'created']).orderBy('id', 'desc').first();
  return `\n\n💳 To secure it, pay ${inr(p.amount)}.\nReply *CONFIRM NOW* and I will send your payment link.`;
}

async function paymentReply(sql, notify, phone) {
  const row = await sql('whatsapp_payments as p').join('partner_bookings as b', 'b.id', 'p.booking_id').where('b.guest_contact', phone).orderBy('p.id', 'desc').first('p.*');
  if (!row) return 'I could not find a pending payment for this number. Reply BOOK to start a booking.';
  if (row.status === 'requested') {
    // The property confirmed and chose the amount; the guest has now tapped "CONFIRM NOW" -> create the Razorpay link.
    if (!razorpayOn()) return 'Payments are not enabled yet. Our team will share payment details with you here shortly.';
    const b = await sql('partner_bookings as b').join('resorts as r', 'r.id', 'b.resort_id').where('b.id', row.booking_id).first('b.*', 'r.name as resort_name');
    try {
      const pay = await createPaymentLink(sql, b, b.guest_name, phone, b.resort_name, { amount: row.amount, paymentId: row.id });
      return `💳 Pay ${inr(pay.amount)} to secure booking #${b.id} at ${b.resort_name}:\n${pay.url}\n\nPay with UPI, card or netbanking. You will get a confirmation here automatically, and the property and our team are informed.`;
    } catch (e) { console.error('Payment link failed:', e.message); return 'Sorry, I could not create the payment link right now. Please reply PAY again in a minute.'; }
  }
  if (row.status === 'created' && razorpayOn()) await settlePayment(sql, notify, row).catch(() => {});
  const fresh = await sql('whatsapp_payments').where({ id: row.id }).first();
  if (fresh.status === 'paid') return `✅ Payment of ${inr(fresh.amount)} received for booking #${fresh.booking_id}. Your booking is confirmed.`;
  if (fresh.status === 'created') return `Your payment of ${inr(fresh.amount)} for booking #${fresh.booking_id} is pending:\n${fresh.short_url}\nPay with UPI, card or netbanking. You will get a confirmation here automatically.`;
  return `That payment link has ${fresh.status}. Reply BOOK to start again.`;
}

async function converse(sql, notify, phone, name, text) {
  const t = text.trim();
  const save = (flow, step, data) =>
    sql('whatsapp_sessions').insert({ phone, flow, step, data: JSON.stringify(data) }).onConflict('phone').merge({ flow, step, data: JSON.stringify(data), updated_at: sql.fn.now() });
  const clear = () => sql('whatsapp_sessions').where({ phone }).del();

  let s = await sql('whatsapp_sessions').where({ phone }).first();
  if (s && Date.now() - new Date(s.updated_at).getTime() > SESSION_TTL_MS) { await clear(); s = null; }

  if (/^(menu|help|exit|quit|0)$/i.test(t)) { await clear(); return MENU; }

  // Start a flow from keywords when none is active.
  if (!s) {
    if (/\b(book|booking|reserve|reservation)\b/i.test(t) && !/\b(my|status)\b/i.test(t)) s = { flow: 'book', step: 'start', data: '{}' };
    else if (/\b(member|membership|plans?)\b/i.test(t)) s = { flow: 'member', step: 'start', data: '{}' };
    else if (/^(pay|paid|payment|pay now|payment link|confirm now)$/i.test(t)) return paymentReply(sql, notify, phone);
    else if (/\b(status|my booking)\b/i.test(t)) return bookingStatusReply(sql, phone);
    else if (/^(team|agent|human|enquiry|inquiry|callback)$/i.test(t)) s = { flow: 'team', step: 'start', data: '{}' };
    else return null; // not a service request: let the AI answer
  }
  const data = JSON.parse(s.data || '{}');

  if (s.flow === 'book') return bookFlow(sql, notify, phone, name, s.step, data, t, save, clear);
  if (s.flow === 'member') return memberFlow(sql, phone, name, s.step, data, t, save, clear);
  if (s.flow === 'team') {
    if (s.step === 'start') { await save('team', 'msg', {}); return 'Sure – please type your message or question and our team will contact you on this number.'; }
    await createLead(sql, phone, name, 'General enquiry', 'WhatsApp enquiry', t);
    await clear();
    return 'Thank you! Your message has been passed to our team. They will reply here shortly.';
  }
  await clear();
  return null;
}

async function bookFlow(sql, notify, phone, name, step, data, t, save, clear) {
  // Destination = state/region (last part of "Place, State"). Mirrors the website: destination first, then resort.
  const all = (await sql('resorts').select('id', 'name', 'location').orderBy('sort_order').limit(60))
    .filter((r) => !/global/i.test(r.location || ''))
    .map((r) => ({ id: r.id, name: r.name, location: r.location, dest: String(r.location || '').split(',').pop().trim() }));
  const destinations = [...new Set(all.map((r) => r.dest))].map((d) => ({ label: d }));
  if (step === 'start') {
    await save('book', 'destination', {});
    return 'Let\'s plan your stay 🌿 Which destination would you like to visit? Reply with the number or name:\n' + destinations.map((d, i) => `${i + 1}. ${d.label}`).join('\n');
  }
  if (step === 'destination') {
    const d = pickFrom(destinations, t);
    if (!d) return 'I could not find that destination. Please reply with a number from the list (or MENU to exit).';
    await save('book', 'resort', { destination: d.label });
    const list = all.filter((r) => r.dest === d.label);
    return `Great – ${d.label}! Which resort would you like to book? Reply with the number or name:\n` + list.map((r, i) => `${i + 1}. ${r.name} (${r.location})`).join('\n');
  }
  if (step === 'resort') {
    const list = all.filter((r) => r.dest === data.destination).map((r) => ({ ...r, label: r.name }));
    const r = pickFrom(list, t);
    if (!r) return 'I could not find that resort. Please reply with a number from the list (or MENU to exit).';
    await save('book', 'checkin', { ...data, resortId: r.id, resortName: r.name });
    return `${r.name} – great choice! What is your check-in date? (DD-MM-YYYY)`;
  }
  if (step === 'checkin') {
    const d = parseDate(t);
    if (!d || d < new Date().toISOString().slice(0, 10)) return 'Please send a valid future date like 25-12-2026.';
    await save('book', 'checkout', { ...data, checkIn: d });
    return 'And your check-out date? (DD-MM-YYYY)';
  }
  if (step === 'checkout') {
    const d = parseDate(t);
    if (!d || d <= data.checkIn) return 'Check-out must be after check-in. Please send a date like 28-12-2026.';
    await save('book', 'guests', { ...data, checkOut: d });
    return 'How many guests will stay? (number)';
  }
  if (step === 'guests') {
    const n = Number(t.replace(/\D/g, ''));
    if (!n || n > 30) return 'Please send the number of guests, for example 2.';
    // Live availability check against the property's rooms, inventory and existing bookings.
    const { rooms, hasRooms } = await availableRooms(sql, data.resortId, data.checkIn, data.checkOut, n);
    if (hasRooms && !rooms.length) {
      await save('book', 'checkin', { resortId: data.resortId, resortName: data.resortName, destination: data.destination });
      return `Sorry, ${data.resortName} has no room available for ${data.checkIn} → ${data.checkOut} for ${n} guest(s). 😔 Please send another check-in date (DD-MM-YYYY), or reply MENU to start over.`;
    }
    const nights = Math.round((Date.parse(data.checkOut) - Date.parse(data.checkIn)) / 86400000);
    const next = { ...data, guests: n, nights };
    if (!hasRooms) { // property has not set up rooms yet: the team confirms availability manually
      await save('book', 'name', next);
      return `Under which name should we book?${name ? ` (reply SAME to use "${name}")` : ''}`;
    }
    await save('book', 'room', { ...next, rooms: rooms.map((r) => ({ id: r.id, name: r.name, rate: r.base_rate })) });
    const advance = razorpayOn() ? `\nTo confirm, pay ${cfg().advancePercent}% advance online (Razorpay: UPI / card / netbanking).` : '';
    return `✅ Good news – rooms are available at ${data.resortName} for ${data.checkIn} → ${data.checkOut} (${nights} night${nights > 1 ? 's' : ''}):\n\n` +
      rooms.map((r, i) => `${i + 1}. ${r.name} – ${r.base_rate ? `${inr(r.base_rate)}/night, total ${inr(r.base_rate * nights)}` : 'rate on request'}`).join('\n') +
      `\n\nReply with the room number to book it (e.g. 1).${advance}`;
  }
  if (step === 'room') {
    const r = pickFrom((data.rooms || []).map((x) => ({ ...x, label: x.name })), t);
    if (!r) return 'Please reply with a room number from the list (or MENU to exit).';
    const { rooms, hasRooms } = await availableRooms(sql, data.resortId, data.checkIn, data.checkOut, data.guests);
    if (hasRooms && !rooms.some((x) => x.id === r.id)) { await clear(); return 'Sorry, that room was just taken. Reply BOOK to try again.'; }
    await save('book', 'name', { ...data, roomId: r.id, roomName: r.name, amount: (r.rate || 0) * data.nights });
    return `${r.name} – noted. Under which name should we book?${name ? ` (reply SAME to use "${name}")` : ''}`;
  }
  if (step === 'name') {
    const guestName = /^same$/i.test(t) && name ? name : t.slice(0, 120);
    if (guestName.length < 2) return 'Please send your full name.';
    const next = { ...data, guestName };
    await save('book', 'confirm', next);
    return `Please confirm your booking request:\n🏨 ${next.resortName}${next.roomName ? `\n🛏 ${next.roomName}` : ''}\n📅 ${next.checkIn} → ${next.checkOut}\n👥 ${next.guests} guest(s)${next.amount ? `\n💰 ${inr(next.amount)} (approx.)` : ''}\n🙋 ${guestName}\n\nReply YES to confirm or NO to cancel.`;
  }
  if (step === 'confirm') {
    if (/^(no|n|cancel)$/i.test(t)) { await clear(); return 'No problem, the booking was cancelled. Reply BOOK any time to start again.'; }
    if (!/^(yes|y|confirm|ok|haan|ha)$/i.test(t)) return 'Please reply YES to confirm or NO to cancel.';
    const row = { resort_id: data.resortId, room_id: data.roomId ?? null, guest_name: data.guestName, guest_contact: phone, check_in: data.checkIn, check_out: data.checkOut, guests: data.guests, amount: data.amount || 0, status: 'PENDING' };
    const [id] = await sql('partner_bookings').insert(row); // same table as the partner dashboard, so the property sees it instantly
    await clear();
    // Also log it in the admin Enquiries (CRM) so head office sees it next to website enquiries.
    await createLead(sql, phone, data.guestName, 'Booking', `WhatsApp booking #${id} – ${data.resortName}`, `${data.resortName}${data.roomName ? ` / ${data.roomName}` : ''}, ${data.checkIn} to ${data.checkOut}, ${data.guests} guest(s). Booking #${id} (PENDING) is in the partner dashboard.`, false).catch(() => {});
    notify.bookingCreated(data.resortId, { ...row, id }, { skipGuest: true, source: 'WhatsApp' }).catch(() => {}); // alerts property staff + admin numbers
    const tail = '\nReply STATUS to check it any time, or BOOK for another stay.';
    // Payment is requested only after the property confirms (partner CONFIRM -> guest replies CONFIRM NOW -> link).
    return `✅ Your booking request #${id} for ${data.resortName} (${data.checkIn} → ${data.checkOut}) is received.${row.amount > 0 ? ` Estimated total ${inr(row.amount)}.` : ''} The property will confirm shortly; you will then get a CONFIRM NOW option to pay here.${tail}`;
  }
  await clear();
  return null;
}

// Rooms of a property that are free on every night of [checkIn, checkOut) and fit the party.
// A night's units = room_inventory row (0 when stop-sell) or the room's total_units, minus overlapping live bookings.
export async function availableRooms(sql, resortId, checkIn, checkOut, guests) {
  const all = await sql('partner_rooms').where({ resort_id: resortId, active: true });
  if (!all.length) return { rooms: [], hasRooms: false };
  const nights = [];
  for (let t = Date.parse(checkIn); t < Date.parse(checkOut) && nights.length < 60; t += 86400000) nights.push(new Date(t).toISOString().slice(0, 10));
  const rooms = [];
  for (const room of all) {
    if (room.capacity && room.capacity < guests) continue;
    const inv = new Map((await sql('room_inventory').where({ room_id: room.id }).whereIn('stay_date', nights).select(sql.raw("DATE_FORMAT(stay_date, '%Y-%m-%d') AS d"), 'available_units', 'stop_sell')).map((r) => [r.d, r]));
    const booked = await sql('partner_bookings').where({ room_id: room.id }).whereNotIn('status', ['CANCELLED', 'CHECKED_OUT']).where('check_in', '<', checkOut).where('check_out', '>', checkIn).select(sql.raw("DATE_FORMAT(check_in, '%Y-%m-%d') AS i"), sql.raw("DATE_FORMAT(check_out, '%Y-%m-%d') AS o"));
    const free = nights.every((n) => {
      const row = inv.get(n);
      const units = row ? (row.stop_sell ? 0 : row.available_units) : room.total_units;
      return units - booked.filter((b) => b.i <= n && n < b.o).length > 0;
    });
    if (free) rooms.push(room);
  }
  return { rooms, hasRooms: true };
}

async function memberFlow(sql, phone, name, step, data, t, save, clear) {
  const plans = (await sql('plans').orderBy('sort_order').limit(10)).map((p) => ({ ...p, label: p.name }));
  if (step === 'start') {
    await save('member', 'plan', {});
    return 'Gulsaga Membership 🌟 Choose a plan (reply with the number):\n' +
      plans.map((p, i) => `${i + 1}. ${p.name} – ${inr(p.price)} (down payment ${inr(p.down_payment)}, ${Math.max(0, p.seats_total - p.seats_taken)} seats left)\n   ${p.subtitle}`).join('\n') +
      `\nDetails: ${site()}/membership`;
  }
  if (step === 'plan') {
    const p = pickFrom(plans, t);
    if (!p) return 'Please reply with a plan number from the list (or MENU to exit).';
    await save('member', 'name', { planName: p.name });
    return `${p.name} – excellent! May I have your full name?${name ? ` (reply SAME to use "${name}")` : ''}`;
  }
  if (step === 'name') {
    const fullName = /^same$/i.test(t) && name ? name : t.slice(0, 100);
    if (fullName.length < 2) return 'Please send your full name.';
    const ref = await createLead(sql, phone, fullName, 'Membership', `Membership interest: ${data.planName}`, `Requested via WhatsApp. Plan: ${data.planName}.`);
    await clear();
    return `🎉 Thank you ${fullName}! Your interest in ${data.planName} is recorded (ref ${ref}). Our membership advisor will call or message you shortly to complete the process.`;
  }
  await clear();
  return null;
}

async function bookingStatusReply(sql, phone) {
  const rows = await sql('partner_bookings as b').leftJoin('resorts as r', 'r.id', 'b.resort_id').where('b.guest_contact', phone).orderBy('b.id', 'desc').limit(3).select('b.id', 'b.status', 'b.check_in', 'b.check_out', 'r.name as resort');
  if (!rows.length) return 'I could not find a booking for this number. Reply BOOK to make one.';
  return 'Your latest bookings:\n' + rows.map((b) => `#${b.id} ${b.resort || ''} ${fmtDate(b.check_in)}→${fmtDate(b.check_out)} – ${b.status}`).join('\n');
}

// Saves a lead into the website's existing contact/enquiry table so it shows up in the admin Enquiries (CRM).
async function createLead(sql, phone, fullName, type, subject, message, alert = true) {
  const digits = phone.replace(/\D/g, '');
  const reference = `GUL-WA-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const now = new Date();
  await sql('ContactSubmission').insert({
    id: crypto.randomUUID(), reference, name: fullName || 'WhatsApp guest', email: `${digits}@whatsapp.invalid`, mobile: digits.slice(0, 20),
    type, subject: subject.slice(0, 180), message, consent: true, status: 'NEW', notes: 'Created by the WhatsApp assistant.', createdAt: now, updatedAt: now,
  });
  // Optional internal alert: WHATSAPP_ADMIN_NUMBERS=919999999999,918888888888
  for (const n of alert ? (process.env.WHATSAPP_ADMIN_NUMBERS || '').split(',').map((x) => toChatId(x.trim(), cfg().countryCode)).filter(Boolean) : []) {
    sendText(n, `New WhatsApp lead (${type}) ${reference}: ${fullName} (+${digits}) – ${subject}`).catch(() => {});
  }
  return reference;
}

// ---- Public router: receives OpenWA webhooks (mounted at /api/public/whatsapp) ----
export function createWhatsappWebhookRouter({ sql, notify }) {
  const router = Router();
  startPaymentPoller(sql, notify);
  router.post('/webhook', async (req, res) => {
    const c = cfg();
    // req.rawBody is captured by the express.json "verify" hook in app.js; the HMAC must cover the exact bytes sent.
    if (!verifySignature(req.rawBody, req.get('X-OpenWA-Signature'), c.webhookSecret)) throw fail(401, 'Invalid signature.');
    res.status(200).json({ ok: true }); // acknowledge fast so OpenWA does not retry while we work

    try {
      await ensureTables(sql);
      const envelope = req.body?.payload ?? req.body ?? {}; // payload may be wrapped or flat depending on OpenWA version
      const event = envelope.event || req.get('X-OpenWA-Event');
      const data = envelope.data || {};
      if (event !== 'message.received') return;
      // Ignore our own messages, group chats and status broadcasts: we only answer 1:1 customers.
      const from = String(data.from || '');
      if (data.fromMe || !(from.endsWith('@c.us') || from.endsWith('@lid'))) return;

      const phone = phoneOf(from);
      const text = String(data.body || '').slice(0, 2000);
      const name = data.pushName || data.notifyName || data._data?.notifyName || '';

      // Website-only gate: personal chats must never get bot replies. We only engage when the sender
      //  (a) is partner staff or an admin number, (b) already started a bot conversation earlier, or
      //  (c) opens with the website's pre-filled text (it contains "Gulsaga", see whatsapp-button.tsx).
      // Anything else is ignored completely: not stored, not opted-in, not replied to.
      const known = adminNumbers().includes(phone)
        || await sql('whatsapp_partner_numbers').where({ phone }).first()
        || await sql('whatsapp_messages').where({ phone, direction: 'out' }).whereIn('kind', ['auto-reply', 'booking']).first()
        || await sql('whatsapp_sessions').where({ phone }).first();
      if (!known && !/gulsaga/i.test(text)) return;

      if (data.id) {
        // unique(external_id) makes a retried webhook a no-op
        const dup = await sql('whatsapp_messages').where({ external_id: String(data.id) }).first();
        if (dup) return;
      }
      await sql('whatsapp_messages').insert({ phone, direction: 'in', kind: 'message', body: text, external_id: data.id ? String(data.id) : null });

      const rule = matchRule(text);
      if (rule?.optOut) await upsertContact(sql, phone, name, false);
      else await upsertContact(sql, phone, name, true); // anyone who writes to us (or sends START) may receive replies
      if (!c.autoReply) return;

      // STOP/START keep fixed replies. Otherwise: partner command -> AI -> database knowledge -> keyword rules -> default.
      let reply = null;
      if (!rule?.optOut && !rule?.optIn) {
        reply = await partnerCommand(sql, notify, phone, text).catch((e) => { console.error('Partner command failed:', e.message); return null; });
        reply ||= await converse(sql, notify, phone, name, text).catch((e) => { console.error('Guest flow failed:', e.message); return null; });
        reply ||= await destinationReply(sql, text).catch(() => null); // instant DB answer for destination/resort-list questions
        reply ||= await aiReply((await recentHistory(sql, phone)).slice(0, -1), text, await resortContext(sql));
        reply ||= await knowledgeReply(sql, text).catch(() => null);
      }
      reply ||= (rule?.reply || fallbackReply);
      reply = reply.replaceAll('{{name}}', name || 'there').replaceAll('{{site}}', site());
      let status = 'ok';
      try { await sendText(from, reply); } catch (e) { status = 'failed'; console.error('WhatsApp auto-reply failed:', e.message); }
      await sql('whatsapp_messages').insert({ phone, direction: 'out', kind: 'auto-reply', body: reply, status });
    } catch (e) {
      console.error('WhatsApp webhook processing failed:', e.message);
    }
  });
  return router;
}

// ---- Admin router: status, contacts, history, bulk send (mounted at /api/admin/whatsapp) ----
// Access control is done by the shared /api/admin gate in app.js (permissionFor.whatsapp).
export function createWhatsappAdminRouter({ sql, db, audit }) {
  const router = Router();
  const wrap = (fn) => (req, res, next) => ensureTables(sql).then(() => fn(req, res)).catch(next);

  // Is OpenWA configured, and is the WhatsApp session connected?
  router.get('/status', wrap(async (req, res) => {
    const c = cfg();
    const configured = Boolean(c.apiKey && c.sessionId);
    let session = null;
    if (configured) {
      try { const s = await openwa(`/sessions/${c.sessionId}`); session = { status: s.status, phone: s.phone }; }
      catch (e) { session = { status: 'unreachable', error: e.message }; }
    }
    const [{ n: contacts }] = await sql('whatsapp_contacts').where({ opted_in: true }).count({ n: '*' });
    res.json({ configured, autoReply: c.autoReply, session, optedInContacts: Number(contacts) });
  }));

  router.get('/contacts', wrap(async (req, res) => {
    res.json({ contacts: await sql('whatsapp_contacts').orderBy('updated_at', 'desc').limit(500) });
  }));

  // Add / update contacts. Only add people who agreed to receive WhatsApp messages.
  router.post('/contacts', wrap(async (req, res) => {
    const input = z.object({ contacts: z.array(z.object({ phone: z.string().min(5).max(30), name: z.string().max(120).optional() })).min(1).max(500), optedIn: z.boolean().default(true) }).parse(req.body);
    let added = 0; const invalid = [];
    for (const item of input.contacts) {
      const chatId = toChatId(item.phone, cfg().countryCode);
      if (!chatId) { invalid.push(item.phone); continue; }
      await upsertContact(sql, phoneOf(chatId), item.name, input.optedIn);
      added++;
    }
    res.json({ added, invalid });
  }));

  router.get('/messages', wrap(async (req, res) => {
    res.json({ messages: await sql('whatsapp_messages').orderBy('id', 'desc').limit(200) });
  }));

  // Every booking made through WhatsApp (guest_contact is the guest's WhatsApp number), with property and room.
  router.get('/bookings', wrap(async (req, res) => {
    const rows = await sql('partner_bookings as b').leftJoin('resorts as r', 'r.id', 'b.resort_id').leftJoin('partner_rooms as pr', 'pr.id', 'b.room_id')
      .whereRaw("b.guest_contact REGEXP '^[0-9]{10,15}(@lid)?$'")
      .orderBy('b.id', 'desc').limit(200)
      .select('b.id', 'b.guest_name as guestName', 'b.guest_contact as phone', 'b.guests', 'b.amount', 'b.status', 'r.name as resortName', 'pr.name as roomName',
        sql.raw("DATE_FORMAT(b.check_in, '%Y-%m-%d') AS checkIn"), sql.raw("DATE_FORMAT(b.check_out, '%Y-%m-%d') AS checkOut"), 'b.created_at as createdAt');
    const pay = await paymentMap(sql, rows.map((r) => r.id));
    res.json({ rows: rows.map((r) => ({ ...r, paymentStatus: pay.get(r.id)?.status ?? null })) });
  }));

  // Partner staff numbers per property: they get booking/enquiry alerts and can reply CONFIRM/CANCEL.
  router.get('/partners', wrap(async (req, res) => {
    const rows = await sql('whatsapp_partner_numbers as p').leftJoin('resorts as r', 'r.id', 'p.resort_id').select('p.id', 'p.resort_id', 'p.phone', 'p.name', 'r.name as resortName').orderBy('p.id', 'desc');
    const resorts = await sql('resorts').select('id', 'name').orderBy('name');
    res.json({ rows, resorts });
  }));
  router.post('/partners', wrap(async (req, res) => {
    const d = z.object({ resortId: z.number().int().positive(), phone: z.string().min(5).max(30), name: z.string().max(120).optional() }).parse(req.body);
    const chatId = toChatId(d.phone, cfg().countryCode);
    if (!chatId) throw fail(400, 'Enter a valid phone number.');
    if (!(await sql('resorts').where({ id: d.resortId }).first())) throw fail(400, 'Choose a valid property.');
    await sql('whatsapp_partner_numbers').insert({ resort_id: d.resortId, phone: phoneOf(chatId), name: d.name || null }).onConflict(['resort_id', 'phone']).ignore();
    res.status(201).json({ ok: true });
  }));
  router.delete('/partners/:id', wrap(async (req, res) => {
    await sql('whatsapp_partner_numbers').where({ id: Number(req.params.id) }).delete();
    res.json({ ok: true });
  }));

  // Send one message to many people, paced by OpenWA's own queue (async batch, max 100 per request).
  // `recipients` omitted => every opted-in contact. `{{name}}` in the text is personalised per contact.
  router.post('/bulk', wrap(async (req, res) => {
    const input = z.object({
      text: z.string().min(1).max(1500),
      recipients: z.array(z.string()).max(1000).optional(),
      delayMs: z.number().int().min(1000).max(60000).optional(),
    }).parse(req.body);
    const c = cfg();

    let targets;
    if (input.recipients?.length) {
      const phones = [...new Set(input.recipients.map((p) => toChatId(p, c.countryCode)).filter(Boolean).map(phoneOf))];
      // Opted-out people are always skipped, even if the admin typed their number.
      const blocked = new Set((await sql('whatsapp_contacts').whereIn('phone', phones).where({ opted_in: false })).map((r) => r.phone));
      const known = new Map((await sql('whatsapp_contacts').whereIn('phone', phones)).map((r) => [r.phone, r.name]));
      targets = phones.filter((p) => !blocked.has(p)).map((phone) => ({ phone, name: known.get(phone) }));
    } else {
      targets = (await sql('whatsapp_contacts').where({ opted_in: true }).select('phone', 'name')).map((r) => ({ phone: r.phone, name: r.name }));
    }
    if (!targets.length) throw fail(400, 'No opted-in recipients to message.');

    const batches = [];
    for (let i = 0; i < targets.length; i += 100) batches.push(targets.slice(i, i + 100)); // OpenWA limit: 100 per batch
    const batchIds = [];
    for (const group of batches) {
      const result = await openwa(`/sessions/${c.sessionId}/messages/send-bulk`, {
        method: 'POST',
        body: {
          messages: group.map((t) => ({ chatId: `${t.phone}@c.us`, type: 'text', content: { text: input.text }, variables: { name: t.name || 'there' } })),
          options: { delayBetweenMessages: input.delayMs || c.bulkDelayMs, randomizeDelay: true, stopOnError: false },
        },
      });
      batchIds.push(result.batchId);
    }
    await sql('whatsapp_messages').insert(targets.map((t) => ({ phone: t.phone, direction: 'out', kind: 'bulk', body: input.text.slice(0, 2000), status: 'queued' })));
    await audit?.(db, req.user, 'whatsapp.bulk', batchIds[0] || null);
    res.status(202).json({ queued: targets.length, batchIds });
  }));

  // Progress of a batch started by /bulk.
  router.get('/bulk/:batchId', wrap(async (req, res) => {
    res.json(await openwa(`/sessions/${cfg().sessionId}/messages/batch/${encodeURIComponent(req.params.batchId)}`));
  }));

  return router;
}
