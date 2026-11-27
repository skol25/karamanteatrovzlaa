import {createClient} from '@libsql/client';
const db=createClient({url:'file:/home/karapuwa/karamantea/data/karamantea.db'});
const marker='extra_8vip_20261127';
try {
 if((await db.execute({sql:'SELECT 1 FROM meta WHERE k=?',args:[marker]})).rows.length) throw Error('Este ajuste ya fue aplicado; no se duplicó.');
 const backup='/home/karapuwa/karamantea/data/backups/before-extra8vip-'+Date.now()+'.db';
 await db.execute({sql:'VACUUM INTO ?',args:[backup]});
 const tx=await db.transaction('write');
 try {
  if((await tx.execute({sql:'SELECT 1 FROM meta WHERE k=?',args:[marker]})).rows.length)throw Error('Ajuste ya aplicado.');
  const p=(await tx.execute(`SELECT p.layout FROM performances p JOIN shows s ON s.id=p.show_id WHERE p.id=1 AND s.slug='plano-y-contraplano' AND p.starts_at='2026-11-27T20:00:00-04:00'`)).rows[0];
  if(!p)throw Error('No coincide la función esperada.');
  const plan=JSON.parse(p.layout);
  const occupied=new Set((await tx.execute('SELECT seat FROM reservation_seats WHERE performance_id=1')).rows.map(r=>String(r.seat)));
  const selected={};
  for(const [zone,qty] of [['vip',8]]){
   const z=plan.zones.find(z=>z.id===zone);if(!z)throw Error('Zona no encontrada.');
   const available=[];
   if(z.unassignedCapacity){for(let i=1;i<=z.unassignedCapacity;i++)available.push(`U-${z.id}-${i}`);}
   else for(const m of plan.items.filter(i=>i.zone===zone&&i.type==='mesa').sort((a,b)=>a.n-b.n))for(let i=1;i<=m.seats;i++)available.push(`M${m.n}-${i}`);
   const seats=available.filter(s=>!occupied.has(s)).slice(0,qty);if(seats.length!==qty)throw Error('No hay suficientes puestos libres.');
   const rows=(await tx.execute({sql:`SELECT id FROM reservations WHERE performance_id=1 AND status='blocked' AND buyer_name=?`,args:['Ocupación externa · '+zone]})).rows;
   if(rows.length!==1)throw Error('No se encontró un único bloqueo externo para '+zone);
   const id=rows[0].id;
   for(const seat of seats){await tx.execute({sql:'INSERT INTO reservation_seats(performance_id,seat,reservation_id) VALUES(1,?,?)',args:[seat,id]});await tx.execute({sql:'INSERT INTO reservation_seat_log(reservation_id,seat,price_usd,zone) VALUES(?,?,?,?)',args:[id,seat,z.price,z.name]});}
   await tx.execute({sql:'UPDATE reservations SET qty=qty+? WHERE id=?',args:[qty,id]});selected[zone]=seats;
  }
  await tx.execute({sql:'INSERT INTO meta(k,v) VALUES(?,?)',args:[marker,JSON.stringify({selected,backup})]});
  await tx.execute({sql:`INSERT INTO audit_log(at,kind,actor,action,summary,entity,entity_id,detail) VALUES(?,'admin','Organizador','ocupacion_externa','Agregó 8 sillas VIP ocupadas.','funcion','1',?)`,args:[Date.now(),JSON.stringify({selected,backup})]});
  await tx.commit();console.log(JSON.stringify({selected,backup}));
 } catch(e){await tx.rollback();throw e;}finally{tx.close();}
 console.log((await db.execute(`SELECT l.zone,count(*) n FROM reservation_seats s JOIN reservation_seat_log l ON l.reservation_id=s.reservation_id AND l.seat=s.seat WHERE s.performance_id=1 GROUP BY l.zone`)).rows);
 console.log((await db.execute('PRAGMA integrity_check')).rows);
}finally{db.close();}
