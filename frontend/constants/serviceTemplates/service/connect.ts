import { ethers } from 'ethers';

import {
  BASE_TOKEN_CONFIG,
  POLYGON_TOKEN_CONFIG,
  TokenSymbolMap,
} from '@/config/tokens';
import { AgentMap, EnvProvisionMap as EnvProvisionType } from '@/constants';
import { ServiceTemplate } from '@/types';
import { parseEther, parseUnits } from '@/utils';

import { MiddlewareChainMap } from '../../chains';
import { KPI_DESC_PREFIX } from '../constants';

/**
 * Fields shared by every chain's `configurations` entry — only
 * `fund_requirements` differs per chain.
 */
const COMMON_CONFIG = {
  staking_program_id: 'no_staking',
  nft: 'bafybeidldvcrd7exlqwutoa5fj7nh6mjrkh7w6tuuwofwdifavvezj6g2e',
  rpc: '', // overwritten
  agent_id: 116,
  cost_of_bond: '1', // Olas ServiceRegistry minting minimum (1 wei)
} as const;

/**
 * Connect service template.
 *
 * One `configurations` block per supported chain (Polygon / Base / Gnosis),
 * each with `staking_program_id: 'no_staking'`. The same `name` is shared
 * across chains; the chain is selected at setup time (see `SelectChain`).
 */
export const CONNECT_SERVICE_TEMPLATE: ServiceTemplate = {
  agentType: AgentMap.Connect,
  name: 'Connect', // should be unique across all services and not be updated
  description: `${KPI_DESC_PREFIX} An agent that provides on-chain wallet and agent capabilities for your AI agent`,
  image:
    'https://gateway.autonolas.tech/ipfs/bafybeidldvcrd7exlqwutoa5fj7nh6mjrkh7w6tuuwofwdifavvezj6g2e',
  hash: 'bafybeibue5tquh2yify7upvvlarotk7rbelg3uicd3dctwb4csa5yxkysi',
  service_version: 'v0.1.0-rc1',
  agent_release: {
    is_aea: false,
    repository: {
      owner: 'valory-xyz',
      name: 'connect',
      version: 'v0.1.0-rc1',
    },
  },
  home_chain: MiddlewareChainMap.GNOSIS,
  configurations: {
    [MiddlewareChainMap.POLYGON]: {
      ...COMMON_CONFIG,
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: parseEther(8),
          safe: parseEther(15),
        },
        [POLYGON_TOKEN_CONFIG[TokenSymbolMap.USDC]?.address as string]: {
          agent: '0',
          safe: parseUnits(
            5,
            POLYGON_TOKEN_CONFIG[TokenSymbolMap.USDC]?.decimals,
          ),
        },
      },
    },
    [MiddlewareChainMap.BASE]: {
      ...COMMON_CONFIG,
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: parseEther(0.0005),
          safe: parseEther(0.0005),
        },
        [BASE_TOKEN_CONFIG[TokenSymbolMap.USDC]?.address as string]: {
          agent: '0',
          safe: parseUnits(5, BASE_TOKEN_CONFIG[TokenSymbolMap.USDC]?.decimals),
        },
      },
    },
    [MiddlewareChainMap.GNOSIS]: {
      ...COMMON_CONFIG,
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: parseEther(0.05),
          safe: parseEther(5),
        },
      },
    },
  },
  env_variables: {
    SAFE_CONTRACT_ADDRESSES: {
      name: 'Safe contract addresses',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    FUND_REQUIREMENTS: {
      name: 'Fund requirements',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    POLYGON_LEDGER_RPC: {
      name: 'Polygon ledger RPC',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    BASE_LEDGER_RPC: {
      name: 'Base ledger RPC',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    GNOSIS_LEDGER_RPC: {
      name: 'Gnosis ledger RPC',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    STORE_PATH: {
      name: 'Store path',
      description: '',
      value: 'persistent_data/',
      provision_type: EnvProvisionType.COMPUTED,
    },
  },
} as const;
