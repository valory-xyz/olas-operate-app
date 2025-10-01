import { EvmChainId, EvmChainName } from '@/constants/chains';

export type WalletChain = { chainId: EvmChainId; chainName: EvmChainName };

export const STEPS = {
  PEARL_WALLET_SCREEN: 'PEARL_WALLET_SCREEN',
  SELECT_AMOUNT: 'SELECT_AMOUNT',
  ENTER_WITHDRAWAL_ADDRESS: 'ENTER_WITHDRAWAL_ADDRESS',
  DEPOSIT: 'DEPOSIT',
} as const;
