/**
 * Calculates the maximum value from a list of bigints.
 * @param args - List of bigints to compare
 * @returns The maximum value among the provided bigints
 * @example bigintMax(1n, 2n, 3n); // returns 3n
 */
export function bigintMax(...args: bigint[]): bigint {
  return args.reduce((max, val) => (val > max ? val : max));
}
