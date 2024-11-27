import { Chain } from '@/client';

export const MIN_ETH_BALANCE_THRESHOLDS = {
  [Chain.GNOSIS]: {
    safeCreation: 1.5,
    safeAddSigner: 0.1,
  },
};

export const LOW_MASTER_SAFE_BALANCE = 5;
