import { JsonFragment } from '@ethersproject/abi';
import { Contract as MulticallContract } from 'ethers-multicall';

import { AGENT_MECH_ABI } from '@/abis/agentMech';
import { MECH_MARKETPLACE_ABI } from '@/abis/mechMarketplace';
import { MECH_MARKETPLACE_V2_ABI } from '@/abis/mechMarketplaceV2';
import { EvmChainIdMap } from '@/constants';
import { extractFunctionsFromAbi } from '@/utils/abi';

export enum MechType {
  Agent = 'mech-agent',
  Marketplace = 'mech-marketplace',
  MarketplaceV2 = 'mech-marketplace-2v',
}

type Mechs = {
  [EvmChainIdMap.Gnosis]: {
    [mechType: string]: {
      name: string;
      contract: MulticallContract;
    };
  };
  [EvmChainIdMap.Base]: {
    [mechType: string]: {
      name: string;
      contract: MulticallContract;
    };
  };
  [EvmChainIdMap.Polygon]: {
    [mechType: string]: {
      name: string;
      contract: MulticallContract;
    };
  };
};

export const MECHS: Mechs = {
  [EvmChainIdMap.Gnosis]: {
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
    [MechType.MarketplaceV2]: {
      name: 'Mech Marketplace V2',
      contract: new MulticallContract(
        '0x735FAAb1c4Ec41128c367AFb5c3baC73509f70bB',
        MECH_MARKETPLACE_V2_ABI.filter(
          (abi) => (abi as JsonFragment).type === 'function',
        ) as JsonFragment[],
      ),
    },
  },
  [EvmChainIdMap.Base]: {
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
  [EvmChainIdMap.Polygon]: {
    [MechType.MarketplaceV2]: {
      name: 'Mech Marketplace',
      contract: new MulticallContract(
        '0x343F2B005cF6D70bA610CD9F1F1927049414B582',
        MECH_MARKETPLACE_V2_ABI.filter(
          (abi) => (abi as JsonFragment).type === 'function',
        ) as JsonFragment[],
      ),
    },
  },
};
