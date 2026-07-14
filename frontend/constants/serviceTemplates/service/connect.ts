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
 * PLACEHOLDER external dependency — the Connect agent package (IPFS hash,
 * release version, agent id and NFT) is not yet published (see
 * `docs/explorations/connect-agent-plan.md` §5). These values MUST be replaced
 * with the real minted values before enabling service creation (PR2) and
 * before running `scripts/js/check_service_templates.ts`.
 */
const CONNECT_HASH_PLACEHOLDER = 'PLACEHOLDER_CONNECT_HASH';
const CONNECT_SERVICE_VERSION_PLACEHOLDER = 'PLACEHOLDER_CONNECT_VERSION';
const CONNECT_NFT_PLACEHOLDER = 'PLACEHOLDER_CONNECT_NFT';
const CONNECT_AGENT_ID_PLACEHOLDER = 0; // TODO(PR2): real Olas Registry agent id
const CONNECT_COST_OF_BOND_PLACEHOLDER = parseEther(1); // unused for no_staking

// Raw per-chain funding amounts (native + USDC).
const POLYGON_NATIVE_POL = 15;
const BASE_NATIVE_ETH = 0.0005;
const GNOSIS_NATIVE_XDAI = 5;
const USDC_AMOUNT = 5;

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
  // TODO: update to Connect NFT
  image:
    'https://gateway.autonolas.tech/ipfs/bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
  hash: CONNECT_HASH_PLACEHOLDER,
  service_version: CONNECT_SERVICE_VERSION_PLACEHOLDER,
  agent_release: {
    is_aea: false,
    repository: {
      owner: 'valory-xyz',
      name: 'pearl-connect',
      version: CONNECT_SERVICE_VERSION_PLACEHOLDER,
    },
  },
  home_chain: MiddlewareChainMap.GNOSIS,
  configurations: {
    [MiddlewareChainMap.POLYGON]: {
      staking_program_id: 'no_staking',
      nft: CONNECT_NFT_PLACEHOLDER,
      rpc: '', // overwritten
      agent_id: CONNECT_AGENT_ID_PLACEHOLDER,
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: '0',
          safe: parseEther(POLYGON_NATIVE_POL),
        },
        [POLYGON_TOKEN_CONFIG[TokenSymbolMap.USDC]?.address as string]: {
          agent: '0',
          safe: parseUnits(
            USDC_AMOUNT,
            POLYGON_TOKEN_CONFIG[TokenSymbolMap.USDC]?.decimals,
          ),
        },
      },
    },
    [MiddlewareChainMap.BASE]: {
      staking_program_id: 'no_staking',
      nft: CONNECT_NFT_PLACEHOLDER,
      rpc: '', // overwritten
      agent_id: CONNECT_AGENT_ID_PLACEHOLDER,
      cost_of_bond: CONNECT_COST_OF_BOND_PLACEHOLDER,
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: '0',
          safe: parseEther(BASE_NATIVE_ETH),
        },
        [BASE_TOKEN_CONFIG[TokenSymbolMap.USDC]?.address as string]: {
          agent: '0',
          safe: parseUnits(
            USDC_AMOUNT,
            BASE_TOKEN_CONFIG[TokenSymbolMap.USDC]?.decimals,
          ),
        },
      },
    },
    [MiddlewareChainMap.GNOSIS]: {
      staking_program_id: 'no_staking',
      nft: CONNECT_NFT_PLACEHOLDER,
      rpc: '', // overwritten
      agent_id: CONNECT_AGENT_ID_PLACEHOLDER,
      cost_of_bond: CONNECT_COST_OF_BOND_PLACEHOLDER,
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: '0',
          safe: parseEther(GNOSIS_NATIVE_XDAI),
        },
      },
    },
  },
  env_variables: {
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
