import {
  AgentType,
  MiddlewareChain,
  MiddlewareDeploymentStatus,
  StakingProgramId,
  SupportedMiddlewareChain,
} from '@/constants';
import { EnvProvision } from '@/constants/envVariables';

import { Address } from './Address';

export type ServiceConfigId = string;

export type Service = MiddlewareServiceResponse & {
  deploymentStatus?: MiddlewareDeploymentStatus;
};

export type ServiceValidationResponse = {
  [service_config_id: string]: boolean;
};

type AgentRelease = {
  is_aea: boolean;
  repository: {
    owner: string;
    name: string;
    version: string;
  };
};

type EnvVariable = {
  name: string;
  description: string;
  value: string;
  provision_type: EnvProvision;
};

type ServiceKey = {
  address: Address;
  private_key: string;
  ledger: MiddlewareChain;
};

type LedgerConfig = {
  rpc: string;
  chain: MiddlewareChain;
};

type FundRequirements = {
  // zero address means native currency
  [tokenAddress: Address]: {
    agent: string;
    safe: string;
  };
};

type ChainData = {
  instances?: Address[];
  token?: number;
  multisig?: Address;
  on_chain_state: number;
  staked: boolean;
  user_params: {
    agent_id: number;
    cost_of_bond: string;
    fund_requirements: FundRequirements;
    nft: string;
    staking_program_id: StakingProgramId;
    threshold: number;
    use_mech_marketplace: boolean;
    use_staking: boolean;
  };
};

export type ConfigurationTemplate = {
  staking_program_id?: StakingProgramId; // added on deployment
  nft: string;
  rpc?: string; // added on deployment
  agent_id: number;
  /**
   * Used as a fallback default if middleware doesn't get it from the staking contract.
   * Also, we can add half of the default staking contract.
   *
   * For example: Service staking deposit (OLAS) of Polymarket Beta 1 is 100,
   * so cost_of_bond here is 50.
   */
  cost_of_bond: string;
  fund_requirements: FundRequirements; // provided by agent teams, used by BE to send initial funds
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
  env_variables: { [key: string]: EnvVariable };
  deploy?: boolean;
  allow_different_service_public_id?: boolean;
};

export type MiddlewareServiceResponse = {
  /**
   * Addresses agent's uniqueness, eg: optimus, trader, etc.
   * It is unique per chain, but can have the same value if the same agent
   * (with different config) is used across different chains. For eg: Optimus and Modius
   * have the same service_public_id.
   * In order to define an agent uniqueness, we should check for the combination of
   * service_public_id and home_chain. As no two agents would have the same values for these fields.
   */
  service_public_id: string;
  /**
   * Addresses config's uniqueness.
   * The same agent can have different configs, and so this field will have different values.
   * eg: Optimus and Modius are the same agents (as per the logic/code), but their configs would
   * be different, hence they will have difference values of service_config_id
   */
  service_config_id: string;
  version: number;
  name: string;
  description: string;
  hash: string;
  hash_history: {
    [block: string]: string;
  };
  agent_release: AgentRelease;
  home_chain: SupportedMiddlewareChain;
  keys: ServiceKey[];
  service_path?: string;
  chain_configs: {
    [middlewareChain: string]: {
      ledger_config: LedgerConfig;
      chain_data: ChainData;
    };
  };
  env_variables: { [key: string]: EnvVariable };
};
