// Keeps room_inventory in step with booking status so partners never adjust availability by hand.
import { fail } from './security.js';

const HOLDING = ['CONFIRMED', 'CHECKED_IN'];
// MySQL DATE columns arrive as local-midnight Date objects, so read the local calendar day rather than the UTC one.
const ymd = (value) => (value instanceof Date ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}` : String(value).slice(0, 10));

function nights(checkIn, checkOut) {
  const list = [];
  for (let d = new Date(`${ymd(checkIn)}T00:00:00Z`); d < new Date(`${ymd(checkOut)}T00:00:00Z`); d = new Date(d.getTime() + 86400000)) list.push(d.toISOString().slice(0, 10));
  return list;
}

// Move a booking to `status` inside a transaction, taking or releasing one room for each night of the stay.
export async function applyBookingStatus(trx, booking, status, roomId) {
  const room = roomId ? await trx('partner_rooms').where({ id: roomId, resort_id: booking.resort_id }).first() : null;
  if (roomId && !room) throw fail(400, 'Choose a room from this property.');
  const shouldHold = HOLDING.includes(status);
  if (shouldHold && !room) throw fail(400, 'Assign a room before confirming this booking so its dates are blocked.');
  const dates = nights(booking.check_in, booking.check_out);
  const release = booking.inventory_held && (!shouldHold || booking.room_id !== roomId);
  let held = Boolean(booking.inventory_held);

  if (release) {
    const old = await trx('partner_rooms').where({ id: booking.room_id }).first();
    if (old) {
      for (const date of dates) {
        await trx('room_inventory').where({ room_id: old.id, stay_date: date }).update({ available_units: trx.raw('LEAST(available_units + 1, ?)', [old.total_units]) });
      }
    }
    held = false;
  }
  if (shouldHold && !held) {
    const rows = await trx('room_inventory').where({ room_id: room.id }).whereIn('stay_date', dates).select(trx.raw("DATE_FORMAT(stay_date, '%Y-%m-%d') AS date"), 'available_units');
    const left = new Map(rows.map((r) => [r.date, r.available_units]));
    const full = dates.filter((date) => (left.get(date) ?? room.total_units) < 1);
    if (full.length) throw fail(409, `${room.name} has no room free on ${full.slice(0, 3).join(', ')}${full.length > 3 ? '…' : ''}. Pick another room or dates.`);
    for (const date of dates) {
      await trx('room_inventory').insert({ room_id: room.id, stay_date: date, available_units: room.total_units - 1, stop_sell: false, min_stay: 1 }).onConflict(['room_id', 'stay_date']).merge({ available_units: trx.raw('GREATEST(available_units - 1, 0)') });
    }
    held = true;
  }
  await trx('partner_bookings').where({ id: booking.id }).update({ status, room_id: roomId ?? null, inventory_held: held });
  return { held, nights: dates.length };
}
