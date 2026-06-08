import { ethers } from 'ethers';

import { BASE_TOKEN_CONFIG, TokenSymbolMap } from '@/config/tokens';
import { AgentMap, EnvProvisionMap as EnvProvisionType } from '@/constants';
import { ServiceTemplate } from '@/types';
import { parseEther, parseUnits } from '@/utils';

import { MiddlewareChainMap } from '../../chains';
import { STAKING_PROGRAM_IDS } from '../../stakingProgram';
import { X402_ENABLED_FLAGS } from '../../x402';
import { KPI_DESC_PREFIX } from '../constants';
import { BABYDEGEN_COMMON_TEMPLATE } from './babydegen';

export const BASIUS_SERVICE_TEMPLATE: ServiceTemplate = {
  agentType: AgentMap.Basius,
  name: 'Basius',
  description: `${KPI_DESC_PREFIX} Basius service deployment on Base network`,
  image:
    'https://gateway.autonolas.tech/ipfs/bafybeiaakdeconw7j5z76fgghfdjmsr6tzejotxcwnvmp3nroaw3glgyve',
  home_chain: MiddlewareChainMap.BASE,
  configurations: {
    [MiddlewareChainMap.BASE]: {
      staking_program_id: STAKING_PROGRAM_IDS.BasiusAlpha1, // default, may be overwritten
      // TODO(basius): replace with real NFT IPFS hash before launch
      nft: 'bafybeibasiusnftplaceholdertobereplacedbeforelaunchxxxxxxxx',
      rpc: '', // overwritten
      // TODO(basius): replace with real on-chain agent ID (Olas Registry mint on Base) before launch
      agent_id: 0,
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
  // TODO(basius): confirm with agent team whether SELECTED_STRATEGIES and
  // ALLOWED_CHAINS env vars are needed on Base. Currently mirrors Optimus
  // (which omits them); Modius requires both. If Base needs them, add as
  // FIXED env vars matching Modius's pattern.
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
  ...BABYDEGEN_COMMON_TEMPLATE,
} as const;
