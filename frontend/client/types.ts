import { EnvProvision } from '@/constants/envVariables';
import { AgentType } from '@/enums/Agent';
import { StakingProgramId } from '@/enums/StakingProgram';
import { Address } from '@/types/Address';

import {
  MiddlewareChain,
  MiddlewareDeploymentStatus,
  SupportedMiddlewareChain,
} from './enums';

export type ServiceHash = string;
export type ServiceConfigId = string;

type AgentRelease = {
  is_aea: boolean;
  repository: {
    owner: string;
    name: string;
    version: string;
  };
};

type ServiceKeys = {
  address: Address;
  private_key: string;
  ledger: MiddlewareChain;
};

type LedgerConfig = {
  rpc: string;
  chain: MiddlewareChain;
};

type ChainData = {
  instances?: Address[];
  token?: number;
  multisig?: Address;
  on_chain_state: number;
  staked: boolean;
  user_params: {
    agent_id: number;
    cost_of_bond: number;
    fund_requirements: {
      [tokenAddress: string]: {
        agent: number;
        safe: number;
      };
    };
    nft: string;
    staking_program_id: StakingProgramId;
    threshold: number;
    use_mech_marketplace: boolean;
    use_staking: boolean;
  };
};

type EnvVariableAttributes = {
  name: string;
  description: string;
  value: string;
  provision_type: EnvProvision;
};

export type MiddlewareServiceResponse = {
  /**
   * Addresses agent's uniqueness, eg: optimus, trader, etc.
   * It is unique per chain, but can have the same value if the same agent
   * (with different config) is used across different chains. For eg: Optimus and Modius
   * have the same service_public_id.
   * In order to define an agent uniqueneess, we should check for the combination of
   * service_public_id and home_chain. As no two agents would have the same values for these fields.
   */
  service_public_id: string;
  /**
   * Addresses config's uniqueness.
   * The same agent can have different configs, and so this field will have different values.
   * eg: Optimus and Modius are the same agents (as per the logic/code), but their configs would
   * be different, hence they will have difference values of service_config_id
   */
  service_config_id: string; // TODO: update with uuid once middleware integrated
  version: number;
  name: string;
  description: string;
  hash: string;
  hash_history: {
    [block: string]: string;
  };
  agent_release: AgentRelease;
  home_chain: SupportedMiddlewareChain;
  keys: ServiceKeys[];
  service_path?: string;
  chain_configs: {
    [middlewareChain: string]: {
      ledger_config: LedgerConfig;
      chain_data: ChainData;
    };
  };
  env_variables: { [key: string]: EnvVariableAttributes };
};

export type ServiceValidationResponse = {
  [service_config_id: string]: boolean;
};

type ConfigurationTemplate = {
  staking_program_id?: StakingProgramId; // added on deployment
  nft: string;
  rpc?: string; // added on deployment
  agent_id: number;
  cost_of_bond: number;
  monthly_gas_estimate: number;
  fund_requirements: {
    // zero address means native currency
    [tokenAddress: Address]: {
      agent: number;
      safe: number;
    };
  };
};

export type ServiceTemplate = {
  agentType: AgentType;
  name: string; // Should be unique across all services
  hash: string;
  description: string;
  image: string;
  /**
   * Used by the agent runner.
   * Agent runner is the binary responsible for downloading each agent's dependencies.
   */
  service_version: string;
  agent_release: AgentRelease;
  home_chain: SupportedMiddlewareChain;
  configurations: Partial<
    Record<SupportedMiddlewareChain, ConfigurationTemplate>
  >;
  env_variables: { [key: string]: EnvVariableAttributes };
  deploy?: boolean;
};

type DeployedNodes = {
  agent: string[];
  tendermint: string[];
};

type AgentHealthCheckResponse = {
  agent_health: Record<string, unknown>;
  is_healthy: boolean;
  is_tm_healthy: boolean;
  is_transitioning_fast: boolean;
  period: number;
  reset_pause_duration: number;
  rounds: string[];
  rounds_info?: Record<
    string,
    {
      name: string;
      description: string;
      transitions: Record<string, string>;
    }
  >;
  seconds_since_last_transition: number;
};

export type Deployment = {
  status: MiddlewareDeploymentStatus;
  nodes: DeployedNodes;
  healthcheck: AgentHealthCheckResponse;
};

enum MiddlewareLedger {
  ETHEREUM = 0,
  SOLANA = 1,
}

export type MiddlewareWalletResponse = {
  address: Address;
  safe_chains: MiddlewareChain[];
  ledger_type: MiddlewareLedger;
  safes: {
    [middlewareChainId in (typeof MiddlewareChain)[keyof typeof MiddlewareChain]]: Address;
  };
  safe_nonce: number;
};

export type TokenBalanceRecord = {
  [tokenAddress: Address]: number | string;
};

export type MasterSafeBalanceRecord = {
  master_safe: TokenBalanceRecord;
};

export type ServiceSafeBalanceRecord = {
  service_safe: TokenBalanceRecord;
};

export type AddressBalanceRecord = {
  [address: Address]: TokenBalanceRecord;
};

export type BalancesAndFundingRequirements = {
  balances: Partial<{
    [chain in MiddlewareChain]: AddressBalanceRecord;
  }>;
  /**
   * User fund requirements
   * @note this is the amount of funds required during onboarding an agent.
   */
  refill_requirements: Partial<{
    [chain in MiddlewareChain]: AddressBalanceRecord | MasterSafeBalanceRecord;
  }>;
  total_requirements: {
    [chain in MiddlewareChain]: AddressBalanceRecord | MasterSafeBalanceRecord;
  };
  /**
   * Agent funding requirements
   * @note this deals with agent's requirements post onboarding.
   */
  agent_funding_requests: Partial<{
    [chain in MiddlewareChain]: AddressBalanceRecord | ServiceSafeBalanceRecord;
  }>;
  protocol_asset_requirements: Partial<{
    [chain in MiddlewareChain]: TokenBalanceRecord;
  }>;
  bonded_assets: Partial<{
    [chain in MiddlewareChain]: TokenBalanceRecord;
  }>;
  is_refill_required: boolean;
  /**
   * Whether a funding transaction is currently in progress.
   * @note When `true`, `agent_funding_requests` may be temporarily stale until the agent syncs updated balances.
   */
  agent_funding_in_progress: boolean;
  /**
   * Whether the system is in a cooldown window after a funding action.
   * @note When `true`, new funding requests are suppressed and `agent_funding_requests` will be empty until the cooldown ends.
   */
  agent_funding_requests_cooldown: boolean;
  allow_start_agent: boolean;
};

type AgentPerformanceMetric = {
  name: string;
  is_primary: boolean;
  value: string;
  description?: string;
};

export type AgentPerformance = {
  timestamp: number | null;
  metrics: AgentPerformanceMetric[];
  last_activity: null;
  agent_behavior: string | null;
};
