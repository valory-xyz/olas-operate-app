import { Contract as MulticallContract } from 'ethers-multicall';

import { STAKING_TOKEN_PROXY_ABI } from '@/abis/stakingTokenProxy';
import { AgentType } from '@/enums/Agent';
import { EvmChainId } from '@/enums/Chain';
import { StakingProgramId } from '@/enums/StakingProgram';
import { TokenSymbol } from '@/enums/Token';
import { Address } from '@/types/Address';

import { MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS } from '../activityCheckers';
import { StakingProgramMap } from '.';

export const MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES: Record<string, Address> =
  {
    [StakingProgramId.ModiusAlpha]:
      '0x534C0A05B6d4d28d5f3630D6D74857B253cf8332',
    [StakingProgramId.OptimusAlpha]:
      '0x5fc25f50e96857373c64dc0edb1abcbed4587e91',
    [StakingProgramId.ModiusAlpha2]:
      '0xeC013E68FE4B5734643499887941eC197fd757D0',
    [StakingProgramId.ModiusAlpha3]:
      '0x9034D0413D122015710f1744A19eFb1d7c2CEB13',
    [StakingProgramId.ModiusAlpha4]:
      '0x8BcAdb2c291C159F9385964e5eD95a9887302862',
  };

export const MODE_STAKING_PROGRAMS: StakingProgramMap = {
  // modius alpha
  [StakingProgramId.ModiusAlpha]: {
    chainId: EvmChainId.Mode,
    name: 'Modius Alpha',
    agentsSupported: [AgentType.Modius],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 40,
    },
    activityChecker:
      MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[StakingProgramId.ModiusAlpha],
    contract: new MulticallContract(
      MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.ModiusAlpha],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [StakingProgramId.ModiusAlpha2]: {
    chainId: EvmChainId.Mode,
    name: 'Modius Alpha II',
    agentsSupported: [AgentType.Modius],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 100,
    },
    activityChecker:
      MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[StakingProgramId.ModiusAlpha2],
    contract: new MulticallContract(
      MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.ModiusAlpha2],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [StakingProgramId.ModiusAlpha3]: {
    chainId: EvmChainId.Mode,
    name: 'Modius Alpha III',
    agentsSupported: [AgentType.Modius],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 1000,
    },
    activityChecker:
      MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[StakingProgramId.ModiusAlpha3],
    contract: new MulticallContract(
      MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.ModiusAlpha3],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  [StakingProgramId.ModiusAlpha4]: {
    chainId: EvmChainId.Mode,
    name: 'Modius Alpha IV',
    agentsSupported: [AgentType.Modius],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 5000,
    },
    activityChecker:
      MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[StakingProgramId.ModiusAlpha4],
    contract: new MulticallContract(
      MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.ModiusAlpha4],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
  //optimus alpha
  [StakingProgramId.OptimusAlpha]: {
    chainId: EvmChainId.Mode,
    name: 'Optimus Alpha',
    agentsSupported: [AgentType.Modius],
    stakingRequirements: {
      [TokenSymbol.OLAS]: 40,
    },
    activityChecker:
      MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[StakingProgramId.OptimusAlpha],
    contract: new MulticallContract(
      MODE_STAKING_PROGRAMS_CONTRACT_ADDRESSES[StakingProgramId.OptimusAlpha],
      STAKING_TOKEN_PROXY_ABI,
    ),
  },
};
