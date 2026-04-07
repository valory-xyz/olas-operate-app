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
};

export type FundRecoveryServiceInfo = {
  chain_id: number;
  service_id: number;
  state: string;
  can_unstake: boolean;
};

export type FundRecoveryScanResponse = {
  master_eoa_address: string;
  balances: ChainAmounts;
  services: FundRecoveryServiceInfo[];
  gas_warning: Record<string, { insufficient: boolean }>;
};

export type FundRecoveryExecuteRequest = {
  mnemonic: string;
  destination_address: string;
};

export type FundRecoveryExecuteSuccess = {
  success: true;
  partial_failure: false;
  total_funds_moved: ChainAmounts;
  errors: string[];
};

export type FundRecoveryExecutePartial = {
  success: false;
  partial_failure: true;
  total_funds_moved: ChainAmounts;
  errors: string[];
};

export type FundRecoveryExecuteResponse =
  | FundRecoveryExecuteSuccess
  | FundRecoveryExecutePartial;
