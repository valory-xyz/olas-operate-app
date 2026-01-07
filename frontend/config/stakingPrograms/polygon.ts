import { Contract as MulticallContract } from 'ethers-multicall';

import { STAKING_TOKEN_PROXY_ABI } from '@/abis/stakingTokenProxy';
import {
  EvmChainIdMap,
  PolygonStakingProgramId,
  STAKING_PROGRAM_IDS,
} from '@/constants';
import { Address } from '@/types';

import { POLYGON_STAKING_PROGRAMS_ACTIVITY_CHECKERS } from '../activityCheckers';
import { StakingProgramMap } from '.';

// TODO: Add real contract addresses for Polygon staking programs
export const POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES: Record<
  PolygonStakingProgramId,
  Address
> = {
  [STAKING_PROGRAM_IDS.PolygonAlpha]:
    '0x0000000000000000000000000000000000000000', // TODO: Add real address
  [STAKING_PROGRAM_IDS.PolygonAlpha2]:
    '0x0000000000000000000000000000000000000000', // TODO: Add real address
};

export const POLYGON_STAKING_PROGRAMS: StakingProgramMap = {
  [STAKING_PROGRAM_IDS.PolygonAlpha]: {
    chainId: EvmChainIdMap.Polygon,
    name: 'Polygon Alpha',
    agentsSupported: [],
    stakingRequirements: {
      OLAS: 100, // TODO: Add real staking requirement
    },
    activityChecker:
      POLYGON_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        STAKING_PROGRAM_IDS.PolygonAlpha
      ],
    address:
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PolygonAlpha
      ],
    contract: new MulticallContract(
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PolygonAlpha
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.PolygonAlpha2]: {
    chainId: EvmChainIdMap.Polygon,
    name: 'Polygon Alpha 2',
    agentsSupported: [],
    stakingRequirements: {
      OLAS: 200, // TODO: Add real staking requirement
    },
    activityChecker:
      POLYGON_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        STAKING_PROGRAM_IDS.PolygonAlpha2
      ],
    address:
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PolygonAlpha2
      ],
    contract: new MulticallContract(
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PolygonAlpha2
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
};
