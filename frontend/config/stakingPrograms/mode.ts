import { Contract as MulticallContract } from 'ethers-multicall';

import { STAKING_TOKEN_PROXY_ABI } from '@/abis/stakingTokenProxy';
import { AgentMap, EvmChainIdMap, STAKING_PROGRAM_IDS } from '@/constants';
import { Address } from '@/types';

import { MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS } from '../activityCheckers';
import { TokenSymbolMap } from '../tokens';
import { StakingProgramMap } from '.';

export const MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES: Record<string, Address> =
  {
    [STAKING_PROGRAM_IDS.ModiusAlpha]:
      '0x534C0A05B6d4d28d5f3630D6D74857B253cf8332',
    [STAKING_PROGRAM_IDS.ModiusAlpha2]:
      '0xeC013E68FE4B5734643499887941eC197fd757D0',
    [STAKING_PROGRAM_IDS.ModiusAlpha3]:
      '0x9034D0413D122015710f1744A19eFb1d7c2CEB13',
    [STAKING_PROGRAM_IDS.ModiusAlpha4]:
      '0x8BcAdb2c291C159F9385964e5eD95a9887302862',
    [STAKING_PROGRAM_IDS.OptimusAlpha]:
      '0x5fc25f50e96857373c64dc0edb1abcbed4587e91',
  };

export const MODE_STAKING_PROGRAMS: StakingProgramMap = {
  // modius alpha
  [STAKING_PROGRAM_IDS.ModiusAlpha]: {
    chainId: EvmChainIdMap.Mode,
    name: 'Modius Alpha',
    agentsSupported: [AgentMap.Modius],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 40,
    },
    activityChecker:
      MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.ModiusAlpha],
    address:
      MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[STAKING_PROGRAM_IDS.ModiusAlpha],
    contract: new MulticallContract(
      MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[STAKING_PROGRAM_IDS.ModiusAlpha],
      STAKING_TOKEN_PROXY_ABI,
    ),
    id: '0x000000000000000000000000534c0a05b6d4d28d5f3630d6d74857b253cf8332',
  },
  [STAKING_PROGRAM_IDS.ModiusAlpha2]: {
    chainId: EvmChainIdMap.Mode,
    name: 'Modius Alpha II',
    agentsSupported: [AgentMap.Modius],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 100,
    },
    activityChecker:
      MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.ModiusAlpha2],
    address:
      MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.ModiusAlpha2
      ],
    contract: new MulticallContract(
      MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.ModiusAlpha2
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
    id: '0x000000000000000000000000ec013e68fe4b5734643499887941ec197fd757d0',
  },
  [STAKING_PROGRAM_IDS.ModiusAlpha3]: {
    chainId: EvmChainIdMap.Mode,
    name: 'Modius Alpha III',
    agentsSupported: [AgentMap.Modius],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 1000,
    },
    activityChecker:
      MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.ModiusAlpha3],
    address:
      MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.ModiusAlpha3
      ],
    contract: new MulticallContract(
      MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.ModiusAlpha3
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
    id: '0x0000000000000000000000009034d0413d122015710f1744a19efb1d7c2ceb13',
  },
  [STAKING_PROGRAM_IDS.ModiusAlpha4]: {
    chainId: EvmChainIdMap.Mode,
    name: 'Modius Alpha IV',
    agentsSupported: [AgentMap.Modius],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 5000,
    },
    activityChecker:
      MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.ModiusAlpha4],
    address:
      MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.ModiusAlpha4
      ],
    contract: new MulticallContract(
      MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.ModiusAlpha4
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
    id: '0x0000000000000000000000008bcadb2c291c159f9385964e5ed95a9887302862',
  },
  // optimus alpha
  [STAKING_PROGRAM_IDS.OptimusAlpha]: {
    chainId: EvmChainIdMap.Mode,
    name: 'Optimus Alpha',
    agentsSupported: [AgentMap.Modius],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 40,
    },
    activityChecker:
      MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.OptimusAlpha],
    address:
      MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.OptimusAlpha
      ],
    contract: new MulticallContract(
      MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.OptimusAlpha
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
    id: '0x0000000000000000000000005fc25f50e96857373c64dc0edb1abcbed4587e91',
  },
};
