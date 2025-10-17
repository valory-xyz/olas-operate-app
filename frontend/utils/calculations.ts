import { ethers } from 'ethers';

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

/**
 * Sums an array of string numbers accurately using ethers' BigNumber utilities.
 *
 * @example
 * sumBigNumbers(['1.12345', '2.12345', '3.2'], 1) => '6.44685'
 *
 * @returns The total as a string, formatted with the given decimals
 */
export const sumNumbers = (values: string[], decimals: number = 18): string => {
  const total = values.reduce((acc, val) => {
    return acc.add(ethers.utils.parseUnits(val, decimals));
  }, ethers.BigNumber.from(0));
  return ethers.utils.formatUnits(total, decimals);
};
