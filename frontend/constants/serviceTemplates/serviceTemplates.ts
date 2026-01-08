import { ethers } from 'ethers';

import {
  MODE_TOKEN_CONFIG,
  OPTIMISM_TOKEN_CONFIG,
  TokenSymbolMap,
} from '@/config/tokens';
import { AgentMap, EnvProvisionMap as EnvProvisionType } from '@/constants';
import { ServiceTemplate } from '@/types';
import { parseEther, parseUnits } from '@/utils';

import { MiddlewareChainMap } from '../chains';
import { STAKING_PROGRAM_IDS } from '../stakingProgram';
import { X402_ENABLED_FLAGS } from '../x402';
import { KPI_DESC_PREFIX } from './constants';
import {
  // PREDICT_POLYMARKET_SERVICE_TEMPLATE,
  PREDICT_SERVICE_TEMPLATE,
} from './service/predict';

const AGENTS_FUN_COMMON_TEMPLATE: Pick<
  ServiceTemplate,
  | 'env_variables'
  | 'hash'
  | 'image'
  | 'description'
  | 'service_version'
  | 'agent_release'
> = {
  hash: 'bafybeiawqqwkoeovm453mscwkxvmtnvaanhatlqh52cf5sdqavz6ldybae',
  image:
    'https://gateway.autonolas.tech/ipfs/QmQYDGMg8m91QQkTWSSmANs5tZwKrmvUCawXZfXVVWQPcu',
  description: `${KPI_DESC_PREFIX} Agents.Fun @twitter_handle`, // NOTE: @twitter_handle to be replaced with twitter username
  service_version: 'v2.0.2',
  agent_release: {
    is_aea: true,
    repository: {
      owner: 'valory-xyz',
      name: 'meme-ooorr',
      version: 'v2.0.2',
    },
  },
  env_variables: {
    SAFE_CONTRACT_ADDRESSES: {
      name: 'Safe contract addresses',
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
    CELO_LEDGER_RPC: {
      name: 'Celo ledger RPC',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    TWEEPY_CONSUMER_API_KEY: {
      name: 'Twitter consumer API key',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    TWEEPY_CONSUMER_API_KEY_SECRET: {
      name: 'Twitter consumer API key secret',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    TWEEPY_BEARER_TOKEN: {
      name: 'Twitter bearer token',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    TWEEPY_ACCESS_TOKEN: {
      name: 'Twitter access token',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    TWEEPY_ACCESS_TOKEN_SECRET: {
      name: 'Twitter access token secret',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    PERSONA: {
      name: 'Persona description',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    RESET_PAUSE_DURATION: {
      name: 'Reset pause duration',
      description: '',
      value: '300',
      provision_type: EnvProvisionType.FIXED,
    },
    STORE_PATH: {
      name: 'Store path',
      description: '',
      value: 'persistent_data/',
      provision_type: EnvProvisionType.COMPUTED,
    },
    LOG_DIR: {
      name: 'Log directory',
      description: '',
      value: 'benchmarks/',
      provision_type: EnvProvisionType.COMPUTED,
    },
    STAKING_TOKEN_CONTRACT_ADDRESS: {
      name: 'Staking token contract address',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    ACTIVITY_CHECKER_CONTRACT_ADDRESS: {
      name: 'Staking activity checker contract address',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    USE_X402: {
      name: 'Use x402',
      description:
        'Enables feature of agents paying for api keys usage instead of asking users to manually provide them',
      // x402 is always enabled for this agent, the agent wouldn't work without it.
      value: 'true',
      provision_type: EnvProvisionType.FIXED,
    },
  },
} as const;

/**
 * Agents.fun Base template
 */
const AGENTS_FUN_BASE_TEMPLATE: ServiceTemplate = {
  agentType: AgentMap.AgentsFun,
  name: 'Agents.Fun',
  home_chain: MiddlewareChainMap.BASE,
  configurations: {
    [MiddlewareChainMap.BASE]: {
      staking_program_id: STAKING_PROGRAM_IDS.AgentsFun1, // default, may be overwritten
      nft: 'bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
      rpc: 'http://localhost:8545', // overwritten
      agent_id: 43,
      cost_of_bond: +parseEther(50),
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: +parseEther(0.0003257),
          safe: +parseEther(0.0016285),
        },
      },
    },
  },
  ...AGENTS_FUN_COMMON_TEMPLATE,
} as const;

const BABYDEGEN_COMMON_TEMPLATE: Pick<
  ServiceTemplate,
  'hash' | 'service_version' | 'agent_release'
> = {
  hash: 'bafybeidkdnfrueiivrdzrqo67np3w4gsubu5vb6lqxabsx3ulozvj7jtmq',
  service_version: 'v0.6.4',
  agent_release: {
    is_aea: true,
    repository: {
      owner: 'valory-xyz',
      name: 'optimus',
      version: 'v0.6.4',
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
      rpc: 'http://localhost:8545', // overwritten
      agent_id: 40,
      cost_of_bond: +parseEther(20),
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: +parseEther(0.0002),
          safe: 0,
        },
        [MODE_TOKEN_CONFIG[TokenSymbolMap.USDC]?.address as string]: {
          agent: 0,
          safe: +parseUnits(
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
      rpc: 'http://localhost:8545', // overwritten
      agent_id: 40,
      cost_of_bond: +parseEther(20),
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: +parseEther(0.0002),
          safe: 0,
        },
        [OPTIMISM_TOKEN_CONFIG[TokenSymbolMap.USDC]?.address as string]: {
          agent: 0,
          safe: +parseUnits(
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
  ...BABYDEGEN_COMMON_TEMPLATE,
} as const;

const PETT_AI_SERVICE_TEMPLATE: ServiceTemplate = {
  agentType: AgentMap.PettAi,
  name: 'pett_agent',
  hash: 'bafybeiebj5n56dvxyxp6ml53hkgiawnnyzikshmd6kvd5foaitcknx3m4q',
  description: 'Pett.ai autonomous agent service for virtual pet management.',
  image:
    'https://gateway.autonolas.tech/ipfs/QmQYDGMg8m91QQkTWSSmANs5tZwKrmvUCawXZfXVVWQPcu',
  service_version: 'v0.1.0',
  agent_release: {
    is_aea: false,
    repository: {
      owner: 'valory-xyz',
      name: 'pettai-agent',
      version: 'v0.1.0',
    },
  },
  home_chain: MiddlewareChainMap.BASE,
  configurations: {
    [MiddlewareChainMap.BASE]: {
      staking_program_id: STAKING_PROGRAM_IDS.PettAiAgent,
      nft: 'bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
      rpc: 'http://localhost:8545', // overwritten
      agent_id: 80,
      cost_of_bond: +parseEther(20),
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: +parseEther(0.00008),
          safe: 0,
        },
      },
    },
  },
  env_variables: {
    BASE_LEDGER_RPC: {
      name: 'Base ledger RPC',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    WEBSOCKET_URL: {
      name: 'Websocket URL',
      description: 'Endpoint for Pett.ai websocket communication',
      value: 'wss://ws.pett.ai',
      provision_type: EnvProvisionType.FIXED,
    },
    STORE_PATH: {
      name: 'Store path',
      description: '',
      value: 'persistent_data/',
      provision_type: EnvProvisionType.COMPUTED,
    },
    STAKING_CONTRACT_ADDRESS: {
      name: 'Staking contract address',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    ACTIVITY_CHECKER_CONTRACT_ADDRESS: {
      name: 'Staking activity checker contract address',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    SAFE_CONTRACT_ADDRESSES: {
      name: 'Config safe contract addresses',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
  },
} as const;

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  PREDICT_SERVICE_TEMPLATE,
  // PREDICT_POLYMARKET_SERVICE_TEMPLATE,
  AGENTS_FUN_BASE_TEMPLATE,
  MODIUS_SERVICE_TEMPLATE,
  OPTIMUS_SERVICE_TEMPLATE,
  PETT_AI_SERVICE_TEMPLATE,
] as const;
