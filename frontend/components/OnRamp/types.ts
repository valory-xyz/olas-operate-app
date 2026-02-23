import { EvmChainId } from '@/constants';
import { Nullable } from '@/types';
import { BridgeRefillRequirementsRequest } from '@/types/Bridge';

export type OnRampMode = 'onboard' | 'deposit';

/**
 * Function to get on-ramp requirements parameters.
 * For onboarding: gets requirements from endpoint based on selected agent
 * For depositing: can be calculated from user-provided inputs
 */
export type GetOnRampRequirementsParams = (
  forceUpdate?: boolean,
) => BridgeRefillRequirementsRequest | null;

export type OnRampNetworkConfig = {
  networkId: Nullable<EvmChainId>;
  networkName: Nullable<string>;
  cryptoCurrencyCode: Nullable<string>;
  selectedChainId: Nullable<EvmChainId>;
};
