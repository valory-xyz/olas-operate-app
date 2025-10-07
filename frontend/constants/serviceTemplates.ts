import { ethers } from 'ethers';

import { MiddlewareChain, ServiceTemplate } from '@/client';
import { MODE_TOKEN_CONFIG, OPTIMISM_TOKEN_CONFIG } from '@/config/tokens';
import { EnvProvisionMap as EnvProvisionType } from '@/constants/envVariables';
import { AgentType } from '@/enums/Agent';
import { STAKING_PROGRAM_IDS } from '@/enums/StakingProgram';
import { TokenSymbol } from '@/enums/Token';
import { parseEther, parseUnits } from '@/utils/numberFormatters';

/**
 * Prefix for KPI description in service templates.
 * This is used track services that are part of the Pearl service suite.
 */
export const KPI_DESC_PREFIX = '[Pearl service]';

export const PREDICT_SERVICE_TEMPLATE: ServiceTemplate = {
  agentType: AgentType.PredictTrader, // TODO: remove if causes errors on middleware
  name: 'Trader Agent', // should be unique across all services and not be updated
  hash: 'bafybeie2bn7yhrjqjx7j3lbyjd6ds2t4m5m22bfomwl36ajjthlfaxfauq',
  description: `${KPI_DESC_PREFIX} Trader agent for omen prediction markets`,
  image:
    'https://operate.olas.network/_next/image?url=%2Fimages%2Fprediction-agent.png&w=3840&q=75',
  service_version: 'v0.27.2',
  agent_release: {
    is_aea: true,
    repository: {
      owner: 'valory-xyz',
      name: 'trader',
      version: 'v27.0.2',
    },
  },
  home_chain: MiddlewareChain.GNOSIS,
  configurations: {
    [MiddlewareChain.GNOSIS]: {
      staking_program_id: STAKING_PROGRAM_IDS.PearlBeta, // default, may be overwritten
      nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
      rpc: 'http://localhost:8545', // overwritten
      agent_id: 14,
      // TODO: pull fund requirements from staking program config
      cost_of_bond: +parseEther(0.001),
      monthly_gas_estimate: +parseEther(10),
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: +parseEther(2),
          safe: +parseEther(5),
        },
      },
    },
  },
  env_variables: {
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
        '["native-transfer","prediction-online-lite","claude-prediction-online-lite","prediction-online-sme-lite","prediction-request-reasoning-lite","prediction-request-reasoning-claude-lite","prediction-offline-sme","deepmind-optimization","deepmind-optimization-strong","openai-gpt-3.5-turbo","openai-gpt-3.5-turbo-instruct","openai-gpt-4","openai-text-davinci-002","openai-text-davinci-003","prediction-online-sum-url-content","prediction-online-summarized-info","stabilityai-stable-diffusion-512-v2-1","stabilityai-stable-diffusion-768-v2-1","stabilityai-stable-diffusion-v1-5","stabilityai-stable-diffusion-xl-beta-v2-2-2","prediction-url-cot-claude","prediction-url-cot"]',
      provision_type: EnvProvisionType.FIXED,
    },
    GENAI_API_KEY: {
      name: 'Gemini API Key',
      description: 'Gemini api key to allow the agent to use Gemini',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    GNOSIS_STAKING_SUBGRAPH_URL: {
      name: 'Gnosis staking subgraph URL',
      description: '',
      value:
        'https://gateway-arbitrum.network.thegraph.com/api/{SUBGRAPH_API_KEY}/subgraphs/id/F3iqL2iw5UTrP1qbb4S694pGEkBwzoxXp1TRikB2K4e',
      provision_type: EnvProvisionType.COMPUTED,
    },
  },
} as const;

const AGENTS_FUN_COMMON_TEMPLATE: Pick<
  ServiceTemplate,
  | 'env_variables'
  | 'hash'
  | 'image'
  | 'description'
  | 'service_version'
  | 'agent_release'
> = {
  hash: 'bafybeiardecju3sygh7hwuywka2bgjinbr7vrzob4mpdrookyfsbdmoq2m',
  image:
    'https://gateway.autonolas.tech/ipfs/QmQYDGMg8m91QQkTWSSmANs5tZwKrmvUCawXZfXVVWQPcu',
  description: `${KPI_DESC_PREFIX} Agents.Fun @twitter_handle`, // NOTE: @twitter_handle to be replaced with twitter username
  service_version: 'v0.8.0-alpha3',
  agent_release: {
    is_aea: true,
    repository: {
      owner: 'valory-xyz',
      name: 'meme-ooorr',
      version: 'v0.0.1001',
    },
  },
  env_variables: {
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
    GENAI_API_KEY: {
      name: 'Gemini api key',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    FIREWORKS_API_KEY: {
      name: 'Fireworks AI api key',
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
    FEEDBACK_PERIOD_HOURS: {
      name: 'Feedback period',
      description: '',
      value: '1',
      provision_type: EnvProvisionType.FIXED,
    },
    MIN_FEEDBACK_REPLIES: {
      name: 'Minimum feedback replies',
      description: '',
      value: '10',
      provision_type: EnvProvisionType.FIXED,
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
  },
} as const;

/**
 * Agents.fun Base template
 */
const AGENTS_FUN_BASE_TEMPLATE: ServiceTemplate = {
  agentType: AgentType.AgentsFun,
  name: 'Agents.Fun',
  home_chain: MiddlewareChain.BASE,
  configurations: {
    [MiddlewareChain.BASE]: {
      staking_program_id: STAKING_PROGRAM_IDS.AgentsFun1, // default, may be overwritten
      nft: 'bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
      rpc: 'http://localhost:8545', // overwritten
      agent_id: 43,
      cost_of_bond: +parseEther(50),
      monthly_gas_estimate: +parseEther(0.03),
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: +parseEther(0.00625),
          safe: +parseEther(0.0125),
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
  hash: 'bafybeihnwktiqopqvztnoohfs4bvdwvliaba32uzet2f6jkflycph3msie',
  service_version: 'v0.5.8',
  agent_release: {
    is_aea: true,
    repository: {
      owner: 'valory-xyz',
      name: 'optimus',
      version: 'v0.0.1051',
    },
  },
};

export const MODIUS_SERVICE_TEMPLATE: ServiceTemplate = {
  agentType: AgentType.Modius,
  name: 'Optimus',
  description: `${KPI_DESC_PREFIX} Optimus`,
  image:
    'https://gateway.autonolas.tech/ipfs/bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
  home_chain: MiddlewareChain.MODE,
  configurations: {
    [MiddlewareChain.MODE]: {
      staking_program_id: STAKING_PROGRAM_IDS.ModiusAlpha, // default, may be overwritten
      nft: 'bafybeiafjcy63arqkfqbtjqpzxyeia2tscpbyradb4zlpzhgc3xymwmmtu',
      rpc: 'http://localhost:8545', // overwritten
      agent_id: 40,
      cost_of_bond: +parseEther(20),
      monthly_gas_estimate: +parseEther(0.011), // TODO: should be 0.0055, temp fix to avoid low balance alerts until the refund is fixed in the middleware
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: +parseEther(0.0005),
          safe: 0,
        },
        [MODE_TOKEN_CONFIG[TokenSymbol.USDC].address as string]: {
          agent: 0,
          safe: +parseUnits(16, MODE_TOKEN_CONFIG[TokenSymbol.USDC].decimals),
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
    TENDERLY_ACCESS_KEY: {
      name: 'Tenderly access key',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    TENDERLY_ACCOUNT_SLUG: {
      name: 'Tenderly account slug',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    TENDERLY_PROJECT_SLUG: {
      name: 'Tenderly project slug',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
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
  },
  ...BABYDEGEN_COMMON_TEMPLATE,
} as const;

export const OPTIMUS_SERVICE_TEMPLATE: ServiceTemplate = {
  agentType: AgentType.Optimus,
  name: 'Optimus - Optimism',
  description: `${KPI_DESC_PREFIX} Optimus service deployment on Optimism network`,
  image:
    'https://gateway.autonolas.tech/ipfs/bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
  home_chain: MiddlewareChain.OPTIMISM,
  configurations: {
    [MiddlewareChain.OPTIMISM]: {
      staking_program_id: STAKING_PROGRAM_IDS.OptimusAlpha, // default, may be overwritten
      nft: 'bafybeiafjcy63arqkfqbtjqpzxyeia2tscpbyradb4zlpzhgc3xymwmmtu',
      rpc: 'http://localhost:8545', // overwritten
      agent_id: 40,
      cost_of_bond: +parseEther(20),
      monthly_gas_estimate: +parseEther(0.011),
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: +parseEther(0.0007),
          safe: 0,
        },
        [OPTIMISM_TOKEN_CONFIG[TokenSymbol.USDC].address as string]: {
          agent: 0,
          safe: +parseUnits(
            16,
            OPTIMISM_TOKEN_CONFIG[TokenSymbol.USDC].decimals,
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
    TENDERLY_ACCESS_KEY: {
      name: 'Tenderly access key',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    TENDERLY_ACCOUNT_SLUG: {
      name: 'Tenderly account slug',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    TENDERLY_PROJECT_SLUG: {
      name: 'Tenderly project slug',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
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
  },
  ...BABYDEGEN_COMMON_TEMPLATE,
} as const;

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  PREDICT_SERVICE_TEMPLATE,
  AGENTS_FUN_BASE_TEMPLATE,
  MODIUS_SERVICE_TEMPLATE,
  OPTIMUS_SERVICE_TEMPLATE,
] as const;

export const getServiceTemplates = (): ServiceTemplate[] => SERVICE_TEMPLATES;

export const getServiceTemplate = (
  templateHash: string,
): ServiceTemplate | undefined =>
  SERVICE_TEMPLATES.find((template) => template.hash === templateHash);
