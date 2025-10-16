/**
 * Calculates the maximum value from a list of bigints.
 * @param args - List of bigints to compare
 * @returns The maximum value among the provided bigints
 * @example bigintMax(1n, 2n, 3n); // returns 3n
 */
export function bigintMax(...args: bigint[]): bigint {
  return args.reduce((max, val) => (val > max ? val : max));
}

/**
 * Calculates the minimum value from a list of bigints.
 * @param args - List of bigints to compare
 * @returns The minimum value among the provided bigints
 * @example bigintMin(1n, 2n, 3n); // returns 1n
 */
export function bigintMin(...args: bigint[]): bigint {
  return args.reduce((min, val) => (val < min ? val : min));
}
