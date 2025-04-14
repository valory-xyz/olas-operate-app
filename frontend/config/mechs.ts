import { JsonFragment } from '@ethersproject/abi';
import { Contract as MulticallContract } from 'ethers-multicall';

import { AGENT_MECH_ABI } from '@/abis/agentMech';
import { MECH_MARKETPLACE_ABI } from '@/abis/mechMarketplace';
import { MECH_MARKETPLACE_V2_ABI } from '@/abis/mechMarketplaceV2';
import { EvmChainId } from '@/enums/Chain';
import { extractFunctionsFromAbi } from '@/utils/abi';

export enum MechType {
  Agent = 'mech-agent',
  Marketplace = 'mech-marketplace',
}

type Mechs = {
  [EvmChainId.Gnosis]: {
    [mechType: string]: {
      name: string;
      contract: MulticallContract;
    };
  };
  [EvmChainId.Base]: {
    [mechType: string]: {
      name: string;
      contract: MulticallContract;
    };
  };
};

export const MECHS: Mechs = {
  [EvmChainId.Gnosis]: {
    [MechType.Agent]: {
      name: 'Agent Mech',
      contract: new MulticallContract(
        '0x77af31De935740567Cf4fF1986D04B2c964A786a',
        extractFunctionsFromAbi(AGENT_MECH_ABI),
      ),
    },
    [MechType.Marketplace]: {
      name: 'Mech Marketplace',
      contract: new MulticallContract(
        '0x4554fE75c1f5576c1d7F765B2A036c199Adae329',
        MECH_MARKETPLACE_ABI.filter(
          (abi) => (abi as JsonFragment).type === 'function',
        ) as JsonFragment[],
      ),
    },
  },
  [EvmChainId.Base]: {
    [MechType.Marketplace]: {
      name: 'Mech Marketplace',
      contract: new MulticallContract(
        '0xf24eE42edA0fc9b33B7D41B06Ee8ccD2Ef7C5020',
        MECH_MARKETPLACE_V2_ABI.filter(
          (abi) => (abi as JsonFragment).type === 'function',
        ) as JsonFragment[],
      ),
    },
  },
};
