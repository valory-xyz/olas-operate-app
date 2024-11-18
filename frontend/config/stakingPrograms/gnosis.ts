import { Contract as MulticallContract } from 'ethers-multicall';

import { STAKING_TOKEN_PROXY_ABI } from '@/abis/stakingTokenProxy';
import { AgentType } from '@/enums/Agent';
import { ChainId } from '@/enums/Chain';
import { StakingProgramId } from '@/enums/StakingProgram';
import { TokenSymbol } from '@/enums/Token';
import { Address } from '@/types/Address';

import { ACTIVITY_CHECKERS } from '../activityCheckers';
import { MECHS, MechType } from '../mechs';
import { StakingProgramMap } from '.';

export const GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES: Record<
  string,
  Address
> = {
  [StakingProgramId.PearlAlpha]: '0xEE9F19b5DF06c7E8Bfc7B28745dcf944C504198A',
  [StakingProgramId.PearlBeta]: '0xeF44Fb0842DDeF59D37f85D61A1eF492bbA6135d',
  [StakingProgramId.PearlBeta2]: '0x1c2F82413666d2a3fD8bC337b0268e62dDF67434',
  [StakingProgramId.PearlBeta3]: '0xBd59Ff0522aA773cB6074ce83cD1e4a05A457bc1',
  [StakingProgramId.PearlBeta4]: '0x3052451e1eAee78e62E169AfdF6288F8791F2918',
  [StakingProgramId.PearlBeta5]: '0x4Abe376Fda28c2F43b84884E5f822eA775DeA9F4',
  [StakingProgramId.PearlBetaMechMarketplace]:
    '0xDaF34eC46298b53a3d24CBCb431E84eBd23927dA',
};

export const GNOSIS_STAKING_PROGRAMS: StakingProgramMap = {
  [StakingProgramId.PearlAlpha]: {
    deprecated: true,
    name: 'Pearl Alpha',
    chainId: ChainId.Gnosis,
    agentsSupported: [AgentType.PredictTrader],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 20,
    },
    mech: MECHS[ChainId.Gnosis][MechType.Agent].contract,
    activityChecker: ACTIVITY_CHECKERS[ChainId.Gnosis][MechType.Agent],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.PearlAlpha],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [StakingProgramId.PearlBeta]: {
    chainId: ChainId.Gnosis,
    name: 'Pearl Beta',
    agentsSupported: [AgentType.PredictTrader],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 40,
    },
    mech: MECHS[ChainId.Gnosis][MechType.Agent].contract,
    activityChecker: ACTIVITY_CHECKERS[ChainId.Gnosis][MechType.Agent],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.PearlBeta],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [StakingProgramId.PearlBeta2]: {
    chainId: ChainId.Gnosis,
    name: 'Pearl Beta 2',
    agentsSupported: [AgentType.PredictTrader],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 100,
    },
    mech: MECHS[ChainId.Gnosis][MechType.Agent].contract,
    activityChecker: ACTIVITY_CHECKERS[ChainId.Gnosis][MechType.Agent],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.PearlBeta2],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [StakingProgramId.PearlBeta3]: {
    chainId: ChainId.Gnosis,
    name: 'Pearl Beta 3',
    agentsSupported: [AgentType.PredictTrader],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 100,
    },
    mech: MECHS[ChainId.Gnosis][MechType.Agent].contract,
    activityChecker: ACTIVITY_CHECKERS[ChainId.Gnosis][MechType.Agent],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.PearlBeta3],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [StakingProgramId.PearlBeta4]: {
    chainId: ChainId.Gnosis,
    name: 'Pearl Beta 4',
    agentsSupported: [AgentType.PredictTrader],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 100,
    },
    mech: MECHS[ChainId.Gnosis][MechType.Agent].contract,
    activityChecker: ACTIVITY_CHECKERS[ChainId.Gnosis][MechType.Agent],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.PearlBeta4],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [StakingProgramId.PearlBeta5]: {
    chainId: ChainId.Gnosis,
    name: 'Pearl Beta 5',
    agentsSupported: [AgentType.PredictTrader],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 10,
    },
    mech: MECHS[ChainId.Gnosis][MechType.Agent].contract,
    activityChecker: ACTIVITY_CHECKERS[ChainId.Gnosis][MechType.Agent],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.PearlBeta5],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [StakingProgramId.PearlBetaMechMarketplace]: {
    chainId: ChainId.Gnosis,
    name: 'Pearl Beta Mech Marketplace',
    agentsSupported: [AgentType.PredictTrader],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 40,
    },
    mech: MECHS[ChainId.Gnosis][MechType.Marketplace].contract,
    activityChecker: ACTIVITY_CHECKERS[ChainId.Gnosis][MechType.Marketplace],
    contract: new MulticallContract(
      GNOSIS_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
        StakingProgramId.PearlBetaMechMarketplace
      ],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
};
