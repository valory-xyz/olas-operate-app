import { Contract as MulticallContract } from 'ethers-multicall';

import { STAKING_TOKEN_PROXY_ABI } from '@/abis/stakingTokenProxy';
import { AgentMap, EvmChainIdMap, STAKING_PROGRAM_IDS } from '@/constants';
import { Address } from '@/types';

import { BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS } from '../activityCheckers';
import { MECHS, MechType } from '../mechs';
import { TokenSymbolMap } from '../tokens';
import { StakingProgramMap } from '.';

export const BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES: Record<string, Address> =
  {
    [STAKING_PROGRAM_IDS.MemeBaseAlpha2]:
      '0xc653622FD75026a020995a1d8c8651316cBBc4dA',
    [STAKING_PROGRAM_IDS.MemeBaseBeta]:
      '0x6011E09e7c095e76980b22498d69dF18EB62BeD8',
    [STAKING_PROGRAM_IDS.MemeBaseBeta2]:
      '0xfb7669c3AdF673b3A545Fa5acd987dbfdA805e22',
    [STAKING_PROGRAM_IDS.MemeBaseBeta3]:
      '0xCA61633b03c54F64b6A7F1f9A9C0A6Feb231Cc4D',
    [STAKING_PROGRAM_IDS.AgentsFun1]:
      '0x2585e63df7BD9De8e058884D496658a030b5c6ce',
    [STAKING_PROGRAM_IDS.AgentsFun2]:
      '0x26FA75ef9Ccaa60E58260226A71e9d07564C01bF',
    [STAKING_PROGRAM_IDS.AgentsFun3]:
      '0x4D4233EBF0473Ca8f34d105A6256A2389176F0Ce',
    [STAKING_PROGRAM_IDS.PettAiAgent]:
      '0x31183503be52391844594b4B587F0e764eB3956E',
    [STAKING_PROGRAM_IDS.PettAiAgent2]:
      '0xEA15F76D7316B09b3f89613e32d3B780619d61e2',
    [STAKING_PROGRAM_IDS.PettAiAgent3]:
      '0xFA0ca3935758cB81D35A8F1395b9Eb5a596ce301',
    [STAKING_PROGRAM_IDS.PettAiAgent4]:
      '0x00D544c10BDC0E9b0a71CeAF52C1342BB8f21c1D',
  };

export const BASE_STAKING_PROGRAMS: StakingProgramMap = {
  [STAKING_PROGRAM_IDS.MemeBaseAlpha2]: {
    deprecated: true,
    chainId: EvmChainIdMap.Base,
    name: 'MemeBase Alpha II',
    agentsSupported: [AgentMap.AgentsFun],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 100,
    },
    activityChecker:
      BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        STAKING_PROGRAM_IDS.MemeBaseAlpha2
      ],
    address:
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.MemeBaseAlpha2
      ],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.MemeBaseAlpha2
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.MemeBaseBeta]: {
    deprecated: true,
    chainId: EvmChainIdMap.Base,
    name: 'MemeBase Beta I',
    agentsSupported: [AgentMap.AgentsFun],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 100,
    },
    activityChecker:
      BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.MemeBaseBeta],
    address:
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.MemeBaseBeta
      ],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.MemeBaseBeta
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.MemeBaseBeta2]: {
    deprecated: true,
    chainId: EvmChainIdMap.Base,
    name: 'MemeBase Beta II',
    agentsSupported: [AgentMap.AgentsFun],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 1000,
    },
    activityChecker:
      BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        STAKING_PROGRAM_IDS.MemeBaseBeta2
      ],
    address:
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.MemeBaseBeta2
      ],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.MemeBaseBeta2
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.MemeBaseBeta3]: {
    deprecated: true,
    chainId: EvmChainIdMap.Base,
    name: 'MemeBase Beta III',
    agentsSupported: [AgentMap.AgentsFun],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 5000,
    },
    activityChecker:
      BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        STAKING_PROGRAM_IDS.MemeBaseBeta3
      ],
    address:
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.MemeBaseBeta3
      ],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.MemeBaseBeta3
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.AgentsFun1]: {
    chainId: EvmChainIdMap.Base,
    name: 'Agents.fun 1',
    agentsSupported: [AgentMap.AgentsFun],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 100,
    },
    mechType: MechType.Marketplace,
    mech: MECHS[EvmChainIdMap.Base][MechType.Marketplace].contract,
    activityChecker:
      BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.AgentsFun1],
    address:
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[STAKING_PROGRAM_IDS.AgentsFun1],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[STAKING_PROGRAM_IDS.AgentsFun1],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.AgentsFun2]: {
    chainId: EvmChainIdMap.Base,
    name: 'Agents.fun 2',
    agentsSupported: [AgentMap.AgentsFun],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 1000,
    },
    mechType: MechType.Marketplace,
    mech: MECHS[EvmChainIdMap.Base][MechType.Marketplace].contract,
    activityChecker:
      BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.AgentsFun2],
    address:
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[STAKING_PROGRAM_IDS.AgentsFun2],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[STAKING_PROGRAM_IDS.AgentsFun2],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.AgentsFun3]: {
    chainId: EvmChainIdMap.Base,
    name: 'Agents.fun 3',
    agentsSupported: [AgentMap.AgentsFun],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 5000,
    },
    mechType: MechType.Marketplace,
    mech: MECHS[EvmChainIdMap.Base][MechType.Marketplace].contract,
    activityChecker:
      BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.AgentsFun3],
    address:
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[STAKING_PROGRAM_IDS.AgentsFun3],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[STAKING_PROGRAM_IDS.AgentsFun3],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.PettAiAgent]: {
    deprecated: true,
    chainId: EvmChainIdMap.Base,
    name: 'Pett.AI Agent Staking Contract',
    agentsSupported: [AgentMap.PettAi],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 20,
    },
    activityChecker:
      BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.PettAiAgent],
    address:
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[STAKING_PROGRAM_IDS.PettAiAgent],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[STAKING_PROGRAM_IDS.PettAiAgent],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.PettAiAgent2]: {
    deprecated: true,
    chainId: EvmChainIdMap.Base,
    name: 'Pett.AI Agent Staking Contract 2',
    agentsSupported: [AgentMap.PettAi],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 40,
    },
    activityChecker:
      BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.PettAiAgent2],
    address:
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PettAiAgent2
      ],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PettAiAgent2
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.PettAiAgent3]: {
    chainId: EvmChainIdMap.Base,
    name: 'Pett.AI Agent Staking Contract',
    agentsSupported: [AgentMap.PettAi],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 20,
    },
    activityChecker:
      BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.PettAiAgent3],
    address:
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PettAiAgent3
      ],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PettAiAgent3
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.PettAiAgent4]: {
    chainId: EvmChainIdMap.Base,
    name: 'Pett.AI Agent Staking Contract 2',
    agentsSupported: [AgentMap.PettAi],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 40,
    },
    activityChecker:
      BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.PettAiAgent4],
    address:
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PettAiAgent4
      ],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PettAiAgent4
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
};
