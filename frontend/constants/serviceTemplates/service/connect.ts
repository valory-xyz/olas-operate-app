import { ethers } from 'ethers';

import {
  ARBITRUM_TOKEN_CONFIG,
  CELO_TOKEN_CONFIG,
  POLYGON_TOKEN_CONFIG,
  ROBINHOOD_TOKEN_CONFIG,
  TokenSymbolMap,
} from '@/config/tokens';
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
const ROBINHOOD_USDG = ROBINHOOD_TOKEN_CONFIG[TokenSymbolMap.USDG];
const ARBITRUM_USDC = ARBITRUM_TOKEN_CONFIG[TokenSymbolMap.USDC];
const CELO_USDC = CELO_TOKEN_CONFIG[TokenSymbolMap.USDC];

/**
 * One asset's entry in Connect's `FUND_REQUIREMENTS`, the `funds-manager`
 * shape: once the balance falls below `threshold`, the agent asks for
 * `topup - balance`. Amounts are wei, as decimal strings. Connect rejects an
 * entry with any other key at startup, so there is no optional field here.
 */
type ConnectFundRequirement = { threshold: string; topup: string };

/**
 * Low-funds rules, consumed by the agent's `/funds-status` endpoint and its
 * Agent Safe → Agent EOA native top-up through the `FUND_REQUIREMENTS` env var.
 *
 * Shape is `{ chain: { 'agent' | 'safe': { asset: { threshold, topup } } } }` —
 * roles, not addresses, since the template can't know the per-user EOA / safe
 * addresses; the agent resolves the roles against the running deployment.
 *
 * `topup` is the initial requirement in `configurations` below. Thresholds are
 * 1/5 of it (product: POL 15/3, USDC 5/1, xDAI 5/1), and the agent-EOA gas
 * budget keeps the same ratio. Robinhood is the exception: only its agent EOA
 * carries a threshold, because that balance is gas and running out of it stops
 * the agent. Its safe thresholds are 0 — see the note on that entry.
 *
 * A 0 threshold disables the alert rather than leaving it unset: the agent
 * reports a deficit only while the balance is below the threshold, and a
 * balance can never be below 0.
 *
 * A Connect instance runs on exactly one chain, but the agent package declares
 * a default RPC for every chain — so the value handed to a deployment must be
 * narrowed to its own chain (see `useCreateConnectService`), otherwise the
 * agent reports a deficit for an unfunded EOA on chains it doesn't operate on.
 *
 * Connect v0.1.11 and earlier read a bare threshold per asset and fail to
 * start on this shape, so the version pin below moves with it.
 */
export const CONNECT_FUND_REQUIREMENTS: Partial<
  Record<
    MiddlewareChain,
    Record<'agent' | 'safe', Record<string, ConnectFundRequirement>>
  >
> = {
  [MiddlewareChainMap.POLYGON]: {
    agent: {
      [ethers.constants.AddressZero]: {
        threshold: parseEther(1.6),
        topup: parseEther(8),
      },
    },
    safe: {
      [ethers.constants.AddressZero]: {
        threshold: parseEther(3),
        topup: parseEther(15),
      },
      [POLYGON_USDC?.address as string]: {
        threshold: parseUnits(1, POLYGON_USDC?.decimals),
        topup: parseUnits(5, POLYGON_USDC?.decimals),
      },
    },
  },
  [MiddlewareChainMap.GNOSIS]: {
    agent: {
      [ethers.constants.AddressZero]: {
        threshold: parseEther(0.01),
        topup: parseEther(0.05),
      },
    },
    safe: {
      [ethers.constants.AddressZero]: {
        threshold: parseEther(1),
        topup: parseEther(5),
      },
    },
  },
  [MiddlewareChainMap.ROBINHOOD]: {
    agent: {
      [ethers.constants.AddressZero]: {
        threshold: parseEther(0.00004),
        topup: parseEther(0.0002),
      },
    },
    // Both safe thresholds are 0, and for the same reason: everything the
    // safe holds on Robinhood is there to be spent. USDG buys mech requests,
    // ETH is what Pons draws on. Alerting as either falls would report normal
    // operation as a fault.
    safe: {
      [ethers.constants.AddressZero]: {
        threshold: '0',
        topup: parseEther(0.0005),
      },
      [ROBINHOOD_USDG?.address as string]: {
        threshold: '0',
        topup: parseUnits(5, ROBINHOOD_USDG?.decimals),
      },
    },
  },
  // Arbitrum's ETH amounts match Robinhood's (both are Arbitrum-stack L2s with
  // ETH gas). Celo's safe CELO matches Gnosis's xDAI; its agent gas budget is
  // 10x Gnosis's, as CELO is worth less than a dollar.
  [MiddlewareChainMap.ARBITRUM_ONE]: {
    agent: {
      [ethers.constants.AddressZero]: {
        threshold: parseEther(0.00004),
        topup: parseEther(0.0002),
      },
    },
    safe: {
      [ethers.constants.AddressZero]: {
        threshold: parseEther(0.0001),
        topup: parseEther(0.0005),
      },
      [ARBITRUM_USDC?.address as string]: {
        threshold: parseUnits(1, ARBITRUM_USDC?.decimals),
        topup: parseUnits(5, ARBITRUM_USDC?.decimals),
      },
    },
  },
  [MiddlewareChainMap.CELO]: {
    agent: {
      [ethers.constants.AddressZero]: {
        threshold: parseEther(0.1),
        topup: parseEther(0.5),
      },
    },
    safe: {
      [ethers.constants.AddressZero]: {
        threshold: parseEther(1),
        topup: parseEther(5),
      },
      [CELO_USDC?.address as string]: {
        threshold: parseUnits(1, CELO_USDC?.decimals),
        topup: parseUnits(5, CELO_USDC?.decimals),
      },
    },
  },
};

/**
 * `FUND_REQUIREMENTS` narrowed to the one chain an instance runs on.
 *
 * A Connect instance runs on exactly one chain, but this template carries the
 * requirements for all of them. Handing a deployment the unnarrowed map makes
 * the agent report a deficit for an unfunded EOA on chains it does not operate
 * on, so both the creation path (`useCreateConnectService`) and the restart
 * path (`updateServiceIfNeeded`, which re-pushes FIXED values that differ from
 * the template) must narrow it the same way.
 */
export const connectFundRequirementsFor = (chain: MiddlewareChain): string => {
  const requirements = CONNECT_FUND_REQUIREMENTS[chain];
  return JSON.stringify(requirements ? { [chain]: requirements } : {});
};

/**
 * Connect service template.
 *
 * One `configurations` block per supported chain,
 * each with `staking_program_id: 'no_staking'`. The same `name` is shared across chains;
 * the chain is selected at setup time (see `SelectChain`).
 */
export const CONNECT_SERVICE_TEMPLATE: ServiceTemplate = {
  agentType: AgentMap.Connect,
  name: 'Connect', // should be unique across all services and not be updated
  description: `${KPI_DESC_PREFIX} An agent that provides on-chain wallet and agent capabilities for your AI agent`,
  image:
    'https://gateway.autonolas.tech/ipfs/bafybeidldvcrd7exlqwutoa5fj7nh6mjrkh7w6tuuwofwdifavvezj6g2e',
  hash: 'bafybeihvqzsr5xilmulq2fskibgqtql2wc4qal3kyxgbowzejlaw5i4dse',
  service_version: 'v0.1.13',
  agent_release: {
    is_aea: false,
    repository: {
      owner: 'valory-xyz',
      name: 'connect',
      version: 'v0.1.13',
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
    [MiddlewareChainMap.ROBINHOOD]: {
      ...COMMON_CONFIG,
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: parseEther(0.0002),
          safe: parseEther(0.0005),
        },
        [ROBINHOOD_USDG?.address as string]: {
          agent: '0',
          safe: parseUnits(5, ROBINHOOD_USDG?.decimals),
        },
      },
    },
    [MiddlewareChainMap.ARBITRUM_ONE]: {
      ...COMMON_CONFIG,
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: parseEther(0.0002),
          safe: parseEther(0.0005),
        },
        [ARBITRUM_USDC?.address as string]: {
          agent: '0',
          safe: parseUnits(5, ARBITRUM_USDC?.decimals),
        },
      },
    },
    [MiddlewareChainMap.CELO]: {
      ...COMMON_CONFIG,
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: parseEther(0.5),
          safe: parseEther(5),
        },
        [CELO_USDC?.address as string]: {
          agent: '0',
          safe: parseUnits(5, CELO_USDC?.decimals),
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
      value: JSON.stringify(CONNECT_FUND_REQUIREMENTS),
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
    ROBINHOOD_LEDGER_RPC: {
      name: 'Robinhood ledger RPC',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    ARBITRUM_ONE_LEDGER_RPC: {
      name: 'Arbitrum ledger RPC',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    CELO_LEDGER_RPC: {
      name: 'Celo ledger RPC',
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
