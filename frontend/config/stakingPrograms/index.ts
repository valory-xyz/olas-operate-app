import { Contract as MulticallContract } from 'ethers-multicall';

import { AgentType, EvmChainId, EvmChainIdMap } from '@/constants';
import { Address } from '@/types';

import { MechType } from '../mechs';
import { BASE_STAKING_PROGRAMS } from './base';
import { GNOSIS_STAKING_PROGRAMS } from './gnosis';
import { MODE_STAKING_PROGRAMS } from './mode';
import { OPTIMISM_STAKING_PROGRAMS } from './optimism';
import { POLYGON_STAKING_PROGRAMS } from './polygon';

/**
 * Single non-chain specific staking program configuration
 */
export type StakingProgramConfig = {
  chainId: EvmChainId;
  deprecated?: boolean; // hides program from UI unless user is already staked in this program
  /**
   * Off-chain per-epoch activity target (mech requests) for the decoupled-activity
   * staking regime (OPE-1803). Presence marks this program as "new regime": the
   * agent is "done for the epoch" when its on-chain activity count reaches this
   * target, rather than when the on-chain staking KPI is met (which is ~1 here).
   * Absent → legacy regime (eligibility == on-chain staking KPI). Must match the
   * agent's hardcoded `ACTIVITY_TARGET`.
   */
  activityTarget?: number;
  name: string;
  address: Address;
  agentsSupported: AgentType[];
  stakingRequirements: {
    [tokenSymbol: string]: number;
  };
  /** ethers-multicall contract instance for the staking contract */
  contract: MulticallContract;
  /** "agent" or "toolkit" — determines mech-based eligibility method */
  mechType?: MechType;
  /** mech contract for request counting */
  mech?: MulticallContract;
  /** contract for multisig nonce checking */
  activityChecker: MulticallContract;
  /** normalized address (padded to 64 hex chars) */
  id: string;
};

export type StakingProgramMap = {
  [stakingProgramId: string]: StakingProgramConfig;
};

export const STAKING_PROGRAMS: {
  [chainId in EvmChainId]: StakingProgramMap;
} = {
  [EvmChainIdMap.Gnosis]: GNOSIS_STAKING_PROGRAMS,
  [EvmChainIdMap.Base]: BASE_STAKING_PROGRAMS,
  [EvmChainIdMap.Mode]: MODE_STAKING_PROGRAMS,
  [EvmChainIdMap.Optimism]: OPTIMISM_STAKING_PROGRAMS,
  [EvmChainIdMap.Polygon]: POLYGON_STAKING_PROGRAMS,
};
