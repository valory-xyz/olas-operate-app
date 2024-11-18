/**
 * Staking program configurations by staking program id
 * @note Add new staking programs here
 * @note Used to type chain specific staking program configs
 */

import { Contract as MulticallContract } from 'ethers-multicall';

import { STAKING_TOKEN_PROXY_ABI } from '@/abis/stakingTokenProxy';
import { AgentType } from '@/enums/Agent';
import { ChainId } from '@/enums/Chain';
import { StakingProgramId } from '@/enums/StakingProgram';
import { TokenSymbol } from '@/enums/Token';

import { ACTIVITY_CHECKERS } from '../activityCheckers';
import { MECHS, MechType } from '../mechs';
import { StakingProgramMap } from '.';

export const OPTIMISM_STAKING_PROGRAMS: StakingProgramMap = {
  [StakingProgramId.OptimusAlpha]: {
    name: 'Optimus Alpha',
    agentsSupported: [AgentType.Optimus],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 40,
    },
    mech: MECHS[ChainId.Optimism][MechType.Agent].contract,
    activityChecker: ACTIVITY_CHECKERS[ChainId.Optimism][MechType.Agent],
    chainId: ChainId.Optimism,
    contract: new MulticallContract(
      '0x88996bbdE7f982D93214881756840cE2c77C4992',
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
};
