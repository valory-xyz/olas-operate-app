import { BridgeRefillRequirementsRequest } from '@/types/Bridge';

export type BridgeRetryOutcome = 'NEED_REFILL';

export type GetBridgeRequirementsParams = (
  forceUpdate?: boolean,
) => BridgeRefillRequirementsRequest | null;
