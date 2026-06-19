import { Contract as MulticallContract } from 'ethers-multicall';

import { STAKING_TOKEN_PROXY_ABI } from '@/abis/stakingTokenProxy';
import {
  AgentMap,
  EvmChainIdMap,
  OPTIMISM_STAKING_PROGRAM_IDS,
  OptimismStakingProgramId,
} from '@/constants';
import { Address } from '@/types';
import { deriveStakingProgramId } from '@/utils';

import { OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS } from '../activityCheckers';
import { MECHS, MechType } from '../mechs';
import { TokenSymbolMap } from '../tokens';
import type { StakingProgramConfig } from '.';

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
  [OPTIMISM_STAKING_PROGRAM_IDS.OptimusI]:
    '0xCDA7deEf16f6b1BfC1bB5C89B7E4FAa91D9ebF7b',
  [OPTIMISM_STAKING_PROGRAM_IDS.OptimusII]:
    '0x746281b8fbDbd008729Dc9382392810F771B1BfD',
  [OPTIMISM_STAKING_PROGRAM_IDS.OptimusIII]:
    '0x5a4317A5695aD6E86744eFC824414cF899f07C68',
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
    id: deriveStakingProgramId(
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha2
      ],
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
    id: deriveStakingProgramId(
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha3
      ],
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
    id: deriveStakingProgramId(
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusAlpha4
      ],
    ),
  },
  [OPTIMISM_STAKING_PROGRAM_IDS.OptimusI]: {
    chainId: EvmChainIdMap.Optimism,
    name: 'Optimus I',
    activityTarget: 1,
    agentsSupported: [AgentMap.Optimus],
    stakingRequirements: { [TokenSymbolMap.OLAS]: 100 },
    mechType: MechType.MarketplaceV2,
    mech: MECHS[EvmChainIdMap.Optimism][MechType.MarketplaceV2].contract,
    activityChecker:
      OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusI
      ],
    address:
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusI
      ],
    contract: new MulticallContract(
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusI
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
    id: deriveStakingProgramId(
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusI
      ],
    ),
  },
  [OPTIMISM_STAKING_PROGRAM_IDS.OptimusII]: {
    chainId: EvmChainIdMap.Optimism,
    name: 'Optimus II',
    activityTarget: 1,
    agentsSupported: [AgentMap.Optimus],
    stakingRequirements: { [TokenSymbolMap.OLAS]: 1000 },
    mechType: MechType.MarketplaceV2,
    mech: MECHS[EvmChainIdMap.Optimism][MechType.MarketplaceV2].contract,
    activityChecker:
      OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusII
      ],
    address:
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusII
      ],
    contract: new MulticallContract(
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusII
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
    id: deriveStakingProgramId(
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusII
      ],
    ),
  },
  [OPTIMISM_STAKING_PROGRAM_IDS.OptimusIII]: {
    chainId: EvmChainIdMap.Optimism,
    name: 'Optimus III',
    activityTarget: 1,
    agentsSupported: [AgentMap.Optimus],
    stakingRequirements: { [TokenSymbolMap.OLAS]: 5000 },
    mechType: MechType.MarketplaceV2,
    mech: MECHS[EvmChainIdMap.Optimism][MechType.MarketplaceV2].contract,
    activityChecker:
      OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusIII
      ],
    address:
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusIII
      ],
    contract: new MulticallContract(
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusIII
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
    id: deriveStakingProgramId(
      OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        OPTIMISM_STAKING_PROGRAM_IDS.OptimusIII
      ],
    ),
  },
};
