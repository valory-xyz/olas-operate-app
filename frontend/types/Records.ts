import { Address } from './Address';

export type AddressNumberRecord = Record<Address, number>;
export type AddressTxnRecord = Record<Address, `0x${string}`>;
