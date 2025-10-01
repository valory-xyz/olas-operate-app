import { TokenSymbol } from '@/constants';

import { Address } from './Address';
import { Nullable } from './Util';

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

export type StakedAsset = {
  agentName: Nullable<string>;
  agentImgSrc: Nullable<string>;
  symbol: TokenSymbol;
  amount: number;
  value?: number;
};
