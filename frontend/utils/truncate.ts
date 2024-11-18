import { Address } from '@/types/Address';

export const truncateAddress = (address: Address, length = 4) =>
  `${address?.substring(0, 2 + length)}...${address?.substring(address.length - length, address.length)}`;
