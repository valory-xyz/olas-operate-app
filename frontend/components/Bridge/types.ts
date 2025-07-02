import { BridgeRefillRequirementsRequest } from '@/types/Bridge';

export type SendFundAction = 'transfer' | 'bridge';

export type BridgeRetryOutcome = 'NEED_REFILL';

/**
 *  Function to get bridge requirements parameters.
 */
export type GetBridgeRequirementsParams = (
  forceUpdate?: boolean,
) => BridgeRefillRequirementsRequest | null;

/**
 * Currently only 3 steps are supported:
 * - "bridging": by default the first step
 * - "masterSafeCreationAndTransfer": if enabled, creates a master safe
 *   and transfers the bridged funds to it, step 2 & 3.
 */
export type EnabledSteps = Array<'masterSafeCreationAndTransfer'>;
