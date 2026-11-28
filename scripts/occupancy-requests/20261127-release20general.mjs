import {createClient} from '@libsql/client';
const db=createClient({url:'file:/home/karapuwa/karamantea/data/karamantea.db'});
const marker='release_20general_20261127';
try {
 if((await db.execute({sql:'SELECT 1 FROM meta WHERE k=?',args:[marker]})).rows.length)throw Error('Esta liberación ya fue aplicada.');
 const backup='/home/karapuwa/karamantea/data/backups/before-release20general-'+Date.now()+'.db';
 await db.execute({sql:'VACUUM INTO ?',args:[backup]});
 const tx=await db.transaction('write');
 try{
  if((await tx.execute({sql:'SELECT 1 FROM meta WHERE k=?',args:[marker]})).rows.length)throw Error('Esta liberación ya fue aplicada.');
  const p=(await tx.execute(`SELECT p.layout FROM performances p JOIN shows s ON s.id=p.show_id WHERE p.id=1 AND s.slug='plano-y-contraplano' AND p.starts_at='2026-11-27T20:00:00-04:00'`)).rows[0];
  if(!p)throw Error('No coincide la función esperada.');
  const zone=JSON.parse(p.layout).zones.find(z=>z.id==='general');if(!zone?.unassignedCapacity)throw Error('General no es de ubicación libre.');
  const rows=(await tx.execute({sql:`SELECT id,qty FROM reservations WHERE performance_id=1 AND status='blocked' AND buyer_name=?`,args:['Ocupación externa · general']})).rows;
  if(rows.length!==1)throw Error('No se encontró un único bloqueo externo General.');
  const r=rows[0];
  const occupied=(await tx.execute({sql:'SELECT seat FROM reservation_seats WHERE performance_id=1 AND reservation_id=?',args:[r.id]})).rows.map(s=>String(s.seat));
  if(occupied.length!==Number(r.qty))throw Error('La cantidad del bloqueo no coincide con sus puestos.');
  const seats=occupied.filter(s=>s.startsWith('U-general-')).sort((a,b)=>Number(b.split('-').at(-1))-Number(a.split('-').at(-1))).slice(0,20);
  if(seats.length!==20)throw Error('No hay 20 entradas externas General para liberar.');
  for(const seat of seats){await tx.execute({sql:'DELETE FROM reservation_seats WHERE performance_id=1 AND reservation_id=? AND seat=?',args:[r.id,seat]});await tx.execute({sql:'DELETE FROM reservation_seat_log WHERE reservation_id=? AND seat=?',args:[r.id,seat]});}
  await tx.execute({sql:'UPDATE reservations SET qty=qty-20 WHERE id=?',args:[r.id]});
  await tx.execute({sql:'INSERT INTO meta(k,v) VALUES(?,?)',args:[marker,JSON.stringify({seats,backup})]});
  await tx.execute({sql:`INSERT INTO audit_log(at,kind,actor,action,summary,entity,entity_id,detail) VALUES(?,'admin','Organizador','ocupacion_externa','Liberó 20 entradas General del bloqueo externo, conservando las reservas de compradores.','funcion','1',?)`,args:[Date.now(),JSON.stringify({seats,backup})]});
  await tx.commit();console.log(JSON.stringify({released:seats.length,backup}));
 }catch(e){await tx.rollback();throw e;}finally{tx.close();}
 console.log((await db.execute(`SELECT l.zone,count(*) n FROM reservation_seats s JOIN reservation_seat_log l ON l.reservation_id=s.reservation_id AND l.seat=s.seat WHERE s.performance_id=1 GROUP BY l.zone`)).rows);
 console.log((await db.execute('PRAGMA integrity_check')).rows);
}finally{db.close();}
