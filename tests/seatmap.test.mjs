import test from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATE_TIBISAY, expandMap, validatePlan, seatsSummary } from '../src/lib/seatmap.ts';

test('Tibisay conserva puestos únicos: 40 mesas VIP, 32 Plata y 72 entradas libres', () => {
  const p = structuredClone(TEMPLATE_TIBISAY);
  assert.equal(validatePlan(p), null);
  const ex = expandMap(p);
  assert.equal(ex.tables.filter(t => t.zone === 'vip').length, 40);
  assert.equal(ex.tables.filter(t => t.zone === 'plata').length, 32);
  assert.equal(ex.seats.filter(s => s.kind === 'libre').length, 72);
  assert.equal(ex.capacity, 720);
  assert.equal(new Set(ex.seats.map(s => s.id)).size, 720);
  assert.equal(ex.byId['M41-1'].zone.id, 'plata');
  assert.equal(ex.byId['U-general-1'].zone.price, 20);
});

test('no permite mezclar aforo libre con mesas ni exceder el límite de capacidad', () => {
  const p = structuredClone(TEMPLATE_TIBISAY);
  p.items[0].zone = 'general';
  assert.match(validatePlan(p), /ubicación libre/);
  p.items[0].zone = 'vip';
  p.zones.find(z => z.id === 'general').unassignedCapacity = 3000;
  assert.match(validatePlan(p), /Máximo 3000/);
});

test('las entradas libres no muestran identificadores internos ni números de mesa', () => {
  assert.equal(seatsSummary(['U-general-1', 'U-general-2']), '2 entradas de ubicación libre');
  assert.equal(seatsSummary(['M1-1', 'U-general-3']), 'Mesa 1: puesto 1 · 1 entrada de ubicación libre');
});
