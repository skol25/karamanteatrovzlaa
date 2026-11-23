import test from 'node:test';
import assert from 'node:assert/strict';
import { publishedRate } from '../src/lib/rate-policy.ts';
test('usa la publicación de mañana inmediatamente y por encima de la tasa manual', () => {
 const bcv={valid_date:'2026-11-24',rate:919.8227};
 assert.equal(publishedRate(bcv,{valid_date:'2026-11-23',rate:917},'2026-11-23',4),bcv);
});
test('usa manual como respaldo y rechaza ambas si son demasiado antiguas',()=>{
 const manual={valid_date:'2026-11-23',rate:919};
 assert.equal(publishedRate({valid_date:'2026-11-18'},manual,'2026-11-23',4),manual);
 assert.equal(publishedRate(null,{valid_date:'2026-11-18'},'2026-11-23',4),null);
});
