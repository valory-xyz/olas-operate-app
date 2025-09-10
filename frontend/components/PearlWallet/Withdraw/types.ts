import { TokenSymbol } from '@/constants/token';
import { Nullable } from '@/types/Util';

export type AvailableAsset = {
  symbol: TokenSymbol;
  amount: number;
  value: number;
};

export type StakedAsset = {
  agentName: Nullable<string>;
  agentImgSrc: Nullable<string>;
  symbol: TokenSymbol;
  amount: number;
  value: number;
};
