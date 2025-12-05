import { Contract as MulticallContract } from 'ethers-multicall';

import { AgentType } from '@/enums/Agent';
import { EvmChainId } from '@/enums/Chain';
import { Address } from '@/types/Address';

import { MechType } from '../mechs';
import { BASE_STAKING_PROGRAMS } from './base';
import { GNOSIS_STAKING_PROGRAMS } from './gnosis';
import { MODE_STAKING_PROGRAMS } from './mode';
import { OPTIMISM_STAKING_PROGRAMS } from './optimism';

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
  [EvmChainId.Optimism]: OPTIMISM_STAKING_PROGRAMS,
};
