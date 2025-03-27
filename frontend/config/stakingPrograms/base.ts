import { Contract as MulticallContract } from 'ethers-multicall';

import { STAKING_TOKEN_PROXY_ABI } from '@/abis/stakingTokenProxy';
import { AgentType } from '@/enums/Agent';
import { EvmChainId } from '@/enums/Chain';
import { StakingProgramId } from '@/enums/StakingProgram';
import { TokenSymbol } from '@/enums/Token';
import { Address } from '@/types/Address';

import { BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS } from '../activityCheckers';
import { MECHS, MechType } from '../mechs';
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
    [StakingProgramId.AgentsFun1]: '0x2585e63df7BD9De8e058884D496658a030b5c6ce',
    [StakingProgramId.AgentsFun2]: '0x26FA75ef9Ccaa60E58260226A71e9d07564C01bF',
    [StakingProgramId.AgentsFun3]: '0x4D4233EBF0473Ca8f34d105A6256A2389176F0Ce',
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
  [StakingProgramId.AgentsFun1]: {
    chainId: EvmChainId.Base,
    name: 'Agents.fun 1',
    agentsSupported: [AgentType.Memeooorr],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 100,
    },
    mechType: MechType.Marketplace,
    mech: MECHS[EvmChainId.Base][MechType.Marketplace].contract,
    activityChecker:
      BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[StakingProgramId.AgentsFun1],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.AgentsFun1],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [StakingProgramId.AgentsFun2]: {
    chainId: EvmChainId.Base,
    name: 'Agents.fun 2',
    agentsSupported: [AgentType.Memeooorr],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 1000,
    },
    mechType: MechType.Marketplace,
    mech: MECHS[EvmChainId.Base][MechType.Marketplace].contract,
    activityChecker:
      BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[StakingProgramId.AgentsFun2],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.AgentsFun2],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [StakingProgramId.AgentsFun3]: {
    chainId: EvmChainId.Base,
    name: 'Agents.fun 3',
    agentsSupported: [AgentType.Memeooorr],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 5000,
    },
    mechType: MechType.Marketplace,
    mech: MECHS[EvmChainId.Base][MechType.Marketplace].contract,
    activityChecker:
      BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[StakingProgramId.AgentsFun3],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.AgentsFun3],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
};
