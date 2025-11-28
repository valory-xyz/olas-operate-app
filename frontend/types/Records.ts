import { TokenSymbolMap } from '@/constants';

import { Address } from './Address';

export type AddressNumberRecord = Record<Address, number>;
export type AddressBooleanRecord = Record<Address, boolean>;
export type AddressTxnRecord = Record<Address, `0x${string}`>;

// defines token balances in a wallet by token name
export type WalletAddressNumberRecord = Record<
  Address,
  Record<typeof TokenSymbolMap.ETH | typeof TokenSymbolMap.OLAS, number>
>;
