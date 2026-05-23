/**
 * Seeded PRNG — xoshiro128** algorithm.
 * Deterministic: same seed always produces the same sequence.
 * No Math.random(), no Date.now().
 */

export interface Rng {
  /** Returns float in [0, 1) */
  next(): number;
  /** Returns integer in [min, max] (inclusive) */
  nextInt(min: number, max: number): number;
  /** Returns float in [min, max) */
  nextFloat(min: number, max: number): number;
  /** Returns current internal state for serialization */
  state(): [number, number, number, number];
}

/**
 * Splitmix32 — used to expand a single seed into 4 state values for xoshiro128**.
 */
function splitmix32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x9e3779b9) | 0;
    let t = seed ^ (seed >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    t = t ^ (t >>> 15);
    return (t >>> 0) / 4294967296;
  };
}

/**
 * Create a seeded PRNG instance using xoshiro128**.
 * @param seed - integer seed value
 */
export function createRng(seed: number): Rng {
  // Expand seed into 4 uint32 state values via splitmix32
  const sm = splitmix32(seed);
  let s0 = (sm() * 4294967296) >>> 0;
  let s1 = (sm() * 4294967296) >>> 0;
  let s2 = (sm() * 4294967296) >>> 0;
  let s3 = (sm() * 4294967296) >>> 0;

  // Ensure state is not all zeros
  if ((s0 | s1 | s2 | s3) === 0) {
    s0 = 1;
  }

  function rotl(x: number, k: number): number {
    return ((x << k) | (x >>> (32 - k))) >>> 0;
  }

  function nextU32(): number {
    const result = (Math.imul(rotl(Math.imul(s1, 5), 7), 9)) >>> 0;

    const t = (s1 << 9) >>> 0;

    s2 = (s2 ^ s0) >>> 0;
    s3 = (s3 ^ s1) >>> 0;
    s1 = (s1 ^ s2) >>> 0;
    s0 = (s0 ^ s3) >>> 0;

    s2 = (s2 ^ t) >>> 0;
    s3 = rotl(s3, 11);

    return result;
  }

  function next(): number {
    return nextU32() / 4294967296;
  }

  function nextInt(min: number, max: number): number {
    if (min > max) {
      throw new Error(`nextInt: min (${min}) must be <= max (${max})`);
    }
    if (min === max) return min;
    const range = max - min + 1;
    return min + (nextU32() % range);
  }

  function nextFloat(min: number, max: number): number {
    if (min > max) {
      throw new Error(`nextFloat: min (${min}) must be <= max (${max})`);
    }
    return min + next() * (max - min);
  }

  function state(): [number, number, number, number] {
    return [s0, s1, s2, s3];
  }

  return { next, nextInt, nextFloat, state };
}

/**
 * Create an RNG from a previously saved state (4 uint32 values).
 */
export function createRngFromState(s: [number, number, number, number]): Rng {
  return createRngWithState(s[0], s[1], s[2], s[3]);
}

function createRngWithState(
  initialS0: number,
  initialS1: number,
  initialS2: number,
  initialS3: number
): Rng {
  let s0 = initialS0 >>> 0;
  let s1 = initialS1 >>> 0;
  let s2 = initialS2 >>> 0;
  let s3 = initialS3 >>> 0;

  function rotl(x: number, k: number): number {
    return ((x << k) | (x >>> (32 - k))) >>> 0;
  }

  function nextU32(): number {
    const result = (Math.imul(rotl(Math.imul(s1, 5), 7), 9)) >>> 0;

    const t = (s1 << 9) >>> 0;

    s2 = (s2 ^ s0) >>> 0;
    s3 = (s3 ^ s1) >>> 0;
    s1 = (s1 ^ s2) >>> 0;
    s0 = (s0 ^ s3) >>> 0;

    s2 = (s2 ^ t) >>> 0;
    s3 = rotl(s3, 11);

    return result;
  }

  function next(): number {
    return nextU32() / 4294967296;
  }

  function nextInt(min: number, max: number): number {
    if (min > max) {
      throw new Error(`nextInt: min (${min}) must be <= max (${max})`);
    }
    if (min === max) return min;
    const range = max - min + 1;
    return min + (nextU32() % range);
  }

  function nextFloat(min: number, max: number): number {
    if (min > max) {
      throw new Error(`nextFloat: min (${min}) must be <= max (${max})`);
    }
    return min + next() * (max - min);
  }

  function state(): [number, number, number, number] {
    return [s0, s1, s2, s3];
  }

  return { next, nextInt, nextFloat, state };
}
