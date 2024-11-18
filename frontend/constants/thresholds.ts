import { MiddlewareChain } from '@/client';

/**
 * @warning must be updated to be dynamic
 */
export const MIN_ETH_BALANCE_THRESHOLDS = {
  // [Chain.GNOSIS]: {
  //   safeCreation: 1.5,
  //   safeAddSigner: 0.1,
  // },
  [MiddlewareChain.OPTIMISM]: {
    safeCreation: 0.005,
    safeAddSigner: 0.005,
  },
  [MiddlewareChain.ETHEREUM]: {
    safeCreation: 0.02,
    safeAddSigner: 0.02,
  },
  [MiddlewareChain.BASE]: {
    safeCreation: 0.005,
    safeAddSigner: 0.005,
  },
};

export const LOW_AGENT_SAFE_BALANCE = 0.5;
export const LOW_MASTER_SAFE_BALANCE = 2;
