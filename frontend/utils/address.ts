import { getAddress } from 'ethers/lib/utils';
import { toLower } from 'lodash';

import { Address } from '@/types/Address';

export const areAddressesEqual = (
  a1?: string | Address,
  a2?: string | Address,
) => {
  if (!a1 || !a2) return false;
  return toLower(a1) === toLower(a2);
};

export function getValueByAddress<T>(
  addressMap: Record<string | Address, T>,
  address: string,
): T | undefined {
  if (!address) return undefined;
  try {
    const checksummedAddress = getAddress(address);
    // Try direct match first
    if (addressMap[checksummedAddress] !== undefined) {
      return addressMap[checksummedAddress];
    }

    // Fallback: search keys case-insensitively using lodash's toLower
    const target = toLower(checksummedAddress);
    const foundKey = Object.keys(addressMap).find(
      (key) => toLower(key) === target,
    );
    return foundKey
      ? addressMap[foundKey as keyof typeof addressMap]
      : undefined;
  } catch {
    return undefined;
  }
}
