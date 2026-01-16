import { Contract as MulticallContract } from 'ethers-multicall';

import { STAKING_TOKEN_PROXY_ABI } from '@/abis/stakingTokenProxy';
import { AgentMap, EvmChainIdMap, STAKING_PROGRAM_IDS } from '@/constants';
import { Address } from '@/types';

import { POLYGON_STAKING_PROGRAMS_ACTIVITY_CHECKERS } from '../activityCheckers';
import { StakingProgramMap } from '.';

export const POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES: Record<
  string,
  Address
> = {
  [STAKING_PROGRAM_IDS.PolygonBeta1]:
    '0x9F1936f6afB5EAaA2220032Cf5e265F2Cc9511Cc',
  [STAKING_PROGRAM_IDS.PolygonBeta2]:
    '0x22D58680F643333F93205B956a4Aa1dC203a16Ad',
  [STAKING_PROGRAM_IDS.PolygonBeta3]:
    '0x8887C2852986e7cbaC99B6065fFe53074A6BCC26',
};

export const POLYGON_STAKING_PROGRAMS: StakingProgramMap = {
  [STAKING_PROGRAM_IDS.PolygonBeta1]: {
    chainId: EvmChainIdMap.Polygon,
    name: 'Polygon Beta 1',
    agentsSupported: [AgentMap.Polystrat],
    stakingRequirements: {
      OLAS: 50,
    },
    activityChecker:
      POLYGON_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
      STAKING_PROGRAM_IDS.PolygonBeta1
      ],
    address:
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
      STAKING_PROGRAM_IDS.PolygonBeta1
      ],
    contract: new MulticallContract(
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
      STAKING_PROGRAM_IDS.PolygonBeta1
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.PolygonBeta2]: {
    chainId: EvmChainIdMap.Polygon,
    name: 'Polygon Beta 2',
    agentsSupported: [AgentMap.Polystrat],
    stakingRequirements: {
      OLAS: 500,
    },
    activityChecker:
      POLYGON_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
      STAKING_PROGRAM_IDS.PolygonBeta2
      ],
    address:
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
      STAKING_PROGRAM_IDS.PolygonBeta2
      ],
    contract: new MulticallContract(
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
      STAKING_PROGRAM_IDS.PolygonBeta2
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.PolygonBeta3]: {
    chainId: EvmChainIdMap.Polygon,
    name: 'Polygon Beta 3',
    agentsSupported: [AgentMap.Polystrat],
    stakingRequirements: {
      OLAS: 5000,
    },
    activityChecker:
      POLYGON_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
      STAKING_PROGRAM_IDS.PolygonBeta3
      ],
    address:
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
      STAKING_PROGRAM_IDS.PolygonBeta3
      ],
    contract: new MulticallContract(
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
      STAKING_PROGRAM_IDS.PolygonBeta3
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
};
