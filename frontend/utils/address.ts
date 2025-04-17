import { toLower } from 'lodash';

import { Address } from '@/types/Address';

export const areAddressesEqual = (a1: string | Address, a2: string | Address) =>
  toLower(a1) === toLower(a2);
