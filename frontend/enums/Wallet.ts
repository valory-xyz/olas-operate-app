import { Address } from '@/types/Address';

import { EvmChainId } from './Chain';

export enum WalletType {
  Safe = 'multisig',
  EOA = 'eoa',
}
export enum WalletOwnerType {
  Master = 'master', // user
  Agent = 'agent',
}

// types of wallet
export type Eoa = {
  address: Address;
  type: WalletType.EOA;
};

export type Safe = {
  address: Address;
  type: WalletType.Safe;
  evmChainId: EvmChainId;
};

// owned eoas
export type MasterEoa = Eoa & { owner: WalletOwnerType.Master };

export type AgentEoa = Eoa & { owner: WalletOwnerType.Agent };

// owned safes
export type MasterSafe = Safe & { owner: WalletOwnerType.Master };

export type AgentSafe = Safe & { owner: WalletOwnerType.Agent };

// generic wallets
export type MasterWallet = MasterEoa | MasterSafe;
export type AgentWallet = AgentEoa | AgentSafe;
export type Wallet = MasterWallet | AgentWallet;
