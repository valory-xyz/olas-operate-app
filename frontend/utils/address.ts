import { toLower } from 'lodash';

import { Address } from '@/types/Address';

export const areAddressesEqual = (
  a1?: string | Address,
  a2?: string | Address,
) => {
  if (!a1 || !a2) return false;
  return toLower(a1) === toLower(a2);
};
