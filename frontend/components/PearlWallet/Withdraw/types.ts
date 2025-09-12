import { EvmChainId, EvmChainName } from '@/constants/chains';
import { TokenSymbol } from '@/constants/token';
import { Nullable } from '@/types/Util';

export type AvailableAsset = {
  address?: string;
  symbol: TokenSymbol;
  amount: number;
  valueInUsd: number;
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
  PEARL_WALLET_SCREEN: 'PEARL_WALLET_SCREEN',
  SELECT_AMOUNT: 'SELECT_AMOUNT',
  ENTER_WITHDRAWAL_ADDRESS: 'ENTER_WITHDRAWAL_ADDRESS',
} as const;
