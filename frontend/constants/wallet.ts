import { Address } from '@/types/Address';

import { EvmChainId } from './chains';

export const WALLET_TYPE = {
  Safe: 'multisig',
  EOA: 'eoa',
} as const;

export const WALLET_OWNER = {
  Master: 'master',
  Agent: 'agent',
} as const;

// types of wallet
type Eoa = {
  address: Address;
  type: typeof WALLET_TYPE.EOA;
};

export type Safe = {
  address: Address;
  type: typeof WALLET_TYPE.Safe;
  evmChainId: EvmChainId;
};

// owned EOAs
export type MasterEoa = Eoa & { owner: typeof WALLET_OWNER.Master };
export type AgentEoa = Eoa & { owner: typeof WALLET_OWNER.Agent };

// owned safes
export type MasterSafe = Safe & { owner: typeof WALLET_OWNER.Master };
export type AgentSafe = Safe & { owner: typeof WALLET_OWNER.Agent };

// generic wallets
export type MasterWallet = MasterEoa | MasterSafe;
export type AgentWallet = AgentEoa | AgentSafe;
