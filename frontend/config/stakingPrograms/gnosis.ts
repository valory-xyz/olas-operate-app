import { Contract as MulticallContract } from 'ethers-multicall';

import { STAKING_TOKEN_PROXY_ABI } from '@/abis/stakingTokenProxy';
import { AgentMap, EvmChainIdMap, STAKING_PROGRAM_IDS } from '@/constants';
import { Address } from '@/types';

import { GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS } from '../activityCheckers';
import { MECHS, MechType } from '../mechs';
import { TokenSymbolMap } from '../tokens';
import { StakingProgramMap } from '.';

export const GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES: Record<
  string,
  Address
> = {
  [STAKING_PROGRAM_IDS.PearlAlpha]:
    '0xEE9F19b5DF06c7E8Bfc7B28745dcf944C504198A',
  [STAKING_PROGRAM_IDS.PearlBeta]: '0xeF44Fb0842DDeF59D37f85D61A1eF492bbA6135d',
  [STAKING_PROGRAM_IDS.PearlBeta2]:
    '0x1c2F82413666d2a3fD8bC337b0268e62dDF67434',
  [STAKING_PROGRAM_IDS.PearlBeta3]:
    '0xBd59Ff0522aA773cB6074ce83cD1e4a05A457bc1',
  [STAKING_PROGRAM_IDS.PearlBeta4]:
    '0x3052451e1eAee78e62E169AfdF6288F8791F2918',
  [STAKING_PROGRAM_IDS.PearlBeta5]:
    '0x4Abe376Fda28c2F43b84884E5f822eA775DeA9F4',
  [STAKING_PROGRAM_IDS.PearlBeta6]:
    '0x6C6D01e8eA8f806eF0c22F0ef7ed81D868C1aB39',
  [STAKING_PROGRAM_IDS.PearlBetaMechMarketplace]:
    '0xDaF34eC46298b53a3d24CBCb431E84eBd23927dA',
  [STAKING_PROGRAM_IDS.PearlBetaMechMarketplace1]:
    '0xAb10188207Ea030555f53C8A84339A92f473aa5e',
  [STAKING_PROGRAM_IDS.PearlBetaMechMarketplace2]:
    '0x8d7bE092d154b01d404f1aCCFA22Cef98C613B5D',
  [STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3]:
    '0x9D00A0551F20979080d3762005C9B74D7Aa77b85',
  [STAKING_PROGRAM_IDS.PearlBetaMechMarketplace4]:
    '0xE2f80659dB1069f3B6a08af1A62064190c119543',
} as const;

export const GNOSIS_STAKING_PROGRAMS: StakingProgramMap = {
  [STAKING_PROGRAM_IDS.PearlAlpha]: {
    deprecated: true,
    name: 'Pearl Alpha',
    chainId: EvmChainIdMap.Gnosis,
    agentsSupported: [AgentMap.PredictTrader],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 20,
    },
    mechType: MechType.Agent,
    mech: MECHS[EvmChainIdMap.Gnosis][MechType.Agent].contract,
    activityChecker:
      GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.PearlAlpha],
    address:
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlAlpha
      ],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlAlpha
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.PearlBeta]: {
    deprecated: true,
    chainId: EvmChainIdMap.Gnosis,
    name: 'Pearl Beta',
    agentsSupported: [AgentMap.PredictTrader],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 40,
    },
    mechType: MechType.Agent,
    mech: MECHS[EvmChainIdMap.Gnosis][MechType.Agent].contract,
    activityChecker:
      GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.PearlBeta],
    address:
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[STAKING_PROGRAM_IDS.PearlBeta],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[STAKING_PROGRAM_IDS.PearlBeta],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.PearlBeta2]: {
    deprecated: true,
    chainId: EvmChainIdMap.Gnosis,
    name: 'Pearl Beta 2',
    agentsSupported: [AgentMap.PredictTrader],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 100,
    },
    mechType: MechType.Agent,
    mech: MECHS[EvmChainIdMap.Gnosis][MechType.Agent].contract,
    activityChecker:
      GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.PearlBeta2],
    address:
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBeta2
      ],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBeta2
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.PearlBeta3]: {
    deprecated: true,
    chainId: EvmChainIdMap.Gnosis,
    name: 'Pearl Beta 3',
    agentsSupported: [AgentMap.PredictTrader],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 100,
    },
    mechType: MechType.Agent,
    mech: MECHS[EvmChainIdMap.Gnosis][MechType.Agent].contract,
    activityChecker:
      GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.PearlBeta3],
    address:
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBeta3
      ],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBeta3
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.PearlBeta4]: {
    deprecated: true,
    chainId: EvmChainIdMap.Gnosis,
    name: 'Pearl Beta 4',
    agentsSupported: [AgentMap.PredictTrader],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 100,
    },
    mechType: MechType.Agent,
    mech: MECHS[EvmChainIdMap.Gnosis][MechType.Agent].contract,
    activityChecker:
      GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.PearlBeta4],
    address:
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBeta4
      ],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBeta4
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.PearlBeta5]: {
    deprecated: true,
    chainId: EvmChainIdMap.Gnosis,
    name: 'Pearl Beta 5',
    agentsSupported: [AgentMap.PredictTrader],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 10,
    },
    mechType: MechType.Agent,
    mech: MECHS[EvmChainIdMap.Gnosis][MechType.Agent].contract,
    activityChecker:
      GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.PearlBeta5],
    address:
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBeta5
      ],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBeta5
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.PearlBeta6]: {
    deprecated: true,
    chainId: EvmChainIdMap.Gnosis,
    name: 'Pearl Beta 6',
    agentsSupported: [AgentMap.PredictTrader],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 5000,
    },
    mechType: MechType.Agent,
    mech: MECHS[EvmChainIdMap.Gnosis][MechType.Marketplace].contract,
    activityChecker:
      GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.PearlBeta6],
    address:
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBeta6
      ],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBeta6
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.PearlBetaMechMarketplace]: {
    deprecated: true,
    chainId: EvmChainIdMap.Gnosis,
    name: 'Pearl Beta Mech Marketplace',
    agentsSupported: [AgentMap.PredictTrader],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 40,
    },
    mechType: MechType.Marketplace,
    mech: MECHS[EvmChainIdMap.Gnosis][MechType.Marketplace].contract,
    activityChecker:
      GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace
      ],
    address:
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace
      ],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.PearlBetaMechMarketplace1]: {
    chainId: EvmChainIdMap.Gnosis,
    name: 'Pearl Beta Mech Marketplace',
    agentsSupported: [AgentMap.PredictTrader],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 5000,
    },
    mechType: MechType.MarketplaceV2,
    mech: MECHS[EvmChainIdMap.Gnosis][MechType.MarketplaceV2].contract,
    activityChecker:
      GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace1
      ],
    address:
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace1
      ],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace1
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.PearlBetaMechMarketplace2]: {
    chainId: EvmChainIdMap.Gnosis,
    name: 'Pearl Beta Mech Marketplace II',
    agentsSupported: [AgentMap.PredictTrader],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 5000,
    },
    mechType: MechType.MarketplaceV2,
    mech: MECHS[EvmChainIdMap.Gnosis][MechType.MarketplaceV2].contract,
    activityChecker:
      GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace2
      ],
    address:
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace2
      ],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace2
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3]: {
    chainId: EvmChainIdMap.Gnosis,
    name: 'Pearl Beta Mech Marketplace III',
    agentsSupported: [AgentMap.PredictTrader],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 40,
    },
    mechType: MechType.MarketplaceV2,
    mech: MECHS[EvmChainIdMap.Gnosis][MechType.MarketplaceV2].contract,
    activityChecker:
      GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3
      ],
    address:
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3
      ],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [STAKING_PROGRAM_IDS.PearlBetaMechMarketplace4]: {
    chainId: EvmChainIdMap.Gnosis,
    name: 'Pearl Beta Mech Marketplace IV',
    agentsSupported: [AgentMap.PredictTrader],
    stakingRequirements: {
      [TokenSymbolMap.OLAS]: 100,
    },
    mechType: MechType.MarketplaceV2,
    mech: MECHS[EvmChainIdMap.Gnosis][MechType.MarketplaceV2].contract,
    activityChecker:
      GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace4
      ],
    address:
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace4
      ],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PearlBetaMechMarketplace4
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
} as const;
