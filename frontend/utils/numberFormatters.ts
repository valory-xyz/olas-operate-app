import { BigNumberish, ethers } from 'ethers';
import { ceil, isNil } from 'lodash';

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
 * @deprecated Use `formatAmount` instead
 *
 * Displays balance in a human readable format
 * @example 1234.578 => 1,234.58
 */
export const formatNumber = (
  amount: number | string | undefined,
  decimals = 2,
  round: 'ceil' | 'floor' = 'ceil',
): string => {
  if (amount === undefined) return '--';

  const amountInNumber =
    typeof amount === 'string' ? parseFloat(amount) : amount;

  // Round the amount to the specified number of decimals
  const factor = 10 ** decimals;
  const adjustedAmount = amountInNumber * factor;
  // Extra precision to avoid floating point exception
  const amountWithPrecision = parseFloat(adjustedAmount.toFixed(12));

  const rounded =
    round === 'ceil'
      ? Math.ceil(amountWithPrecision) / factor
      : Math.floor(amountWithPrecision) / factor;

  // Format the number with commas and the specified decimals
  return Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(rounded);
};

/**
 * Accepts a number or numeric string and returns a locale-formatted string.
 * @example formatAmount('1234.578', 2) => '1,234.58'
 */
export const formatAmount = (
  amount: number | string | undefined,
  decimals = 2,
  round: 'ceil' | 'floor' = 'ceil',
): string => {
  return formatNumber(amount, decimals, round);
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

/**
 *
 * @deprecated This workaround shouldn't exist.
 * BE sends numbers in requirements which for large numbers breaks FE (should be bigNumbers)
 * Until they send strings, use this to quickly fix the issue
 */
export const numberToPlainString = (
  possiblyBrokenBigNumber: string | number,
) => {
  if (typeof possiblyBrokenBigNumber === 'number') {
    return possiblyBrokenBigNumber.toLocaleString('fullwide', {
      useGrouping: false,
    });
  }
  return possiblyBrokenBigNumber;
};

/**
 * Removes trailing zeros from decimal numbers
 * @example formatAmountNormalized(1234.578) => '1234.578'
 * @example formatAmountNormalized(1234.0) => '1234'
 */
export const formatAmountNormalized = (
  amount: number,
  decimals = 4,
): string => {
  if (isNil(amount) || !Number.isFinite(amount)) {
    return '0';
  }
  if (Number.isInteger(amount)) {
    return amount.toString();
  }
  return amount.toFixed(decimals).replace(/\.?0+$/, '');
};
