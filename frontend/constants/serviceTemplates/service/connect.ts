import { ethers } from 'ethers';

import { POLYGON_TOKEN_CONFIG, TokenSymbolMap } from '@/config/tokens';
import { AgentMap, EnvProvisionMap as EnvProvisionType } from '@/constants';
import { ServiceTemplate } from '@/types';
import { parseEther, parseUnits } from '@/utils';

import { MiddlewareChain, MiddlewareChainMap } from '../../chains';
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

const POLYGON_USDC = POLYGON_TOKEN_CONFIG[TokenSymbolMap.USDC];

/**
 * Low-funds alert thresholds, consumed by the agent's `/funds-status` endpoint
 * through the `FUND_REQUIREMENTS` env var.
 *
 * Shape is `{ chain: { 'agent' | 'safe': { asset: threshold } } }` — roles, not
 * addresses, since the template can't know the per-user EOA / safe addresses;
 * the agent resolves the roles against the running deployment.
 *
 * Thresholds are 1/5 of the initial requirement in `configurations` below
 * (product: POL 15/3, USDC 5/1, xDAI 5/1), and the agent-EOA gas budget keeps
 * the same ratio.
 *
 * A Connect instance runs on exactly one chain, but the agent package declares
 * a default RPC for every chain — so the value handed to a deployment must be
 * narrowed to its own chain (see `useCreateConnectService`), otherwise the
 * agent reports a deficit for an unfunded EOA on chains it doesn't operate on.
 */
export const CONNECT_FUND_REQUIREMENT_THRESHOLDS: Partial<
  Record<MiddlewareChain, Record<'agent' | 'safe', Record<string, string>>>
> = {
  [MiddlewareChainMap.POLYGON]: {
    agent: { [ethers.constants.AddressZero]: parseEther(1.6) },
    safe: {
      [ethers.constants.AddressZero]: parseEther(3),
      [POLYGON_USDC?.address as string]: parseUnits(1, POLYGON_USDC?.decimals),
    },
  },
  [MiddlewareChainMap.GNOSIS]: {
    agent: { [ethers.constants.AddressZero]: parseEther(0.01) },
    safe: { [ethers.constants.AddressZero]: parseEther(1) },
  },
};

/**
 * Connect service template.
 *
 * One `configurations` block per supported chain (Polygon / Gnosis), each with
 * `staking_program_id: 'no_staking'`. The same `name` is shared across chains;
 * the chain is selected at setup time (see `SelectChain`).
 */
export const CONNECT_SERVICE_TEMPLATE: ServiceTemplate = {
  agentType: AgentMap.Connect,
  name: 'Connect', // should be unique across all services and not be updated
  description: `${KPI_DESC_PREFIX} An agent that provides on-chain wallet and agent capabilities for your AI agent`,
  image:
    'https://gateway.autonolas.tech/ipfs/bafybeidldvcrd7exlqwutoa5fj7nh6mjrkh7w6tuuwofwdifavvezj6g2e',
  hash: 'bafybeibue5tquh2yify7upvvlarotk7rbelg3uicd3dctwb4csa5yxkysi',
  service_version: 'v0.1.0-rc6',
  agent_release: {
    is_aea: false,
    repository: {
      owner: 'valory-xyz',
      name: 'connect',
      version: 'v0.1.0-rc6',
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
        [POLYGON_USDC?.address as string]: {
          agent: '0',
          safe: parseUnits(5, POLYGON_USDC?.decimals),
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
      value: JSON.stringify(CONNECT_FUND_REQUIREMENT_THRESHOLDS),
      provision_type: EnvProvisionType.FIXED,
    },
    POLYGON_LEDGER_RPC: {
      name: 'Polygon ledger RPC',
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
