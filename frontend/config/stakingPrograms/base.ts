import { Contract as MulticallContract } from 'ethers-multicall';

import { STAKING_TOKEN_PROXY_ABI } from '@/abis/stakingTokenProxy';
import { AgentType } from '@/enums/Agent';
import { EvmChainId } from '@/enums/Chain';
import { StakingProgramId } from '@/enums/StakingProgram';
import { TokenSymbol } from '@/enums/Token';
import { Address } from '@/types/Address';

import { ACTIVITY_CHECKERS, ActivityCheckerType } from '../activityCheckers';
import { StakingProgramMap } from '.';

export const BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES: Record<string, Address> =
  {
    [StakingProgramId.MemeBaseAlpha]:
      '0x06702a05312091013fdb50c8b60b98ca30762931',
  };

export const BASE_STAKING_PROGRAMS: StakingProgramMap = {
  [StakingProgramId.MemeBaseAlpha]: {
    chainId: EvmChainId.Base,
    name: 'MemeBase Alpha',
    agentsSupported: [AgentType.Memeooorr],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 100,
    },
    activityChecker:
      ACTIVITY_CHECKERS[EvmChainId.Base][
        ActivityCheckerType.MemeActivityChecker
      ],
    contract: new MulticallContract(
      BASE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.MemeBaseAlpha],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
};
