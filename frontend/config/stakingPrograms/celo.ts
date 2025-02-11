import { Contract as MulticallContract } from 'ethers-multicall';

import { STAKING_TOKEN_PROXY_ABI } from '@/abis/stakingTokenProxy';
import { AgentType } from '@/enums/Agent';
import { EvmChainId } from '@/enums/Chain';
import { StakingProgramId } from '@/enums/StakingProgram';
import { TokenSymbol } from '@/enums/Token';
import { Address } from '@/types/Address';

import { CELO_STAKING_PROGRAMS_ACTIVITY_CHECKERS } from '../activityCheckers';
import { StakingProgramConfig } from '.';

type CeloStakingProgramId = StakingProgramId.MemeCeloAlpha2;

export const CELO_STAKING_PROGRAMS_CONTRACT_ADDRESSES: Record<
  CeloStakingProgramId,
  Address
> = {
  [StakingProgramId.MemeCeloAlpha2]:
    '0x95D12D193d466237Bc1E92a1a7756e4264f574AB',
};

export const CELO_STAKING_PROGRAMS: Record<
  CeloStakingProgramId,
  StakingProgramConfig
> = {
  [StakingProgramId.MemeCeloAlpha2]: {
    chainId: EvmChainId.Celo,
    name: 'MemeCelo Alpha II',
    agentsSupported: [AgentType.AgentsFunCelo],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 100,
    },
    activityChecker:
      CELO_STAKING_PROGRAMS_ACTIVITY_CHECKERS[StakingProgramId.MemeCeloAlpha2],
    contract: new MulticallContract(
      CELO_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.MemeCeloAlpha2],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
};
