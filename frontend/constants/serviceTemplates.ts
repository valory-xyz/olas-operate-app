import { ethers } from 'ethers';

import { EnvProvisionType, MiddlewareChain, ServiceTemplate } from '@/client';
import { MODE_TOKEN_CONFIG, OPTIMISM_TOKEN_CONFIG } from '@/config/tokens';
import { AgentType } from '@/enums/Agent';
import { STAKING_PROGRAM_IDS } from '@/enums/StakingProgram';
import { TokenSymbol } from '@/enums/Token';
import { parseEther, parseUnits } from '@/utils/numberFormatters';

export const PREDICT_SERVICE_TEMPLATE: ServiceTemplate = {
  agentType: AgentType.PredictTrader, // TODO: remove if causes errors on middleware
  name: 'Trader Agent', // Should be unique across all services and not be updated
  hash: 'bafybeihgmbbjtkrlu62bkm3e4j2ehqipv5huqpifjiyttvjrk4sikwsfzu',
  description: 'Trader agent for omen prediction markets',
  image:
    'https://operate.olas.network/_next/image?url=%2Fimages%2Fprediction-agent.png&w=3840&q=75',
  service_version: 'v0.25.0',
  home_chain: MiddlewareChain.GNOSIS,
  configurations: {
    [MiddlewareChain.GNOSIS]: {
      staking_program_id: STAKING_PROGRAM_IDS.PearlBeta, // default, may be overwritten
      nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
      rpc: 'http://localhost:8545', // overwritten
      agent_id: 14,
      threshold: 1,
      use_staking: true,
      use_mech_marketplace: false,
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
      // Use the latest value from https://github.com/valory-xyz/quickstart/blob/main/configs/config_predict_trader.json#L74
      value: 'QmVCKTpXjK6gtcsCBivrGVaH1rQuBgtEVVMTjmn3uE1mZp',
      provision_type: EnvProvisionType.FIXED,
    },
  },
} as const;

const AGENTS_FUN_COMMON_TEMPLATE: Pick<
  ServiceTemplate,
  'env_variables' | 'hash' | 'image' | 'description' | 'service_version'
> = {
  hash: 'bafybeidxfdlaeywhnhafix2yzrnbldk5cybwal53o6mtabnamnxmwtprea',
  image:
    'https://gateway.autonolas.tech/ipfs/QmQYDGMg8m91QQkTWSSmANs5tZwKrmvUCawXZfXVVWQPcu',
  description: 'Memeooorr @twitter_handle', // should be overwritten with twitter username
  service_version: 'v0.4.2-alpha1',
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
    TWIKIT_USERNAME: {
      name: 'Twitter username',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    TWIKIT_EMAIL: {
      name: 'Twitter email',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    TWIKIT_PASSWORD: {
      name: 'Twitter password',
      description: '',
      value: '',
      provision_type: EnvProvisionType.USER,
    },
    TWIKIT_COOKIES: {
      name: 'Twitter cookies',
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
    // These are fixed, but may become user provided in the future
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
      value: '1800',
      provision_type: EnvProvisionType.FIXED,
    },
    STORE_PATH: {
      name: 'Store path',
      description: '',
      value: 'persistent_data/',
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
export const AGENTS_FUN_BASE_TEMPLATE: ServiceTemplate = {
  agentType: AgentType.Memeooorr,
  name: 'Memeooorr', // Should be unique across all services and not be updated
  home_chain: MiddlewareChain.BASE,
  configurations: {
    [MiddlewareChain.BASE]: {
      staking_program_id: STAKING_PROGRAM_IDS.AgentsFun1, // default, may be overwritten
      nft: 'bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
      rpc: 'http://localhost:8545', // overwritten
      agent_id: 43,
      threshold: 1,
      use_staking: true,
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

// TODO: celo template (check each key)
/**
 * Agents.fun Celo template
 */
export const AGENTS_FUN_CELO_TEMPLATE: ServiceTemplate = {
  agentType: AgentType.AgentsFunCelo,
  name: 'Memeooorr - Celo', // Should be unique across all services and not be updated
  home_chain: MiddlewareChain.CELO,
  configurations: {
    [MiddlewareChain.CELO]: {
      staking_program_id: STAKING_PROGRAM_IDS.MemeCeloAlpha2, // default, may be overwritten
      nft: 'bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
      rpc: 'http://localhost:8545', // overwritten
      agent_id: 43,
      threshold: 1,
      use_staking: true,
      cost_of_bond: +parseEther(50), // TODO: celo
      monthly_gas_estimate: +parseEther(0.03), // TODO: celo
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: +parseEther(0.00625), // TODO: celo
          safe: +parseEther(0.0125), // TODO: celo
        },
      },
    },
  },
  ...AGENTS_FUN_COMMON_TEMPLATE,
} as const;

export const MODIUS_SERVICE_TEMPLATE: ServiceTemplate = {
  agentType: AgentType.Modius,
  name: 'Optimus', // Should be unique across all services and not be updated
  hash: 'bafybeiecjxha2ouqupttgdax7j4xmzfr6icuu55kq5xo2bwhkrl2po5khq',
  description: 'Optimus',
  image:
    'https://gateway.autonolas.tech/ipfs/bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
  service_version: 'v0.3.15',
  home_chain: MiddlewareChain.MODE,
  configurations: {
    [MiddlewareChain.MODE]: {
      staking_program_id: STAKING_PROGRAM_IDS.ModiusAlpha, // default, may be overwritten
      nft: 'bafybeiafjcy63arqkfqbtjqpzxyeia2tscpbyradb4zlpzhgc3xymwmmtu',
      rpc: 'http://localhost:8545', // overwritten
      agent_id: 40,
      threshold: 1,
      use_staking: true,
      cost_of_bond: +parseEther(20),
      monthly_gas_estimate: +parseEther(0.011), // TODO: should be 0.0055, temp fix to avoid low balance alerts until the refund is fixed in the middleware
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: +parseEther(0.0005),
          safe: +parseEther(0.005),
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
    RESET_PAUSE_DURATION: {
      name: 'Reset pause duration',
      description: '',
      value: '300',
      provision_type: EnvProvisionType.FIXED,
    },
  },
} as const;

export const OPTIMUS_SERVICE_TEMPLATE: ServiceTemplate = {
  agentType: AgentType.Optimus,
  name: 'Optimus - Optimism',
  hash: 'bafybeicow5ce4hdgglydvuhcvqvmppeuzwatckrprbq6vlbjz26l67u3vq',
  description: 'Optimus service deployment on Optimism network',
  image:
    'https://gateway.autonolas.tech/ipfs/bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
  service_version: 'v0.3.15',
  home_chain: MiddlewareChain.OPTIMISM,
  configurations: {
    [MiddlewareChain.OPTIMISM]: {
      staking_program_id: STAKING_PROGRAM_IDS.OptimusAlpha, // default, may be overwritten
      nft: 'bafybeiafjcy63arqkfqbtjqpzxyeia2tscpbyradb4zlpzhgc3xymwmmtu',
      rpc: 'http://localhost:8545', // overwritten
      agent_id: 40,
      threshold: 1,
      use_staking: true,
      cost_of_bond: +parseEther(20),
      monthly_gas_estimate: +parseEther(0.011),
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: +parseEther(0.0007),
          safe: +parseEther(0.0057),
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
    RESET_PAUSE_DURATION: {
      name: 'Reset pause duration',
      description: '',
      value: '300',
      provision_type: EnvProvisionType.FIXED,
    },
  },
} as const;

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  PREDICT_SERVICE_TEMPLATE,
  AGENTS_FUN_BASE_TEMPLATE,
  MODIUS_SERVICE_TEMPLATE,
  AGENTS_FUN_CELO_TEMPLATE,
  OPTIMUS_SERVICE_TEMPLATE,
] as const;

export const getServiceTemplates = (): ServiceTemplate[] => SERVICE_TEMPLATES;

export const getServiceTemplate = (
  templateHash: string,
): ServiceTemplate | undefined =>
  SERVICE_TEMPLATES.find((template) => template.hash === templateHash);
