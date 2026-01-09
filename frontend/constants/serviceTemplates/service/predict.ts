import { ethers } from 'ethers';

import { AgentMap, EnvProvisionMap as EnvProvisionType } from '@/constants';
import { ServiceTemplate } from '@/types';
import { parseEther } from '@/utils';

import { MiddlewareChainMap } from '../../chains';
import { STAKING_PROGRAM_IDS } from '../../stakingProgram';
import { X402_ENABLED_FLAGS } from '../../x402';
import { KPI_DESC_PREFIX } from '../constants';

export const PREDICT_SERVICE_TEMPLATE: ServiceTemplate = {
  agentType: AgentMap.PredictTrader,
  name: 'Trader Agent', // should be unique across all services and not be updated
  hash: 'bafybeibw46xqqqpzfiw5if7aoknstlxc4bmraiqyj7v3w7a3kzcybpsbou',
  description: `${KPI_DESC_PREFIX} Trader agent for omen prediction markets`,
  image:
    'https://operate.olas.network/_next/image?url=%2Fimages%2Fprediction-agent.png&w=3840&q=75',
  service_version: 'v0.27.7',
  agent_release: {
    is_aea: true,
    repository: {
      owner: 'valory-xyz',
      name: 'trader',
      version: 'v0.27.7',
    },
  },
  home_chain: MiddlewareChainMap.GNOSIS,
  configurations: {
    [MiddlewareChainMap.GNOSIS]: {
      staking_program_id: STAKING_PROGRAM_IDS.PearlBetaMechMarketplace1, // default, may be overwritten
      nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
      rpc: 'http://localhost:8545', // overwritten
      agent_id: 14,
      // TODO: pull fund requirements from staking program config
      cost_of_bond: +parseEther(0.001),
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: +parseEther(2),
          safe: +parseEther(8),
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
    GNOSIS_LEDGER_RPC: {
      name: 'Gnosis ledger RPC',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    STAKING_CONTRACT_ADDRESS: {
      name: 'Staking contract address',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    MECH_MARKETPLACE_CONFIG: {
      name: 'Mech marketplace configuration',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    MECH_ACTIVITY_CHECKER_CONTRACT: {
      name: 'Mech activity checker contract',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    MECH_CONTRACT_ADDRESS: {
      name: 'Mech contract address',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    MECH_REQUEST_PRICE: {
      name: 'Mech request price',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    USE_MECH_MARKETPLACE: {
      name: 'Use Mech marketplace',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    TOOLS_ACCURACY_HASH: {
      name: 'Tools accuracy hash',
      description: '',
      value: 'QmWgsqncF22hPLNTyWtDzVoKPJ9gmgR1jcuLL5t31xyzzr',
      provision_type: EnvProvisionType.FIXED,
    },
    ACC_INFO_FIELDS_REQUESTS: {
      name: 'Acc info fields requests',
      description: '',
      value: 'nr_responses',
      provision_type: EnvProvisionType.FIXED,
    },
    MECH_INTERACT_ROUND_TIMEOUT_SECONDS: {
      name: 'Mech interact round timeout',
      description: '',
      value: '900', // 15 min
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
    IRRELEVANT_TOOLS: {
      name: 'Irrelevant tools',
      description: '',
      value:
        '["native-transfer","prediction-online-lite","claude-prediction-online-lite","prediction-online-sme-lite","prediction-request-reasoning-lite","prediction-request-reasoning-claude-lite","prediction-offline-sme","deepmind-optimization","deepmind-optimization-strong","openai-gpt-3.5-turbo","openai-gpt-3.5-turbo-instruct","openai-gpt-4","openai-text-davinci-002","openai-text-davinci-003","prediction-online-sum-url-content","prediction-online-summarized-info","stabilityai-stable-diffusion-512-v2-1","stabilityai-stable-diffusion-768-v2-1","stabilityai-stable-diffusion-v1-5","stabilityai-stable-diffusion-xl-beta-v2-2-2","prediction-url-cot-claude","prediction-url-cot","resolve-market-reasoning-gpt-4.1"]',
      provision_type: EnvProvisionType.FIXED,
    },
    GENAI_API_KEY: {
      name: 'Gemini API Key',
      description: 'Gemini api key to allow the agent to use Gemini',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    USE_X402: {
      name: 'Use x402',
      description:
        'Enables feature of agents paying for api keys usage instead of asking users to manually provide them',
      value: X402_ENABLED_FLAGS[AgentMap.PredictTrader].toString(),
      provision_type: EnvProvisionType.FIXED,
    },
  },
} as const;

// TODO: Add real Polygon service template when available
export const PREDICT_POLYMARKET_SERVICE_TEMPLATE: ServiceTemplate = {
  agentType: AgentMap.PredictTrader,
  name: 'Trader Agent Polymarket', // should be unique across all services and not be updated
  hash: 'bafybeibw46xqqqpzfiw5if7aoknstlxc4bmraiqyj7v3w7a3kzcybpsbou',
  description: `${KPI_DESC_PREFIX} Trader agent for omen prediction markets on Polygon`,
  image:
    'https://operate.olas.network/_next/image?url=%2Fimages%2Fprediction-agent.png&w=3840&q=75',
  service_version: 'v0.27.7',
  agent_release: {
    is_aea: true,
    repository: {
      owner: 'valory-xyz',
      name: 'trader',
      version: 'v0.27.7',
    },
  },
  home_chain: MiddlewareChainMap.POLYGON,
  configurations: {
    [MiddlewareChainMap.POLYGON]: {
      staking_program_id: STAKING_PROGRAM_IDS.PearlBetaMechMarketplace1, // default, may be overwritten
      nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
      rpc: 'http://localhost:8545', // overwritten
      agent_id: 14,
      // TODO: pull fund requirements from staking program config
      cost_of_bond: +parseEther(0.001),
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: +parseEther(2),
          safe: +parseEther(8),
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
    GNOSIS_LEDGER_RPC: {
      name: 'Gnosis ledger RPC',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    STAKING_CONTRACT_ADDRESS: {
      name: 'Staking contract address',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    MECH_MARKETPLACE_CONFIG: {
      name: 'Mech marketplace configuration',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    MECH_ACTIVITY_CHECKER_CONTRACT: {
      name: 'Mech activity checker contract',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    MECH_CONTRACT_ADDRESS: {
      name: 'Mech contract address',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    MECH_REQUEST_PRICE: {
      name: 'Mech request price',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    USE_MECH_MARKETPLACE: {
      name: 'Use Mech marketplace',
      description: '',
      value: '',
      provision_type: EnvProvisionType.COMPUTED,
    },
    TOOLS_ACCURACY_HASH: {
      name: 'Tools accuracy hash',
      description: '',
      value: 'QmWgsqncF22hPLNTyWtDzVoKPJ9gmgR1jcuLL5t31xyzzr',
      provision_type: EnvProvisionType.FIXED,
    },
    ACC_INFO_FIELDS_REQUESTS: {
      name: 'Acc info fields requests',
      description: '',
      value: 'nr_responses',
      provision_type: EnvProvisionType.FIXED,
    },
    MECH_INTERACT_ROUND_TIMEOUT_SECONDS: {
      name: 'Mech interact round timeout',
      description: '',
      value: '900', // 15 min
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
    IRRELEVANT_TOOLS: {
      name: 'Irrelevant tools',
      description: '',
      value:
        '["native-transfer","prediction-online-lite","claude-prediction-online-lite","prediction-online-sme-lite","prediction-request-reasoning-lite","prediction-request-reasoning-claude-lite","prediction-offline-sme","deepmind-optimization","deepmind-optimization-strong","openai-gpt-3.5-turbo","openai-gpt-3.5-turbo-instruct","openai-gpt-4","openai-text-davinci-002","openai-text-davinci-003","prediction-online-sum-url-content","prediction-online-summarized-info","stabilityai-stable-diffusion-512-v2-1","stabilityai-stable-diffusion-768-v2-1","stabilityai-stable-diffusion-v1-5","stabilityai-stable-diffusion-xl-beta-v2-2-2","prediction-url-cot-claude","prediction-url-cot","resolve-market-reasoning-gpt-4.1"]',
      provision_type: EnvProvisionType.FIXED,
    },
    GENAI_API_KEY: {
      name: 'Gemini API Key',
      description: 'Gemini api key to allow the agent to use Gemini',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    USE_X402: {
      name: 'Use x402',
      description:
        'Enables feature of agents paying for api keys usage instead of asking users to manually provide them',
      value: X402_ENABLED_FLAGS[AgentMap.PredictTrader].toString(),
      provision_type: EnvProvisionType.FIXED,
    },
  },
} as const;
