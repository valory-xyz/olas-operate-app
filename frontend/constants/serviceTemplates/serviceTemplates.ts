import { ethers } from 'ethers';

import { AgentMap, EnvProvisionMap as EnvProvisionType } from '@/constants';
import { ServiceTemplate } from '@/types';
import { parseEther } from '@/utils';

import { MiddlewareChainMap } from '../chains';
import { STAKING_PROGRAM_IDS } from '../stakingProgram';
import { MODIUS_SERVICE_TEMPLATE, OPTIMUS_SERVICE_TEMPLATE } from '.';
import { KPI_DESC_PREFIX } from './constants';
import {
  PREDICT_POLYMARKET_SERVICE_TEMPLATE,
  PREDICT_SERVICE_TEMPLATE,
} from './service/trader';

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
  service_version: 'v2.1.1',
  agent_release: {
    is_aea: true,
    repository: {
      owner: 'valory-xyz',
      name: 'meme-ooorr',
      version: 'v2.1.1',
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
      rpc: '', // overwritten
      agent_id: 43,
      cost_of_bond: parseEther(50),
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: parseEther(0.0003257),
          safe: parseEther(0.0016285),
        },
      },
    },
  },
  ...AGENTS_FUN_COMMON_TEMPLATE,
} as const;

export const PETT_AI_SERVICE_TEMPLATE: ServiceTemplate = {
  agentType: AgentMap.PettAi,
  name: 'pett_agent',
  hash: 'bafybeiebj5n56dvxyxp6ml53hkgiawnnyzikshmd6kvd5foaitcknx3m4q',
  description: 'Pett.ai autonomous agent service for virtual pet management.',
  image:
    'https://gateway.autonolas.tech/ipfs/QmQYDGMg8m91QQkTWSSmANs5tZwKrmvUCawXZfXVVWQPcu',
  service_version: 'v0.1.4',
  agent_release: {
    is_aea: false,
    repository: {
      owner: 'valory-xyz',
      name: 'pettai-agent',
      version: 'v0.1.4',
    },
  },
  home_chain: MiddlewareChainMap.BASE,
  configurations: {
    [MiddlewareChainMap.BASE]: {
      staking_program_id: STAKING_PROGRAM_IDS.PettAiAgent3,
      nft: 'bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
      rpc: '', // overwritten
      agent_id: 80,
      cost_of_bond: parseEther(20),
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: parseEther(0.00008),
          safe: '0',
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
  PREDICT_POLYMARKET_SERVICE_TEMPLATE,
  AGENTS_FUN_BASE_TEMPLATE,
  MODIUS_SERVICE_TEMPLATE,
  OPTIMUS_SERVICE_TEMPLATE,
  PETT_AI_SERVICE_TEMPLATE,
] as const;
