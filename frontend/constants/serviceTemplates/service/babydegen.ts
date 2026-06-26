import { ethers } from 'ethers';

import {
  BASE_TOKEN_CONFIG,
  MODE_TOKEN_CONFIG,
  OPTIMISM_TOKEN_CONFIG,
  TokenSymbolMap,
} from '@/config/tokens';
import { AgentMap, EnvProvisionMap as EnvProvisionType } from '@/constants';
import { ServiceTemplate } from '@/types';
import { parseEther, parseUnits } from '@/utils';

import { MiddlewareChainMap } from '../../chains';
import { STAKING_PROGRAM_IDS } from '../../stakingProgram';
import { X402_ENABLED_FLAGS } from '../../x402';
import { KPI_DESC_PREFIX } from '../constants';

// Modius + Optimus share this (reverted to the version on `staging`; the new
// staking contracts for these agents are hidden for now). Basius ships the
// newer build with its own hash below.
const BABYDEGEN_COMMON_TEMPLATE: Pick<
  ServiceTemplate,
  'hash' | 'service_version' | 'agent_release'
> = {
  hash: 'bafybeigjyo22nl622tn5kbntetyr6obbr3rtk2rzfu6zbqh7xaejehanum',
  service_version: 'v0.12.0-rc11',
  agent_release: {
    is_aea: true,
    repository: {
      owner: 'valory-xyz',
      name: 'optimus',
      version: 'v0.12.0-rc11',
    },
  },
};

// Basius ships its own (latest) build — kept separate so reverting the shared
// babydegen hash for Modius/Optimus doesn't drag Basius back.
const BASIUS_TEMPLATE_RELEASE: Pick<
  ServiceTemplate,
  'hash' | 'service_version' | 'agent_release'
> = {
  hash: 'bafybeicp74th4cghtcnk4nvdhfnxwodwuuv3vrisk6ijetf7ausk7xsama',
  service_version: 'v0.12.0-rc11',
  agent_release: {
    is_aea: true,
    repository: {
      owner: 'valory-xyz',
      name: 'optimus',
      version: 'v0.12.0-rc11',
    },
  },
};

// Optimus ships its own build — separated from the shared babydegen hash so
// Optimism-specific mech config (priority mech 195 on Optimism, prediction-offline
// tool) doesn't get applied to Modius too.
const OPTIMUS_TEMPLATE_RELEASE: Pick<
  ServiceTemplate,
  'hash' | 'service_version' | 'agent_release'
> = {
  hash: 'bafybeieh7ipqea66s2p3km52fwnkeosileg5rqwecmon4azuohwbxvowye',
  service_version: 'v0.12.1',
  agent_release: {
    is_aea: true,
    repository: {
      owner: 'valory-xyz',
      name: 'optimus',
      version: 'v0.12.1',
    },
  },
};

export const MODIUS_SERVICE_TEMPLATE: ServiceTemplate = {
  agentType: AgentMap.Modius,
  name: 'Optimus',
  description: `${KPI_DESC_PREFIX} Optimus`,
  image:
    'https://gateway.autonolas.tech/ipfs/bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
  home_chain: MiddlewareChainMap.MODE,
  configurations: {
    [MiddlewareChainMap.MODE]: {
      staking_program_id: STAKING_PROGRAM_IDS.ModiusAlpha, // default, may be overwritten
      nft: 'bafybeiafjcy63arqkfqbtjqpzxyeia2tscpbyradb4zlpzhgc3xymwmmtu',
      rpc: '', // overwritten
      agent_id: 40,
      cost_of_bond: parseEther(20),
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: parseEther(0.0002),
          safe: '0',
        },
        [MODE_TOKEN_CONFIG[TokenSymbolMap.USDC]?.address as string]: {
          agent: '0',
          safe: parseUnits(
            16,
            MODE_TOKEN_CONFIG[TokenSymbolMap.USDC]?.decimals,
          ),
        },
      },
    },
  },
  env_variables: {
    MODE_LEDGER_RPC: {
      name: 'Mode ledger RPC',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    SAFE_CONTRACT_ADDRESSES: {
      name: 'Safe contract address',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    STAKING_TOKEN_CONTRACT_ADDRESS: {
      name: 'Staking token contract address',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    COINGECKO_API_KEY: {
      name: 'Coingecko API key',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    GENAI_API_KEY: {
      name: 'Gemini api key',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    STAKING_CHAIN: {
      name: 'Staking chain',
      description: '',
      value: 'mode',
      provision_type: EnvProvisionType.FIXED,
    },
    ACTIVITY_CHECKER_CONTRACT_ADDRESS: {
      name: 'Staking activity checker contract address',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    STAKING_ACTIVITY_CHECKER_CONTRACT_ADDRESS: {
      // Unused, refactored - remove
      name: 'Staking activity checker contract address',
      description: '',
      value: 'Unused',
      provision_type: EnvProvisionType.FIXED,
    },
    MIN_SWAP_AMOUNT_THRESHOLD: {
      name: 'Minimum swap amount threshold',
      description: '',
      value: '15',
      provision_type: EnvProvisionType.FIXED,
    },
    ALLOWED_CHAINS: {
      name: 'Allowed chains',
      description: '',
      value: '["mode"]',
      provision_type: EnvProvisionType.FIXED,
    },
    TARGET_INVESTMENT_CHAINS: {
      name: 'Target investment chains',
      description: '',
      value: '["mode"]',
      provision_type: EnvProvisionType.FIXED,
    },
    INITIAL_ASSETS: {
      name: 'Initial assets',
      description: '',
      value:
        '{"mode":{"0x0000000000000000000000000000000000000000":"ETH","0xd988097fb8612cc24eeC14542bC03424c656005f":"USDC"}}',
      provision_type: EnvProvisionType.FIXED,
    },
    SELECTED_STRATEGIES: {
      name: 'Selected strategies',
      description: '',
      value: '["balancer_pools_search", "asset_lending"]',
      provision_type: EnvProvisionType.FIXED,
    },
    INIT_FALLBACK_GAS: {
      name: 'Init fallback gas',
      description: '',
      value: '250000',
      provision_type: EnvProvisionType.FIXED,
    },
    STORE_PATH: {
      name: 'Store path',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    LOG_DIR: {
      name: 'Log directory',
      description: '',
      value: 'benchmarks/',
      provision_type: EnvProvisionType.COMPUTED,
    },
    RESET_PAUSE_DURATION: {
      name: 'Reset pause duration',
      description: '',
      value: '300',
      provision_type: EnvProvisionType.FIXED,
    },
    SSL_CERT_PATH: {
      name: 'SSL certificate path',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    SSL_KEY_PATH: {
      name: 'SSL key path',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    AIRDROP_STARTED: {
      name: 'Airdrop started',
      description: '',
      value: 'true',
      provision_type: EnvProvisionType.FIXED,
    },
    AIRDROP_CONTRACT_ADDRESS: {
      name: 'Airdrop contact address',
      description: '',
      value: '0x5b5F79BB667A25400a8f91F0c18D080abCfD430f',
      provision_type: EnvProvisionType.FIXED,
    },
    USE_X402: {
      name: 'Use x402',
      description:
        'Enables feature of agents paying for api keys usage instead of asking users to manually provide them',
      value: X402_ENABLED_FLAGS[AgentMap.Modius].toString(),
      provision_type: EnvProvisionType.FIXED,
    },
  },
  ...BABYDEGEN_COMMON_TEMPLATE,
} as const;

export const OPTIMUS_SERVICE_TEMPLATE: ServiceTemplate = {
  agentType: AgentMap.Optimus,
  name: 'Optimus - Optimism',
  description: `${KPI_DESC_PREFIX} Optimus service deployment on Optimism network`,
  image:
    'https://gateway.autonolas.tech/ipfs/bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
  home_chain: MiddlewareChainMap.OPTIMISM,
  configurations: {
    [MiddlewareChainMap.OPTIMISM]: {
      staking_program_id: STAKING_PROGRAM_IDS.OptimusAlpha, // default, may be overwritten
      nft: 'bafybeiafjcy63arqkfqbtjqpzxyeia2tscpbyradb4zlpzhgc3xymwmmtu',
      rpc: '', // overwritten
      agent_id: 40,
      cost_of_bond: parseEther(20),
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: parseEther(0.0002),
          safe: '0',
        },
        [OPTIMISM_TOKEN_CONFIG[TokenSymbolMap.USDC]?.address as string]: {
          agent: '0',
          safe: parseUnits(
            16,
            OPTIMISM_TOKEN_CONFIG[TokenSymbolMap.USDC]?.decimals,
          ),
        },
      },
    },
  },
  env_variables: {
    OPTIMISM_LEDGER_RPC: {
      name: 'Optimism ledger RPC',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    SAFE_CONTRACT_ADDRESSES: {
      name: 'Safe contract address',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    STAKING_TOKEN_CONTRACT_ADDRESS: {
      name: 'Staking token contract address',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    COINGECKO_API_KEY: {
      name: 'Coingecko API key',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    GENAI_API_KEY: {
      name: 'Gemini API key',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    STAKING_CHAIN: {
      name: 'Staking chain',
      description: '',
      value: 'optimism',
      provision_type: EnvProvisionType.FIXED,
    },
    ACTIVITY_CHECKER_CONTRACT_ADDRESS: {
      name: 'Staking activity checker contract address',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    TARGET_INVESTMENT_CHAINS: {
      name: 'Target investment chains',
      description: '',
      value: '["optimism"]',
      provision_type: EnvProvisionType.FIXED,
    },
    INITIAL_ASSETS: {
      name: 'Initial assets',
      description: '',
      value:
        '{"optimism":{"0x0000000000000000000000000000000000000000":"ETH","0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85":"USDC"}}',
      provision_type: EnvProvisionType.FIXED,
    },
    INIT_FALLBACK_GAS: {
      name: 'Init fallback gas',
      description: '',
      value: '250000',
      provision_type: EnvProvisionType.FIXED,
    },
    STORE_PATH: {
      name: 'Store path',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    LOG_DIR: {
      name: 'Log directory',
      description: '',
      value: 'benchmarks/',
      provision_type: EnvProvisionType.COMPUTED,
    },
    RESET_PAUSE_DURATION: {
      name: 'Reset pause duration',
      description: '',
      value: '300',
      provision_type: EnvProvisionType.FIXED,
    },
    SSL_CERT_PATH: {
      name: 'SSL certificate path',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    SSL_KEY_PATH: {
      name: 'SSL key path',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    USE_X402: {
      name: 'Use x402',
      description:
        'Enables feature of agents paying for api keys usage instead of asking users to manually provide them',
      value: X402_ENABLED_FLAGS[AgentMap.Optimus].toString(),
      provision_type: EnvProvisionType.FIXED,
    },
  },
  ...OPTIMUS_TEMPLATE_RELEASE,
} as const;

export const BASIUS_SERVICE_TEMPLATE: ServiceTemplate = {
  agentType: AgentMap.Basius,
  name: 'Basius',
  description: `${KPI_DESC_PREFIX} Basius service deployment on Base network`,
  image:
    'https://gateway.autonolas.tech/ipfs/bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
  home_chain: MiddlewareChainMap.BASE,
  configurations: {
    [MiddlewareChainMap.BASE]: {
      staking_program_id: STAKING_PROGRAM_IDS.BasiusI, // default, may be overwritten
      nft: 'bafybeih76rsunj3knqrx2n6d2whf576kd6gf67u5j5t6vo4fnvahlw7v5i',
      rpc: '', // overwritten
      // Olas Registry agent ID 115:
      // https://marketplace.olas.network/ethereum/ai-agents/115
      agent_id: 115,
      cost_of_bond: parseEther(20),
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: parseEther(0.0002),
          safe: '0',
        },
        [BASE_TOKEN_CONFIG[TokenSymbolMap.USDC]?.address as string]: {
          agent: '0',
          safe: parseUnits(
            16,
            BASE_TOKEN_CONFIG[TokenSymbolMap.USDC]?.decimals,
          ),
        },
      },
    },
  },
  // Env-var set matches Optimus 1:1 (no SELECTED_STRATEGIES, no ALLOWED_CHAINS).
  // Confirmed by the Optimus-vs-Basius config-differences doc: "Basius is
  // Optimus pointed at Base, so all cross-cutting machinery is reused as is,
  // with no chain-specific forks." Chain-specific DEX/asset config (Aerodrome
  // contracts, whitelisted tokens) is loaded by the agent runtime from the
  // skill.yaml on the agent side, not via Pearl env vars.
  env_variables: {
    BASE_LEDGER_RPC: {
      name: 'Base ledger RPC',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    SAFE_CONTRACT_ADDRESSES: {
      name: 'Safe contract address',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    STAKING_TOKEN_CONTRACT_ADDRESS: {
      name: 'Staking token contract address',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    COINGECKO_API_KEY: {
      name: 'Coingecko API key',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    GENAI_API_KEY: {
      name: 'Gemini API key',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    STAKING_CHAIN: {
      name: 'Staking chain',
      description: '',
      value: 'base',
      provision_type: EnvProvisionType.FIXED,
    },
    ACTIVITY_CHECKER_CONTRACT_ADDRESS: {
      name: 'Staking activity checker contract address',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    TARGET_INVESTMENT_CHAINS: {
      name: 'Target investment chains',
      description: '',
      value: '["base"]',
      provision_type: EnvProvisionType.FIXED,
    },
    INITIAL_ASSETS: {
      name: 'Initial assets',
      description: '',
      value:
        '{"base":{"0x0000000000000000000000000000000000000000":"ETH","0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913":"USDC"}}',
      provision_type: EnvProvisionType.FIXED,
    },
    INIT_FALLBACK_GAS: {
      name: 'Init fallback gas',
      description: '',
      value: '250000',
      provision_type: EnvProvisionType.FIXED,
    },
    STORE_PATH: {
      name: 'Store path',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    LOG_DIR: {
      name: 'Log directory',
      description: '',
      value: 'benchmarks/',
      provision_type: EnvProvisionType.COMPUTED,
    },
    RESET_PAUSE_DURATION: {
      name: 'Reset pause duration',
      description: '',
      value: '300',
      provision_type: EnvProvisionType.FIXED,
    },
    SSL_CERT_PATH: {
      name: 'SSL certificate path',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    SSL_KEY_PATH: {
      name: 'SSL key path',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    USE_X402: {
      name: 'Use x402',
      description:
        'Enables feature of agents paying for api keys usage instead of asking users to manually provide them',
      value: X402_ENABLED_FLAGS[AgentMap.Basius].toString(),
      provision_type: EnvProvisionType.FIXED,
    },
  },
  ...BASIUS_TEMPLATE_RELEASE,
} as const;
