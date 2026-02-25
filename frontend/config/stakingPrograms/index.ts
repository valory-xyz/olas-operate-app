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
  name: string;
  address: Address;
  agentsSupported: AgentType[];
  stakingRequirements: {
    [tokenSymbol: string]: number;
  };
  contract: MulticallContract;
  mechType?: MechType;
  mech?: MulticallContract;
  activityChecker: MulticallContract;
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
