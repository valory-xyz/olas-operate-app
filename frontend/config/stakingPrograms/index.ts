import { Contract as MulticallContract } from 'ethers-multicall';

import { AgentType } from '@/enums/Agent';
import { EvmChainId } from '@/enums/Chain';
import { StakingProgram, StakingProgramId } from '@/enums/StakingProgram';
import { Address } from '@/types/Address';

import { MechType } from '../mechs';
import {
  BASE_STAKING_PROGRAMS,
  BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
} from './base';
import {
  CELO_STAKING_PROGRAMS,
  CELO_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
} from './celo';
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
  [EvmChainId.Gnosis]: GNOSIS_STAKING_PROGRAMS,
  [EvmChainId.Base]: BASE_STAKING_PROGRAMS,
  [EvmChainId.Mode]: MODE_STAKING_PROGRAMS,
  [EvmChainId.Celo]: CELO_STAKING_PROGRAMS,
  [EvmChainId.Optimism]: OPTIMISM_STAKING_PROGRAMS,
};

export const STAKING_PROGRAM_ADDRESS: {
  [chainId in EvmChainId]: Record<string, Address>;
} = {
  [EvmChainId.Gnosis]: GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
  [EvmChainId.Base]: BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
  [EvmChainId.Mode]: MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
  [EvmChainId.Celo]: CELO_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
  [EvmChainId.Optimism]: OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES,
};

export const DEFAULT_STAKING_PROGRAM_IDS: {
  [chainId in EvmChainId]: StakingProgram;
} = {
  [EvmChainId.Gnosis]: StakingProgramId.PearlBeta,
  [EvmChainId.Base]: StakingProgramId.MemeBaseAlpha2,
  [EvmChainId.Mode]: StakingProgramId.ModiusAlpha,
  [EvmChainId.Celo]: StakingProgramId.MemeCeloAlpha2,
  [EvmChainId.Optimism]: StakingProgramId.OptimusAlpha1, // TODO: check
};
