import { Contract as MulticallContract } from 'ethers-multicall';

import { STAKING_TOKEN_PROXY_ABI } from '@/abis/stakingTokenProxy';
import { AgentType } from '@/enums/Agent';
import { EvmChainId } from '@/enums/Chain';
import { StakingProgramId } from '@/enums/StakingProgram';
import { TokenSymbol } from '@/enums/Token';
import { Address } from '@/types/Address';

import { BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS } from '../activityCheckers';
import { StakingProgramMap } from '.';

export const BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES: Record<string, Address> =
  {
    [StakingProgramId.MemeBaseAlpha2]:
      '0xc653622FD75026a020995a1d8c8651316cBBc4dA',
    [StakingProgramId.MemeBaseBeta]:
      '0x6011E09e7c095e76980b22498d69dF18EB62BeD8',
    [StakingProgramId.MemeBaseBeta2]:
      '0xfb7669c3AdF673b3A545Fa5acd987dbfdA805e22',
    [StakingProgramId.MemeBaseBeta3]:
      '0xCA61633b03c54F64b6A7F1f9A9C0A6Feb231Cc4D',
  };

export const BASE_STAKING_PROGRAMS: StakingProgramMap = {
  [StakingProgramId.MemeBaseAlpha2]: {
    chainId: EvmChainId.Base,
    name: 'MemeBase Alpha II',
    agentsSupported: [AgentType.Memeooorr],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 100,
    },
    activityChecker:
      BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[StakingProgramId.MemeBaseAlpha2],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.MemeBaseAlpha2],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [StakingProgramId.MemeBaseBeta]: {
    chainId: EvmChainId.Base,
    name: 'MemeBase Beta I',
    agentsSupported: [AgentType.Memeooorr],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 100,
    },
    activityChecker:
      BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[StakingProgramId.MemeBaseBeta],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.MemeBaseBeta],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [StakingProgramId.MemeBaseBeta2]: {
    chainId: EvmChainId.Base,
    name: 'MemeBase Beta II',
    agentsSupported: [AgentType.Memeooorr],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 1000,
    },
    activityChecker:
      BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[StakingProgramId.MemeBaseBeta2],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.MemeBaseBeta2],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [StakingProgramId.MemeBaseBeta3]: {
    chainId: EvmChainId.Base,
    name: 'MemeBase Beta III',
    agentsSupported: [AgentType.Memeooorr],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 5000,
    },
    activityChecker:
      BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[StakingProgramId.MemeBaseBeta3],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.MemeBaseBeta3],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
};
