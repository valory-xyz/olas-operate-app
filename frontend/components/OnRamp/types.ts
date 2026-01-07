import { EvmChainId } from '@/constants';
import { Nullable } from '@/types';

export type OnRampMode = 'onboard' | 'deposit';

export type OnRampNetworkConfig = {
  networkId: Nullable<EvmChainId>;
  networkName: Nullable<string>;
  cryptoCurrencyCode: Nullable<string>;
  selectedChainId: Nullable<EvmChainId>;
};
