/**
 * SecureRandom - Cryptographically Secure Random Number Generation
 *
 * Replaces Math.random() with crypto-based alternatives to address OWASP A04:2025
 * CWE-338 (Use of Cryptographically Weak Pseudo-Random Number Generator)
 *
 * @see https://owasp.org/Top10/A04_2025-Cryptographic_Failures/
 * @see https://nodejs.org/api/crypto.html
 */

import { randomUUID, randomBytes, randomInt } from 'crypto';

/**
 * Generates a cryptographically secure unique identifier.
 * Uses crypto.randomUUID() which is RFC 4122 v4 compliant.
 *
 * @param prefix - Optional prefix for the ID
 * @returns A secure unique identifier string
 *
 * @example
 * generateSecureId() // "550e8400-e29b-41d4-a716-446655440000"
 * generateSecureId('session') // "session_550e8400-e29b-41d4-a716-446655440000"
 */
export function generateSecureId(prefix?: string): string {
  const uuid = randomUUID();
  return prefix ? `${prefix}_${uuid}` : uuid;
}

/**
 * Generates a short secure ID using timestamp and random hex.
 * Useful for IDs that need to be human-readable but still secure.
 *
 * @param prefix - Optional prefix for the ID
 * @returns A shorter secure identifier string
 *
 * @example
 * generateShortSecureId('belief') // "belief_1705123456789_a1b2c3d4e5"
 */
export function generateShortSecureId(prefix?: string): string {
  const timestamp = Date.now();
  const randomHex = randomBytes(5).toString('hex'); // 10 hex chars
  return prefix ? `${prefix}_${timestamp}_${randomHex}` : `${timestamp}_${randomHex}`;
}

/**
 * Cryptographically secure replacement for Math.random().
 * Returns a value in [0, 1) range with uniform distribution.
 *
 * Uses 32-bit random value from crypto.randomBytes() normalized to [0, 1).
 *
 * @returns A cryptographically secure random number in [0, 1)
 *
 * @example
 * secureRandom() // 0.7342891...
 */
export function secureRandom(): number {
  // Use 4 bytes (32 bits) for sufficient precision
  const buffer = randomBytes(4);
  // Read as unsigned 32-bit integer and normalize to [0, 1)
  const value = buffer.readUInt32BE(0);
  return value / 0x100000000; // Divide by 2^32
}

/**
 * Generates a cryptographically secure random integer in [min, max] range (inclusive).
 * Uses Node.js crypto.randomInt() which is designed for this purpose.
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns A cryptographically secure random integer
 *
 * @example
 * secureRandomInt(0, 10) // Returns integer from 0 to 10 inclusive
 * secureRandomInt(1, 6) // Simulates a die roll
 */
export function secureRandomInt(min: number, max: number): number {
  // crypto.randomInt uses [min, max) so we add 1 to max for inclusive range
  return randomInt(min, max + 1);
}

/**
 * Generates a pair of independent Gaussian (normal) random numbers
 * using the Box-Muller transform with cryptographically secure random inputs.
 *
 * @param mean - The mean of the distribution (default: 0)
 * @param stdDev - The standard deviation (default: 1)
 * @returns An array of two independent Gaussian random numbers
 *
 * @example
 * boxMullerSecure() // [0.234, -1.567] - standard normal
 * boxMullerSecure(100, 15) // [98.2, 112.3] - IQ-like distribution
 */
export function boxMullerSecure(mean = 0, stdDev = 1): [number, number] {
  let u1: number;

  // Ensure u1 > 0 to avoid log(0)
  do {
    u1 = secureRandom();
  } while (u1 === 0);

  const u2 = secureRandom();

  const mag = stdDev * Math.sqrt(-2.0 * Math.log(u1));
  const z0 = mag * Math.cos(2.0 * Math.PI * u2) + mean;
  const z1 = mag * Math.sin(2.0 * Math.PI * u2) + mean;

  return [z0, z1];
}

/**
 * Generates a single Gaussian (normal) random number.
 * Convenience wrapper around boxMullerSecure.
 *
 * @param mean - The mean of the distribution (default: 0)
 * @param stdDev - The standard deviation (default: 1)
 * @returns A Gaussian random number
 */
export function gaussianSecure(mean = 0, stdDev = 1): number {
  return boxMullerSecure(mean, stdDev)[0];
}

/**
 * Samples from a Beta distribution using secure random numbers.
 * Uses the relationship between Gamma and Beta distributions.
 *
 * @param alpha - Shape parameter alpha (> 0)
 * @param beta - Shape parameter beta (> 0)
 * @returns A random sample from Beta(alpha, beta)
 */
export function betaSampleSecure(alpha: number, beta: number): number {
  // Use Gamma sampling for accurate Beta distribution
  const gammaA = gammaSampleSecure(alpha, 1);
  const gammaB = gammaSampleSecure(beta, 1);
  return gammaA / (gammaA + gammaB);
}

/**
 * Samples from a Gamma distribution using secure random numbers.
 * Uses Marsaglia and Tsang's method for shape >= 1.
 *
 * @param shape - Shape parameter (k or alpha) > 0
 * @param scale - Scale parameter (theta) > 0
 * @returns A random sample from Gamma(shape, scale)
 */
export function gammaSampleSecure(shape: number, scale: number): number {
  if (shape < 1) {
    // For shape < 1, use the transformation method
    const u = secureRandom();
    return gammaSampleSecure(shape + 1, scale) * Math.pow(u, 1 / shape);
  }

  // Marsaglia and Tsang's method for shape >= 1
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;

    do {
      x = gaussianSecure();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = secureRandom();

    if (u < 1 - 0.0331 * (x * x) * (x * x)) {
      return d * v * scale;
    }

    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v * scale;
    }
  }
}

/**
 * Performs Fisher-Yates shuffle using cryptographically secure random.
 * Mutates the array in place.
 *
 * @param array - The array to shuffle (mutated in place)
 * @returns The shuffled array (same reference)
 */
export function shuffleSecure<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    const temp = array[i]!;
    array[i] = array[j]!;
    array[j] = temp;
  }
  return array;
}

/**
 * Selects a random element from an array using secure random.
 *
 * @param array - The array to select from
 * @returns A randomly selected element
 * @throws Error if array is empty
 */
export function randomElementSecure<T>(array: readonly T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot select from empty array');
  }
  return array[randomInt(0, array.length)]!;
}

/**
 * Returns true with the given probability, using secure random.
 *
 * @param probability - The probability of returning true [0, 1]
 * @returns true with the given probability
 */
export function randomBooleanSecure(probability: number): boolean {
  return secureRandom() < probability;
}

/**
 * Selects an index based on weighted probabilities using secure random.
 *
 * @param weights - Array of weights (must be non-negative)
 * @returns The selected index
 * @throws Error if all weights are zero or array is empty
 */
export function weightedRandomIndexSecure(weights: readonly number[]): number {
  if (weights.length === 0) {
    throw new Error('Cannot select from empty weights array');
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  if (totalWeight === 0) {
    throw new Error('Total weight must be greater than zero');
  }

  let random = secureRandom() * totalWeight;

  for (let i = 0; i < weights.length; i++) {
    const weight = weights[i] ?? 0;
    random -= weight;
    if (random <= 0) {
      return i;
    }
  }

  return weights.length - 1;
}
