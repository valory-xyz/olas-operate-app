import { TokenSymbol } from '@/constants';

import { Address } from './Address';

export type SafeCreationResponse = {
  safe: Address;
  message: string;
  create_tx?: string;
};

export type AvailableAsset = {
  address?: string;
  symbol: TokenSymbol;
  amount: number;
  valueInUsd: number;
};
