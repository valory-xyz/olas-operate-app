import { Contract as MulticallContract } from 'ethers-multicall';

import { STAKING_TOKEN_PROXY_ABI } from '@/abis/stakingTokenProxy';
import { AgentType } from '@/enums/Agent';
import { EvmChainId } from '@/enums/Chain';
import {
  OptimismStakingProgram,
  OptimismStakingProgramId,
  StakingProgramId,
} from '@/enums/StakingProgram';
import { TokenSymbol } from '@/enums/Token';
import { Address } from '@/types/Address';

import { OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS } from '../activityCheckers';
import { StakingProgramConfig } from '.';

export const OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES: Record<
  OptimismStakingProgram,
  Address
> = {
  [StakingProgramId.OptimusAlpha1]:
    '0x88996bbdE7f982D93214881756840cE2c77C4992',
  [StakingProgramId.OptimusAlpha2]:
    '0xBCA056952D2A7a8dD4A002079219807CFDF9fd29',
  [StakingProgramId.OptimusAlpha3]:
    '0x0f69f35652B1acdbD769049334f1AC580927E139',
  [StakingProgramId.OptimusAlpha4]:
    '0x6891Cf116f9a3bDbD1e89413118eF81F69D298C3',
};

export const OPTIMISM_STAKING_PROGRAMS: {
  [stakingProgramId in OptimismStakingProgram]: StakingProgramConfig;
} = {
  [StakingProgramId.OptimusAlpha1]: {
    chainId: EvmChainId.Optimism,
    name: 'Optimus Alpha',
    agentsSupported: [AgentType.Optimus],
    stakingRequirements: { [TokenSymbol.OLAS]: 40 },
    activityChecker:
      OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        OptimismStakingProgramId.OptimusAlpha1
      ],
    contract: new MulticallContract(
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        StakingProgramId.OptimusAlpha1
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [StakingProgramId.OptimusAlpha2]: {
    chainId: EvmChainId.Optimism,
    name: 'Optimus Alpha II',
    agentsSupported: [AgentType.Optimus],
    stakingRequirements: { [TokenSymbol.OLAS]: 100 },
    activityChecker:
      OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        OptimismStakingProgramId.OptimusAlpha2
      ],
    contract: new MulticallContract(
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        StakingProgramId.OptimusAlpha2
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [StakingProgramId.OptimusAlpha3]: {
    chainId: EvmChainId.Optimism,
    name: 'Optimus Alpha III',
    agentsSupported: [AgentType.Optimus],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 1000,
    },
    activityChecker:
      OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        OptimismStakingProgramId.OptimusAlpha3
      ],
    contract: new MulticallContract(
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        StakingProgramId.OptimusAlpha3
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [StakingProgramId.OptimusAlpha4]: {
    chainId: EvmChainId.Optimism,
    name: 'Optimus Alpha IV',
    agentsSupported: [AgentType.Optimus],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 5000,
    },
    activityChecker:
      OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        OptimismStakingProgramId.OptimusAlpha4
      ],
    contract: new MulticallContract(
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        StakingProgramId.OptimusAlpha4
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
};
