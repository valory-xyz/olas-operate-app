import { EvmChainId, EvmChainName } from '@/constants/chains';

export type WalletChain = { chainId: EvmChainId; chainName: EvmChainName };

export const STEPS = {
  PEARL_WALLET_SCREEN: 'PEARL_WALLET_SCREEN',

  // withdraw flow
  SELECT_AMOUNT_TO_WITHDRAW: 'SELECT_AMOUNT_TO_WITHDRAW',
  ENTER_WITHDRAWAL_ADDRESS: 'ENTER_WITHDRAWAL_ADDRESS',

  // deposit flow
  DEPOSIT: 'DEPOSIT',
  SELECT_PAYMENT_METHOD: 'SELECT_PAYMENT_METHOD',
} as const;
