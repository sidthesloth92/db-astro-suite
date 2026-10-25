import { describe, expect, it } from 'vitest';
import { METEOR_ALT_DEG, METEOR_LENGTH_DEG, METEOR_MAX_ACTIVE, METEOR_MIN_GAP_S } from '../models/meteor.constants';
import { makeMeteor, MeteorSimulation, slerp } from './meteor.util';

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('meteor.util', () => {
  it('builds meteors above the horizon with the configured length', () => {
    const rng = seeded(7);
    for (let i = 0; i < 50; i++) {
      const m = makeMeteor(0, rng);
      const mid = slerp(m.from, m.to, 0.5);
      const altDeg = (Math.asin(mid.z) * 180) / Math.PI;
      expect(altDeg).toBeGreaterThanOrEqual(METEOR_ALT_DEG[0] - 1);
      expect(altDeg).toBeLessThanOrEqual(METEOR_ALT_DEG[1] + 1);
      const dot = m.from.x * m.to.x + m.from.y * m.to.y + m.from.z * m.to.z;
      const lenDeg = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
      expect(lenDeg).toBeGreaterThanOrEqual(METEOR_LENGTH_DEG[0] - 0.5);
      expect(lenDeg).toBeLessThanOrEqual(METEOR_LENGTH_DEG[1] + 0.5);
      expect(Math.hypot(m.from.x, m.from.y, m.from.z)).toBeCloseTo(1, 9);
    }
  });

  it('spawns frequently, respects the minimum gap, and never exceeds the concurrency cap', () => {
    const sim = new MeteorSimulation(seeded(3), 0);
    let spawns = 0;
    let lastStart = -Infinity;
    const seen = new Set<object>();
    for (let t = 0; t < 600; t += 1 / 30) {
      sim.update(t);
      expect(sim.current.length).toBeLessThanOrEqual(METEOR_MAX_ACTIVE);
      for (const m of sim.current) {
        if (!seen.has(m)) {
          seen.add(m);
          spawns++;
          expect(m.t0 - lastStart).toBeGreaterThanOrEqual(METEOR_MIN_GAP_S - 0.1);
          lastStart = m.t0;
        }
      }
    }
    // Ten minutes at a ~7 s mean interval → on the order of 60–120 meteors.
    expect(spawns).toBeGreaterThan(50);
    expect(spawns).toBeLessThan(140);
  });

  it('expires a meteor after its duration', () => {
    const sim = new MeteorSimulation(seeded(11), 0);
    sim.trigger(100);
    const m = sim.current[0];
    expect(m).toBeDefined();
    sim.update(100 + m.duration + 0.01);
    expect(sim.current.find((x) => x === m)).toBeUndefined();
  });
});
