import { TokenSymbol } from '@/config/tokens';
import { EvmChainId } from '@/constants';
import { Address } from '@/types/Address';

export type WalletBalance = {
  walletAddress: Address;
  evmChainId: EvmChainId;
  symbol: TokenSymbol;
  isNative: boolean;
  /** @deprecated Use balanceString instead for accurate balance representation */
  balance: number;
  /**
   * Formatted balance but in string and NOT losing precision.
   * @example
   * Number(3.750000070429620336) = 3.7500000704296204
   * */
  balanceString?: string;
  isWrappedToken?: boolean;
};

export type CrossChainStakedBalances = Array<{
  serviceId: string;
  evmChainId: number;
  olasBondBalance: number;
  olasDepositBalance: number;
  walletAddress: Address;
}>;
