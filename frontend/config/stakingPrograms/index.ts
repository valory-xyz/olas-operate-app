import { Contract as MulticallContract } from 'ethers-multicall';

import { AgentType } from '@/enums/Agent';
import { ChainId } from '@/enums/Chain';
import { Address } from '@/types/Address';

import {
  GNOSIS_STAKING_PROGRAMS,
  GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
} from './gnosis';
import {
  OPTIMISM_STAKING_PROGRAMS,
  OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
} from './optimism';

/**
 * Single non-chain specific staking program configuration
 */
export type StakingProgramConfig = {
  chainId: ChainId;
  deprecated?: boolean; // hides program from UI unless user is already staked in this program
  name: string;
  agentsSupported: AgentType[];
  stakingRequirements: {
    [tokenSymbol: string]: number;
  };
  contract: MulticallContract;
  mech?: MulticallContract;
  activityChecker: MulticallContract;
};

export type StakingProgramMap = {
  [stakingProgramId: string]: StakingProgramConfig;
};

export type StakingProgramMapByChains = {
  [chainId: number | ChainId]: StakingProgramMap;
};

export const STAKING_PROGRAMS: StakingProgramMapByChains = {
  [ChainId.Gnosis]: GNOSIS_STAKING_PROGRAMS,
  [ChainId.Optimism]: OPTIMISM_STAKING_PROGRAMS,
};

export const STAKING_PROGRAM_ADDRESS: Record<string, Address> = {
  ...GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
  ...OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
};
