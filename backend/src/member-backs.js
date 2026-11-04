// Ledger behind the member "50% Back" tracker. Staff record figures from the signed agreement; nothing is estimated.
let ready = false;

export async function ensureBacks(sql) {
  if (ready) return;
  if (!(await sql.schema.hasTable('member_backs'))) {
    await sql.schema.createTable('member_backs', (t) => {
      t.increments('id');
      t.string('user_id', 36).notNullable().index();
      t.string('kind', 12).notNullable();
      t.decimal('amount', 12, 2).notNullable();
      t.string('note', 255).nullable();
      t.string('created_by', 120).nullable();
      t.timestamp('created_at').defaultTo(sql.fn.now());
    });
  }
  ready = true;
}

export async function backsFor(sql, userId) {
  await ensureBacks(sql);
  const rows = await sql('member_backs').where({ user_id: userId }).orderBy('id', 'desc').limit(200);
  const sum = (kind) => rows.filter((r) => r.kind === kind).reduce((a, r) => a + Number(r.amount), 0);
  const eligible = sum('ELIGIBLE');
  const benefit = eligible / 2;
  const credited = sum('CREDIT');
  return {
    eligible, benefit, credited, pending: Math.max(0, benefit - credited),
    rows: rows.map((r) => ({ id: r.id, kind: r.kind, amount: Number(r.amount), note: r.note, at: r.created_at })),
  };
}
