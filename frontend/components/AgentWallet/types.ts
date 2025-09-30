import { EvmChainId, EvmChainName } from '@/constants/chains';
import { TokenSymbol } from '@/constants/token';
import { Nullable } from '@/types/Util';

export type AvailableAsset = {
  address?: string;
  symbol: TokenSymbol;
  amount: number;
  valueInUsd: number;
};

export type TransactionHistory = {
  type: 'deposit' | 'withdrawal';
  amount: number;
  symbol: TokenSymbol;
};

export type StakedAsset = {
  agentName: Nullable<string>;
  agentImgSrc: Nullable<string>;
  symbol: TokenSymbol;
  amount: number;
  value: number;
};

export type WalletChain = { chainId: EvmChainId; chainName: EvmChainName };

export const STEPS = {
  AGENT_WALLET_SCREEN: 'AGENT_WALLET_SCREEN',
  WITHDRAW_FROM_AGENT_WALLET: 'WITHDRAW_FROM_AGENT_WALLET',
  FUND_AGENT: 'FUND_AGENT',
} as const;
