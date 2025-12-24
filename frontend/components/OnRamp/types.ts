import { EvmChainId } from '@/constants';
import { Nullable } from '@/types';

export type OnRampMode = 'onboarding' | 'depositing';

export type OnRampNetworkConfig = {
  networkId: Nullable<EvmChainId>;
  networkName: Nullable<string>;
  cryptoCurrencyCode: Nullable<string>;
  selectedChainId: Nullable<EvmChainId>;
};
