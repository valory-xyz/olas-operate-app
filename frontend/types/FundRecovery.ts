import { Address } from './Address';

/**
 * chain_id (as string) → address → token → amount as string
 * e.g. { "100": { "0xMasterEoa": { "0xToken": "1000000000000000000" } } }
 */
export type ChainAmounts = Record<
  string,
  Record<Address, Record<Address, string>>
>;

export type FundRecoveryScanRequest = {
  mnemonic: string;
  destination?: string;
};

export type FundRecoveryServiceInfo = {
  chain_id: number;
  service_id: number;
  state: string;
  can_unstake: boolean;
};

export type FundRecoveryScanResponse = {
  balances: ChainAmounts;
  services: FundRecoveryServiceInfo[];
  gas_warnings: Array<{ chain_id: number; message: string }>;
};

export type FundRecoveryExecuteRequest = {
  mnemonic: string;
  destination: string;
};

export type FundRecoveryExecuteResponse = {
  partial_failure: boolean;
  total_funds_moved: ChainAmounts;
  services_recovered: FundRecoveryServiceInfo[];
};
