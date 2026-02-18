import { Contract as MulticallContract } from 'ethers-multicall';

import { STAKING_TOKEN_PROXY_ABI } from '@/abis/stakingTokenProxy';
import {
  AgentMap,
  EvmChainIdMap,
  OPTIMISM_STAKING_PROGRAM_IDS,
  OptimismStakingProgramId,
} from '@/constants';
import { Address } from '@/types';

import { OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS } from '../activityCheckers';
import { TokenSymbolMap } from '../tokens';
import { StakingProgramConfig } from '.';

export const OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES: Record<
  OptimismStakingProgramId,
  Address
> = {
  [OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha2]:
    '0xBCA056952D2A7a8dD4A002079219807CFDF9fd29',
  [OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha3]:
    '0x0f69f35652B1acdbD769049334f1AC580927E139',
  [OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha4]:
    '0x6891Cf116f9a3bDbD1e89413118eF81F69D298C3',
};

export const OPTIMISM_STAKING_PROGRAMS: {
  [stakingProgramId in OptimismStakingProgramId]: StakingProgramConfig;
} = {
  [OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha2]: {
    chainId: EvmChainIdMap.Optimism,
    name: 'Optimus Alpha II',
    agentsSupported: [AgentMap.Optimus],
    stakingRequirements: { [TokenSymbolMap.OLAS]: 100 },
    activityChecker:
      OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha2
      ],
    address:
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha2
      ],
    contract: new MulticallContract(
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha2
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha3]: {
    chainId: EvmChainIdMap.Optimism,
    name: 'Optimus Alpha III',
    agentsSupported: [AgentMap.Optimus],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 1000,
    },
    activityChecker:
      OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha3
      ],
    address:
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha3
      ],
    contract: new MulticallContract(
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha3
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha4]: {
    chainId: EvmChainIdMap.Optimism,
    name: 'Optimus Alpha IV',
    agentsSupported: [AgentMap.Optimus],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 5000,
    },
    activityChecker:
      OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha4
      ],
    address:
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha4
      ],
    contract: new MulticallContract(
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha4
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
};
