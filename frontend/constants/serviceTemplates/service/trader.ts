import { ethers } from 'ethers';

import { POLYGON_TOKEN_CONFIG, TokenSymbolMap } from '@/config/tokens';
import { AgentMap, EnvProvisionMap as EnvProvisionType } from '@/constants';
import { ServiceTemplate } from '@/types';
import { parseEther, parseUnits } from '@/utils';

import { MiddlewareChainMap } from '../../chains';
import { STAKING_PROGRAM_IDS } from '../../stakingProgram';
import { X402_ENABLED_FLAGS } from '../../x402';
import { KPI_DESC_PREFIX } from '../constants';

export const PREDICT_SERVICE_TEMPLATE: ServiceTemplate = {
  hash: 'bafybeic5y43hgupsyjztcztrefmysmul4zasojmtu22ewderjl5cu4sqky',
  service_version: 'v0.40.8',
  agent_release: {
    is_aea: true,
    repository: {
      owner: 'valory-xyz',
      name: 'trader',
      version: 'v0.40.8',
    },
  },
  agentType: AgentMap.PredictTrader,
  name: 'Trader Agent', // should be unique across all services and not be updated
  description: `${KPI_DESC_PREFIX} Trader agent for omen prediction markets`,
  image:
    'https://operate.olas.network/_next/image?url=%2Fimages%2Fprediction-agent.png&w=3840&q=75',
  home_chain: MiddlewareChainMap.GNOSIS,
  configurations: {
    [MiddlewareChainMap.GNOSIS]: {
      staking_program_id: STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3, // default, may be overwritten
      nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
      rpc: '', // overwritten
      agent_id: 14,
      cost_of_bond: parseEther(20),
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: parseEther(2),
          // Matches the `safe` topup in the agent package's funds_manager
          safe: parseEther(10),
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
      value: 'Qmc3vbrQLVSmrm7Cn9Za5EnpQphm3DJH8SaR2RLf7cz5XV',
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
    ENABLE_MULTI_BETS_FALLBACK: {
      name: 'Enable multi-bets fallback mode',
      description: 'Enables agents to run in multi-bets fallback mode',
      value: 'false',
      provision_type: EnvProvisionType.FIXED,
    },
    USE_OFFCHAIN: {
      name: 'Use offchain mech dispatch',
      description:
        'Route mech requests via the offchain HTTP path instead of the on-chain marketplace tx. Requires the priority mech to have an offchain endpoint registered.',
      value: 'true',
      provision_type: EnvProvisionType.FIXED,
    },
    OFFCHAIN_DEPOSIT_TARGET_CALLS: {
      name: 'Offchain deposit target calls',
      description:
        'Number of forward mech requests each auto-deposit to the BalanceTracker should cover. Deposit chunk = target_calls * delivery_rate, clamped by auto_deposit_cap_per_cycle.',
      value: '5',
      provision_type: EnvProvisionType.FIXED,
    },
    USE_MECH_ANALYTICS: {
      name: 'Use mech analytics',
      description:
        'Read per-request mech data from the mech-analytics service instead of the on-chain subgraph. Required for surfacing offchain mech requests in agent-performance summaries, which the on-chain subgraph does not index.',
      value: 'true',
      provision_type: EnvProvisionType.FIXED,
    },
    MECH_ANALYTICS_URL: {
      name: 'Mech analytics URL',
      description:
        'Base URL of the mech-analytics HTTP service. Required when USE_MECH_ANALYTICS is true.',
      value: 'https://mech-analytics-api.autonolas.tech',
      provision_type: EnvProvisionType.FIXED,
    },
  },
} as const;

export const PREDICT_POLYMARKET_SERVICE_TEMPLATE: ServiceTemplate = {
  hash: 'bafybeih3lpcr2wqzhctbyut24iqdd4oe6olj3yhvehidppxljylfrdfhim',
  service_version: 'v0.40.9-rc1',
  agent_release: {
    is_aea: true,
    repository: {
      owner: 'valory-xyz',
      name: 'trader',
      version: 'v0.40.9-rc1',
    },
  },
  agentType: AgentMap.Polystrat,
  name: 'Trader Agent Polymarket', // NOTE: should be unique across all services and not be updated
  description: `${KPI_DESC_PREFIX} Trader agent for polymarket prediction markets on Polygon`, // TODO: refine description
  image:
    'https://operate.olas.network/_next/image?url=%2Fimages%2Fprediction-agent.png&w=3840&q=75',
  home_chain: MiddlewareChainMap.POLYGON,
  configurations: {
    [MiddlewareChainMap.POLYGON]: {
      staking_program_id: STAKING_PROGRAM_IDS.PearlBetaMechMarketplace1, // default, may be overwritten
      nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
      rpc: 'http://localhost:8545', // overwritten
      agent_id: 14,
      cost_of_bond: parseEther(50),
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: parseEther(30),
          safe: parseEther(40),
        },
        [POLYGON_TOKEN_CONFIG[TokenSymbolMap['pUSD']]?.address as string]: {
          agent: '0',
          safe: parseUnits(
            65,
            POLYGON_TOKEN_CONFIG[TokenSymbolMap['pUSD']]?.decimals,
          ),
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
    POLYGON_LEDGER_RPC: {
      name: 'Polygon ledger RPC',
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
      value: 'QmSf7SHsZYoSyYJqzesR8frVRqZy4Nx1JbNya6BPCQmTUL',
      provision_type: EnvProvisionType.FIXED,
    },
    ACC_INFO_FIELDS_REQUESTS: {
      name: 'Acc info fields requests',
      description: '',
      value: 'total_requests',
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
      value: X402_ENABLED_FLAGS[AgentMap.Polystrat].toString(),
      provision_type: EnvProvisionType.FIXED,
    },
    USE_OFFCHAIN: {
      name: 'Use offchain mech dispatch',
      description:
        'Route mech requests via the offchain HTTP path instead of the on-chain marketplace tx. Requires the priority mech to have an offchain endpoint registered.',
      value: 'true',
      provision_type: EnvProvisionType.FIXED,
    },
    OFFCHAIN_DEPOSIT_TARGET_CALLS: {
      name: 'Offchain deposit target calls',
      description:
        'Number of forward mech requests each auto-deposit to the BalanceTracker should cover. Deposit chunk = target_calls * delivery_rate, clamped by auto_deposit_cap_per_cycle.',
      value: '5',
      provision_type: EnvProvisionType.FIXED,
    },
    USE_MECH_ANALYTICS: {
      name: 'Use mech analytics',
      description:
        'Read per-request mech data from the mech-analytics service instead of the on-chain subgraph. Required for surfacing offchain mech requests in agent-performance summaries, which the on-chain subgraph does not index.',
      value: 'true',
      provision_type: EnvProvisionType.FIXED,
    },
    MECH_ANALYTICS_URL: {
      name: 'Mech analytics URL',
      description:
        'Base URL of the mech-analytics HTTP service. Required when USE_MECH_ANALYTICS is true.',
      value: 'https://mech-analytics-api.autonolas.tech',
      provision_type: EnvProvisionType.FIXED,
    },
  },
} as const;
