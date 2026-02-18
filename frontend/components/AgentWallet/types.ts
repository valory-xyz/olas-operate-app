import { TokenSymbol } from '@/config/tokens';
import { EvmChainId, EvmChainName } from '@/constants/chains';

export type TransactionHistory = {
  type: 'deposit' | 'withdrawal';
  amount: number;
  symbol: TokenSymbol;
};

export type WalletChain = { chainId: EvmChainId; chainName: EvmChainName };

export const STEPS = {
  AGENT_WALLET_SCREEN: 'AGENT_WALLET_SCREEN',
  WITHDRAW_FROM_AGENT_WALLET: 'WITHDRAW_FROM_AGENT_WALLET',
  FUND_AGENT: 'FUND_AGENT',
} as const;
