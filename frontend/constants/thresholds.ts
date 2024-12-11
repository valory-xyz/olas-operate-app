import { EvmChainId } from '@/enums/Chain';

// TODO: confirm eth requirements, very flaky, eth requirements will fluctuate
export const MIN_ETH_BALANCE_THRESHOLDS: Record<
  EvmChainId,
  {
    safeCreation: number;
    safeAddSigner: number;
  }
> = {
  [EvmChainId.Gnosis]: {
    safeCreation: 1.5,
    safeAddSigner: 0.1,
  },
  [EvmChainId.Optimism]: {
    safeCreation: 0.005,
    safeAddSigner: 0.005,
  },
  [EvmChainId.Ethereum]: {
    safeCreation: 0.02,
    safeAddSigner: 0.02,
  },
  [EvmChainId.Base]: {
    safeCreation: 0.005,
    safeAddSigner: 0.005,
  },
};

// TODO: update to support multi-chain, very poor implementation
export const LOW_AGENT_SAFE_BALANCE = 1.5;
export const LOW_MASTER_SAFE_BALANCE = 2;
