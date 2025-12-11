import { Contract as MulticallContract } from 'ethers-multicall';

import {
  AgentType,
  EvmChainId,
  EvmChainIdMap,
  STAKING_PROGRAM_IDS,
  StakingProgramId,
} from '@/constants';
import { Address } from '@/types';

import { MechType } from '../mechs';
import {
  BASE_STAKING_PROGRAMS,
  BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
} from './base';
import {
  GNOSIS_STAKING_PROGRAMS,
  GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
} from './gnosis';
import {
  MODE_STAKING_PROGRAMS,
  MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
} from './mode';
import {
  OPTIMISM_STAKING_PROGRAMS,
  OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
} from './optimism';

/**
 * Single non-chain specific staking program configuration
 */
export type StakingProgramConfig = {
  chainId: EvmChainId;
  deprecated?: boolean; // hides program from UI unless user is already staked in this program
  name: string;
  agentsSupported: AgentType[];
  stakingRequirements: {
    [tokenSymbol: string]: number;
  };
  contract: MulticallContract;
  mechType?: MechType;
  mech?: MulticallContract;
  activityChecker: MulticallContract;
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
};

export const STAKING_PROGRAM_ADDRESS: {
  [chainId in EvmChainId]: Record<string, Address>;
} = {
  [EvmChainIdMap.Gnosis]: GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
  [EvmChainIdMap.Base]: BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
  [EvmChainIdMap.Mode]: MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
  [EvmChainIdMap.Optimism]: OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
};

export const DEFAULT_STAKING_PROGRAM_IDS: {
  [chainId in EvmChainId]: StakingProgramId;
} = {
  [EvmChainIdMap.Gnosis]: STAKING_PROGRAM_IDS.PearlBeta,
  [EvmChainIdMap.Base]: STAKING_PROGRAM_IDS.AgentsFun1,
  [EvmChainIdMap.Mode]: STAKING_PROGRAM_IDS.ModiusAlpha,
  [EvmChainIdMap.Optimism]: STAKING_PROGRAM_IDS.OptimusAlpha2,
};
