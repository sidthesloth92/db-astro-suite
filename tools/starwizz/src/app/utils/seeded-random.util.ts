/**
 * Small deterministic pseudo-random generator (mulberry32). The 3D scene uses it so the same
 * photo always produces the same star depths, and specs can reproduce a run exactly.
 *
 * @param seed - Any integer; the same seed yields the same sequence
 * @returns A function returning the next value in [0, 1)
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
