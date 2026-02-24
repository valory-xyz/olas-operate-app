import { Address } from '@/types';

/**
 * Given an address, returns a normalized staking program ID by lowercasing the address
 *
 * @example 0xAbC123... -> 0x000000000000000000000000abc123...
 */
export const deriveStakingProgramId = (address: Address): string => {
  const normalized = address.toLowerCase().replace(/^0x/, '');
  return `0x${normalized.padStart(64, '0')}`;
};
