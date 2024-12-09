/**
 * Staking program configurations by staking program id
 * @note Add new staking programs here
 * @note Used to type chain specific staking program configs
 */

import { StakingProgramId } from '@/enums/StakingProgram';
import { Address } from '@/types/Address';

export const OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES: Record<
  string,
  Address
> = {
  [StakingProgramId.OptimusAlpha]: '0x88996bbdE7f982D93214881756840cE2c77C4992',
};

// export const OPTIMISM_STAKING_PROGRAMS: StakingProgramMap = {
//   [StakingProgramId.OptimusAlpha]: {
//     name: 'Optimus Alpha',
//     agentsSupported: [AgentType.Optimus],
//     stakingRequirements: {
//       [TokenSymbol.OLAS]: 40,
//     },
//     mech: MECHS[EvmChainId.Optimism][MechType.Agent].contract,
//     activityChecker: ACTIVITY_CHECKERS[EvmChainId.Optimism][MechType.Agent],
//     chainId: EvmChainId.Optimism,
//     contract: new MulticallContract(
//       OPTIMISM_STAKING_PROGRAMS_CONTRACT_ADDRESSES[
//         StakingProgramId.OptimusAlpha
//       ],
//       STAKING_TOKEN_PROXY_ABI,
//     ),
//   },
// };
