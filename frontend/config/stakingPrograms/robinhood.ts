import { Contract as MulticallContract } from 'ethers-multicall';

import { STAKING_TOKEN_PROXY_ABI } from '@/abis/stakingTokenProxy';
import {
  AgentMap,
  EvmChainIdMap,
  RobinhoodStakingProgramId,
  STAKING_PROGRAM_IDS,
} from '@/constants';
import { Address } from '@/types';
import { deriveStakingProgramId } from '@/utils';

import { ROBINHOOD_STAKING_PROGRAMS_ACTIVITY_CHECKERS } from '../activityCheckers';
import { TokenSymbolMap } from '../tokens';
import type { StakingProgramMap } from '.';

const ROBINHOOD_STAKING_PROGRAMS_CONTRACT_ADDRESSES: Record<
  RobinhoodStakingProgramId,
  Address
> = {
  [STAKING_PROGRAM_IDS.ConnectRobinhoodI]:
    '0x228DC61b838D6eD82347a93aA2cd3e28544808Ea',
  [STAKING_PROGRAM_IDS.ConnectRobinhoodII]:
    '0x009Cda4D71c56Db6A1bac850483DB8E01D32884E',
  [STAKING_PROGRAM_IDS.ConnectRobinhoodIII]:
    '0x7Bb72fa48b274672Cb6A362045cdCf470aEe99b2',
} as const;

export const ROBINHOOD_STAKING_PROGRAMS: StakingProgramMap = {
  [STAKING_PROGRAM_IDS.ConnectRobinhoodI]: {
    chainId: EvmChainIdMap.Robinhood,
    name: 'Connect I',
    stakingVersion: '0.4',
    agentsSupported: [AgentMap.Connect],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 100,
    },
    activityChecker:
      ROBINHOOD_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        STAKING_PROGRAM_IDS.ConnectRobinhoodI
      ],
    address:
      ROBINHOOD_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.ConnectRobinhoodI
      ],
    contract: new MulticallContract(
      ROBINHOOD_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.ConnectRobinhoodI
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
    id: deriveStakingProgramId(
      ROBINHOOD_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.ConnectRobinhoodI
      ],
    ),
  },
  [STAKING_PROGRAM_IDS.ConnectRobinhoodII]: {
    chainId: EvmChainIdMap.Robinhood,
    name: 'Connect II',
    stakingVersion: '0.4',
    agentsSupported: [AgentMap.Connect],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 5000,
    },
    activityChecker:
      ROBINHOOD_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        STAKING_PROGRAM_IDS.ConnectRobinhoodII
      ],
    address:
      ROBINHOOD_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.ConnectRobinhoodII
      ],
    contract: new MulticallContract(
      ROBINHOOD_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.ConnectRobinhoodII
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
    id: deriveStakingProgramId(
      ROBINHOOD_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.ConnectRobinhoodII
      ],
    ),
  },
  [STAKING_PROGRAM_IDS.ConnectRobinhoodIII]: {
    chainId: EvmChainIdMap.Robinhood,
    name: 'Connect III',
    stakingVersion: '0.4',
    agentsSupported: [AgentMap.Connect],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 10000,
    },
    activityChecker:
      ROBINHOOD_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        STAKING_PROGRAM_IDS.ConnectRobinhoodIII
      ],
    address:
      ROBINHOOD_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.ConnectRobinhoodIII
      ],
    contract: new MulticallContract(
      ROBINHOOD_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.ConnectRobinhoodIII
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
    id: deriveStakingProgramId(
      ROBINHOOD_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.ConnectRobinhoodIII
      ],
    ),
  },
} as const;
