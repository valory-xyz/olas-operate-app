import { ChainId } from '@/enums/Chain';

// TODO

/**
 * @warning must be updated to be dynamic
 */
export const MIN_ETH_BALANCE_THRESHOLDS = {
  [ChainId.Gnosis]: {
    safeCreation: 1.5,
    safeAddSigner: 0.1,
  },
  [ChainId.Optimism]: {
    safeCreation: 0.005,
    safeAddSigner: 0.005,
  },
  [ChainId.Ethereum]: {
    safeCreation: 0.02,
    safeAddSigner: 0.02,
  },
  [ChainId.Base]: {
    safeCreation: 0.005,
    safeAddSigner: 0.005,
  },
};

export const LOW_AGENT_SAFE_BALANCE = 0.5;

export const LOW_MASTER_SAFE_BALANCE = 2;
