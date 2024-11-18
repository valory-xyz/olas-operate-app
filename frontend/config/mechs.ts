import { Contract as MulticallContract } from 'ethers-multicall';

import { AGENT_MECH_ABI } from '@/abis/agentMech';
import { MECH_MARKETPLACE_ABI } from '@/abis/mechMarketplace';
import { ChainId } from '@/enums/Chain';

export enum MechType {
  Agent = 'mech-agent',
  Marketplace = 'mech-marketplace',
}

type Mechs = {
  [chainId: number]: {
    [mechType: string]: {
      name: string;
      contract: MulticallContract;
    };
  };
};

export const MECHS: Mechs = {
  [ChainId.Gnosis]: {
    [MechType.Agent]: {
      name: 'Agent Mech',
      contract: new MulticallContract(
        '0x77af31De935740567Cf4fF1986D04B2c964A786a',
        AGENT_MECH_ABI,
      ),
    },
    [MechType.Marketplace]: {
      name: 'Mech Marketplace',
      contract: new MulticallContract(
        '0x4554fE75c1f5576c1d7F765B2A036c199Adae329',
        MECH_MARKETPLACE_ABI,
      ),
    },
  },
};
