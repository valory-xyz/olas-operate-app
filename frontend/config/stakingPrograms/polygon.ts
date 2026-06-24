import { Contract as MulticallContract } from 'ethers-multicall';

import { STAKING_TOKEN_PROXY_ABI } from '@/abis/stakingTokenProxy';
import { AgentMap, EvmChainIdMap, STAKING_PROGRAM_IDS } from '@/constants';
import { Address } from '@/types';
import { deriveStakingProgramId } from '@/utils';

import { POLYGON_STAKING_PROGRAMS_ACTIVITY_CHECKERS } from '../activityCheckers';
import { MECHS, MechType } from '../mechs';
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
  // HIDDEN FOR QA (OPE-1803) — new Polystrat contracts. Re-enable with the ids in
  // stakingProgram.ts, the program entries below, and the checker entries.
  // [STAKING_PROGRAM_IDS.PolystratI]:
  //   '0x35C9C87a8caD9B7fd9d367Eb4Fd287365688E000',
  // [STAKING_PROGRAM_IDS.PolystratII]:
  //   '0xD7F69649691039E86F15153c7BD567aA0049d122',
  // [STAKING_PROGRAM_IDS.PolystratIII]:
  //   '0x7dbF10769CA7528ec9aA440b668C716Caf08e7EA',
};

export const POLYGON_STAKING_PROGRAMS: StakingProgramMap = {
  [STAKING_PROGRAM_IDS.PolygonBeta1]: {
    chainId: EvmChainIdMap.Polygon,
    name: 'Polygon Beta I',
    agentsSupported: [AgentMap.Polystrat],
    stakingRequirements: {
      OLAS: 100,
    },
    mechType: MechType.MarketplaceV2,
    mech: MECHS[EvmChainIdMap.Polygon][MechType.MarketplaceV2].contract,
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
    id: deriveStakingProgramId(
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PolygonBeta1
      ],
    ),
  },
  [STAKING_PROGRAM_IDS.PolygonBeta2]: {
    chainId: EvmChainIdMap.Polygon,
    name: 'Polygon Beta II',
    agentsSupported: [AgentMap.Polystrat],
    stakingRequirements: {
      OLAS: 1000,
    },
    mechType: MechType.MarketplaceV2,
    mech: MECHS[EvmChainIdMap.Polygon][MechType.MarketplaceV2].contract,
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
    id: deriveStakingProgramId(
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PolygonBeta2
      ],
    ),
  },
  [STAKING_PROGRAM_IDS.PolygonBeta3]: {
    chainId: EvmChainIdMap.Polygon,
    name: 'Polygon Alpha III',
    agentsSupported: [AgentMap.Polystrat],
    stakingRequirements: {
      OLAS: 10000,
    },
    mechType: MechType.MarketplaceV2,
    mech: MECHS[EvmChainIdMap.Polygon][MechType.MarketplaceV2].contract,
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
    id: deriveStakingProgramId(
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PolygonBeta3
      ],
    ),
  },
  /* HIDDEN FOR QA (OPE-1803) — new Polystrat contracts (decoupled activity).
     Re-enable by uncommenting the ids in stakingProgram.ts, the address entries
     above, the checker entries in activityCheckers.ts, and this block.
  [STAKING_PROGRAM_IDS.PolystratI]: {
    chainId: EvmChainIdMap.Polygon,
    name: 'Polystrat I',
    activityTarget: 8,
    agentsSupported: [AgentMap.Polystrat],
    stakingRequirements: {
      OLAS: 100,
    },
    mechType: MechType.MarketplaceV2,
    mech: MECHS[EvmChainIdMap.Polygon][MechType.MarketplaceV2].contract,
    activityChecker:
      POLYGON_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        STAKING_PROGRAM_IDS.PolystratI
      ],
    address:
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PolystratI
      ],
    contract: new MulticallContract(
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PolystratI
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
    id: deriveStakingProgramId(
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PolystratI
      ],
    ),
  },
  [STAKING_PROGRAM_IDS.PolystratII]: {
    chainId: EvmChainIdMap.Polygon,
    name: 'Polystrat II',
    activityTarget: 8,
    agentsSupported: [AgentMap.Polystrat],
    stakingRequirements: {
      OLAS: 1000,
    },
    mechType: MechType.MarketplaceV2,
    mech: MECHS[EvmChainIdMap.Polygon][MechType.MarketplaceV2].contract,
    activityChecker:
      POLYGON_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        STAKING_PROGRAM_IDS.PolystratII
      ],
    address:
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PolystratII
      ],
    contract: new MulticallContract(
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PolystratII
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
    id: deriveStakingProgramId(
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PolystratII
      ],
    ),
  },
  [STAKING_PROGRAM_IDS.PolystratIII]: {
    chainId: EvmChainIdMap.Polygon,
    name: 'Polystrat III',
    activityTarget: 8,
    agentsSupported: [AgentMap.Polystrat],
    stakingRequirements: {
      OLAS: 10000,
    },
    mechType: MechType.MarketplaceV2,
    mech: MECHS[EvmChainIdMap.Polygon][MechType.MarketplaceV2].contract,
    activityChecker:
      POLYGON_STAKING_PROGRAMS_ACTIVITY_CHECKERS[
        STAKING_PROGRAM_IDS.PolystratIII
      ],
    address:
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PolystratIII
      ],
    contract: new MulticallContract(
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PolystratIII
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
    id: deriveStakingProgramId(
      POLYGON_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        STAKING_PROGRAM_IDS.PolystratIII
      ],
    ),
  },
  */
};
