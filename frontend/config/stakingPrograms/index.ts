import { Contract as MulticallContract } from 'ethers-multicall';

import { AgentType } from '@/enums/Agent';
import { EvmChainId } from '@/enums/Chain';
import { StakingProgramId } from '@/enums/StakingProgram';
import { Address } from '@/types/Address';

import { MechType } from '../mechs';
import {
  GNOSIS_STAKING_PROGRAMS,
  GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
} from './gnosis';
// import {
//   OPTIMISM_STAKING_PROGRAMS,
//   OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
// } from './optimism';

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
  [chainId: number | EvmChainId]: StakingProgramMap;
} = {
  [EvmChainId.Gnosis]: GNOSIS_STAKING_PROGRAMS,
  // [ChainId.Optimism]: OPTIMISM_STAKING_PROGRAMS,
};

export const STAKING_PROGRAM_ADDRESS: {
  [chainId: number | EvmChainId]: Record<string, Address>;
} = {
  [EvmChainId.Gnosis]: GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
  // [ChainId.Optimism]: OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
};

export const DEFAULT_STAKING_PROGRAM_IDS: {
  [chainId: number | EvmChainId]: StakingProgramId;
} = {
  [EvmChainId.Gnosis]: StakingProgramId.PearlBeta,
  // [ChainId.Optimism]: StakingProgramId.OptimusAlpha,
};
