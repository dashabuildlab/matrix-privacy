import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  reduceToEnergy,
  calculateMatrix,
  calculateCompatibility,
  getDailyEnergy,
} from '../matrix-calc';

test('reduceToEnergy: returns numbers 1-22 unchanged', () => {
  for (let i = 1; i <= 22; i++) {
    assert.equal(reduceToEnergy(i), i);
  }
});

test('reduceToEnergy: reduces numbers > 22 by digit sum', () => {
  assert.equal(reduceToEnergy(23), 5);
  assert.equal(reduceToEnergy(45), 9);
  assert.equal(reduceToEnergy(99), 18);
});

test('reduceToEnergy: iterates until result <= 22', () => {
  assert.equal(reduceToEnergy(999), 9);
});

test('reduceToEnergy: zero and negative map to 22', () => {
  assert.equal(reduceToEnergy(0), 22);
  assert.equal(reduceToEnergy(-5), 22);
});

test('calculateMatrix: deterministic for given date', () => {
  const m = calculateMatrix('1990-05-15');
  assert.equal(m.birthDate, '1990-05-15');
  assert.ok(m.personality >= 1 && m.personality <= 22);
  assert.ok(m.soul >= 1 && m.soul <= 22);
  assert.ok(m.destiny >= 1 && m.destiny <= 22);
});

test('calculateMatrix: known values for 1990-05-15', () => {
  // a=15(day), b=5(month), c=reduceToEnergy(1+9+9+0)=19
  // soul = 15+5=20, destiny = 5+19=24->6, personality = 15+5+19=39->12
  const m = calculateMatrix('1990-05-15');
  assert.equal(m.soul, 20);
  assert.equal(m.destiny, 6);
  assert.equal(m.personality, 12);
});

test('calculateMatrix: all positions are valid energies (1-22)', () => {
  const m = calculateMatrix('2000-01-01');
  const fields = [
    m.personality, m.soul, m.destiny, m.spiritual, m.material,
    m.talentFromGod, m.talentFromFamily, m.purpose, m.karmicTail,
    m.parentKarma, m.maleFemale, m.center,
  ];
  for (const v of fields) {
    assert.ok(v >= 1 && v <= 22, `value ${v} out of range`);
  }
});

test('calculateCompatibility: produces values in 1-22', () => {
  const m1 = calculateMatrix('1990-05-15');
  const m2 = calculateMatrix('1992-08-20');
  const c = calculateCompatibility(m1, m2);
  for (const v of [c.overall, c.soulConnection, c.destinyConnection, c.karmicLesson]) {
    assert.ok(v >= 1 && v <= 22);
  }
});

test('getDailyEnergy: returns value in 1-22 for any date', () => {
  const e1 = getDailyEnergy(new Date('2026-04-25'));
  const e2 = getDailyEnergy(new Date('2000-12-31'));
  assert.ok(e1 >= 1 && e1 <= 22);
  assert.ok(e2 >= 1 && e2 <= 22);
});
