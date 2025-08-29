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
    owner: string,
    name: string,
    version: string,
  }
}

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

export type Deployment = {
  status: MiddlewareDeploymentStatus;
  nodes: DeployedNodes;
  healthcheck: {
    env_var_status?: {
      needs_update: boolean;
      env_vars: {
        [key: string]: string;
      };
    };
  };
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

export type MasterSafeBalanceRecord = {
  master_safe: { [tokenAddress: Address]: number | string };
};

export type AddressBalanceRecord = {
  [address: Address]: { [tokenAddress: Address]: number | string };
};

export type BalancesAndFundingRequirements = {
  balances: Partial<{
    [chain in MiddlewareChain]: AddressBalanceRecord;
  }>;
  /**
   * User fund requirements
   * @note this is the amount of funds required to be in the user's wallet.
   * If it not present or is 0, the balance is sufficient.
   */
  refill_requirements: Partial<{
    [chain in MiddlewareChain]: AddressBalanceRecord | MasterSafeBalanceRecord;
  }>;
  total_requirements: {
    [chain in MiddlewareChain]: AddressBalanceRecord | MasterSafeBalanceRecord;
  };
  bonded_olas: {
    [chain in MiddlewareChain]: number;
  };
  is_refill_required: boolean;
  allow_start_agent: boolean;
};
