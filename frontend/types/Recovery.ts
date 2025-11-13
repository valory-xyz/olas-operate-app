import { Address } from './Address';

export type ChainName = 'gnosis' | 'base' | 'mode' | 'optimism';

export type TokenBalance = Record<Address, number>;

export type SafeChainData = {
  [safeAddress: Address]: {
    backup_owners: Address[];
    balances: TokenBalance;
  };
};

export type ExtendedWalletResponse = {
  address: string;
  safes: Record<ChainName, SafeChainData>;
  safe_chains: ChainName[];
  ledger_type: string;
  safe_nonce: string | number;
  balances: Record<ChainName, Record<Address, TokenBalance>>;
  extended_json: boolean;
  consistent_safe_address: boolean;
  consistent_backup_owner: boolean;
  consistent_backup_owner_count: boolean;
};
