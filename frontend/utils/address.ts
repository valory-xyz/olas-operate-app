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

export function getValueByAddress<T, K extends string | Address = string>(
  addressMap: Record<K, T>,
  address: string,
): T | undefined {
  if (!address) return undefined;
  try {
    const checksummedAddress = getAddress(address);
    if (addressMap[checksummedAddress as K] !== undefined) {
      return addressMap[checksummedAddress as K];
    }
    const target = toLower(checksummedAddress);
    const foundKey = Object.keys(addressMap).find(
      (key) => toLower(key) === target,
    );
    return foundKey ? addressMap[foundKey as K] : undefined;
  } catch {
    return undefined;
  }
}
