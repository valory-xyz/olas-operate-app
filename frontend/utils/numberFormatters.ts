import { BigNumberish, ethers } from 'ethers';
import { ceil } from 'lodash';

/**
 * Displays balance in a human readable format
 * e.g. 10000000000 => 1.0B
 */
export const balanceFormat = (
  balance: number | undefined,
  decimals = 2,
): string => {
  if (balance === undefined) return '--';
  return Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(balance);
};

/**
 * Formats larger numbers into small numbers
 * @note **divides** the input by 10^decimals
 * @example `formatUnits('1000000000000000000', 18)` => '1.0'
 */
export const formatUnits = (value: BigNumberish, decimals = 18): string => {
  return ethers.utils.formatUnits(value, decimals);
};

/**
 *
 * Formats larger numbers into small numbers and returns a number (at most 4 decimal places)
 * @example `formatUnitsToNumber('1000000000000000000', 18)` => 1.0
 */
export const formatUnitsToNumber = (
  value: BigNumberish,
  decimals = 18,
  precision = 4,
): number => {
  return ceil(parseFloat(formatUnits(value, decimals)), precision);
};

/**
 * Assumes the input is in wei and converts it to ether
 * @example `formatEther('1000000000000000000')` => '1.0'
 */
export const formatEther = (wei: BigNumberish): string => {
  return ethers.utils.formatEther(wei);
};

/**
 * Converts small numbers into larger numbers
 * @note **multiplies** the input by `10 ** decimals`
 * @example parseUnits('1.0', 18) => '1000000000000000000'
 */
export const parseUnits = (
  value: BigNumberish,
  decimals: number = 18,
): string => {
  return ethers.utils.parseUnits(`${value}`, decimals).toString();
};

/**
 * Assumes the input is in ether and converts it to wei
 */
export const parseEther = (ether: BigNumberish): string => {
  return ethers.utils.parseEther(`${ether}`).toString();
};
