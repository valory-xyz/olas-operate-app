import { BridgeRefillRequirementsRequest } from '@/types/Bridge';

export type SendFundAction = 'transfer' | 'bridge' | 'onRamp';

export type BridgeRetryOutcome = 'NEED_REFILL';

export type BridgeMode = 'onboarding' | 'depositing';

/**
 *  Function to get bridge requirements parameters.
 */
export type GetBridgeRequirementsParams = (
  forceUpdate?: boolean,
) => BridgeRefillRequirementsRequest | null;
