import { createClient } from '@libsql/client';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { TEMPLATE_TIBISAY, expandMap, validatePlan } from '../src/lib/seatmap.ts';

// Operación puntual. No se ejecuta durante el arranque ni los despliegues.
const apply = process.argv.includes('--apply');
const dbArg = process.argv.find(a => a.startsWith('--db='));
if (!dbArg) throw new Error('Indica --db=/ruta/karamantea.db; sin --apply solo inspecciona.');
const dbPath = path.resolve(dbArg.slice(5));
await fs.access(dbPath);
const db = createClient({ url: 'file:' + dbPath });
const marker = 'tibisay_external_2026_11_18_v1';
try {
  const ps = (await db.execute({ sql: `SELECT p.*, s.slug FROM performances p JOIN shows s ON s.id=p.show_id WHERE s.slug='plano-y-contraplano' AND p.starts_at='2026-11-27T20:00:00-04:00'`, args: [] })).rows;
  if (ps.length !== 1) throw new Error('No se encontró una única función del 27/11/2026.');
  const p = ps[0];
  if (!/tibisay/i.test(String(p.venue))) throw new Error('La sala no es Tibisay.');
  const plan = structuredClone(TEMPLATE_TIBISAY);
  const err = validatePlan(plan);
  if (err) throw new Error(err);
  const ex = expandMap(plan);
  const existing = (await db.execute({ sql: 'SELECT seat FROM reservation_seats WHERE performance_id=?', args: [p.id] })).rows.map(r => String(r.seat));
  if (existing.some(id => !ex.byId[id])) throw new Error('El plano quitaría puestos ocupados. Revisión manual necesaria.');
  const done = (await db.execute({ sql: 'SELECT v FROM meta WHERE k=?', args: [marker] })).rows.length;
  const wanted = { vip: 25, plata: 3, general: 5 };
  const occupied = new Set(existing);
  const groups = Object.entries(wanted).map(([zone, qty]) => {
    const seats = ex.seats.filter(s => s.zone === zone && !occupied.has(s.id)).slice(0, qty).map(s => s.id);
    if (!done && seats.length !== qty) throw new Error(`No hay suficientes puestos libres en ${zone}.`);
    return { zone, qty, seats };
  });
  console.log(JSON.stringify({ apply, alreadyApplied: !!done, performance: Number(p.id), venue: p.venue, existingSeats: existing.length, capacity: ex.capacity, groups }, null, 2));
  if (done || !apply) process.exitCode = 0;
  else {
    const backupDir = path.join(path.dirname(dbPath), 'backups');
    await fs.mkdir(backupDir, { recursive: true, mode: 0o700 });
    const backup = path.join(backupDir, `before-tibisay-${new Date().toISOString().replace(/[:.]/g,'-')}.db`);
    await db.execute({ sql: 'VACUUM INTO ?', args: [backup] });
    const now = Date.now();
    const tx = await db.transaction('write');
    try {
      if ((await tx.execute({ sql: 'SELECT v FROM meta WHERE k=?', args: [marker] })).rows.length) throw new Error('La operación ya fue aplicada.');
      const active = (await tx.execute({ sql: 'SELECT seat FROM reservation_seats WHERE performance_id=?', args: [p.id] })).rows;
      if (active.some(r => !ex.byId[String(r.seat)])) throw new Error('Cambió la ocupación y hay puestos incompatibles.');
      const rate = (await tx.execute('SELECT id,rate,valid_date FROM rates ORDER BY valid_date DESC,id DESC LIMIT 1')).rows[0];
      if (!rate) throw new Error('No hay registro de tasa para la referencia interna.');
      await tx.execute({ sql: 'UPDATE performances SET layout=?,capacity=?,price_usd=? WHERE id=?', args: [JSON.stringify(plan), ex.capacity, Math.min(...plan.zones.map(z => z.price)), p.id] });
      if (p.venue_id) await tx.execute({ sql: 'UPDATE venues SET layout=?,capacity=?,price_usd=? WHERE id=?', args: [JSON.stringify(plan), ex.capacity, 20, p.venue_id] });
      for (const g of groups) {
        const token = randomBytes(18).toString('base64url');
        const result = await tx.execute({ sql: `INSERT INTO reservations (token,performance_id,qty,status,rate_id,rate,rate_date,unit_usd,total_usd,total_bs,expires_at,created_at,buyer_name,admin_note) VALUES (?,?,?,'blocked',?,?,?,0,0,0,?,?,?,?)`, args: [token,p.id,g.qty,rate.id,rate.rate,rate.valid_date,now,now,`Ocupación externa · ${g.zone}`, 'Reportado por el organizador el 18/11/2026. Solo bloqueo de aforo; importes externos no registrados. Sin correo ni emisión de entradas.'] });
        const id = Number(result.lastInsertRowid);
        for (const seat of g.seats) {
          await tx.execute({ sql: 'INSERT INTO reservation_seats(performance_id,seat,reservation_id) VALUES (?,?,?)', args: [p.id,seat,id] });
          await tx.execute({ sql: 'INSERT INTO reservation_seat_log(reservation_id,seat,price_usd,zone) VALUES (?,?,?,?)', args: [id,seat,ex.byId[seat].zone.price,ex.byId[seat].zone.name] });
        }
      }
      await tx.execute({ sql: 'INSERT INTO meta(k,v) VALUES (?,?)', args: [marker,JSON.stringify({ at:now,wanted,backup })] });
      await tx.execute({ sql: `INSERT INTO audit_log(at,kind,actor,action,summary,entity,entity_id,detail) VALUES (?,'admin','Organizador','ocupacion_externa','Ajustó Tibisay: 40 mesas VIP, 32 Plata, General libre; 25 VIP, 3 Plata y 5 General ocupados.','funcion',?,?)`, args: [now,String(p.id),JSON.stringify({groups,backup})] });
      await tx.commit();
      console.log('Aplicado. Respaldo: ' + backup);
    } catch (e) { await tx.rollback(); throw e; }
    finally { tx.close(); }
    console.log('Integridad: ' + (await db.execute('PRAGMA integrity_check')).rows[0].integrity_check);
  }
} finally { db.close(); }
