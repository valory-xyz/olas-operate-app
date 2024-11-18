import { StakingProgramId } from '@/enums/StakingProgram';
import { Address } from '@/types/Address';

import {
  EnvProvisionType,
  MiddlewareChain,
  MiddlewareDeploymentStatus,
  MiddlewareLedger,
} from './enums';

export type ServiceHash = string;

export type ServiceKeys = {
  address: Address;
  private_key: string;
  ledger: MiddlewareChain;
};

export type LedgerConfig = {
  rpc: string;
  chain: MiddlewareChain;
};

export type ChainData = {
  instances?: Address[];
  token?: number;
  multisig?: Address;
  on_chain_state: number;
  staked: boolean;
  user_params: {
    agent_id: number;
    cost_of_bond: number;
    fund_requirements: {
      agent: number;
      safe: number;
    };
    nft: string;
    staking_program_id: StakingProgramId;
    threshold: number;
    use_mech_marketplace: true;
    use_staking: true;
  };
};

export type MiddlewareServiceResponse = {
  service_config_id: string; // TODO: update with uuid once middleware integrated
  name: string;
  hash: string;
  hash_history: {
    [block: string]: string;
  };
  home_chain: MiddlewareChain;
  keys: ServiceKeys[];
  service_path?: string;
  version: string;
  chain_configs: {
    [chain in MiddlewareChain]: {
      ledger_config: LedgerConfig;
      chain_data: ChainData;
    };
  };
};

export type EnvVariableAttributes = {
  name: string;
  description: string;
  value: string;
  provision_type: EnvProvisionType;
};

export type ServiceTemplate = {
  name: string;
  hash: string;
  description: string;
  image: string;
  service_version: string;
  home_chain: string;
  configurations: { [key: string]: ConfigurationTemplate };
  env_variables: { [key: string]: EnvVariableAttributes };
  deploy?: boolean;
};

export type ConfigurationTemplate = {
  staking_program_id?: StakingProgramId; // added on deployment
  nft: string;
  rpc?: string; // added on deployment
  agent_id: number;
  threshold: number;
  use_staking: boolean;
  use_mech_marketplace: boolean;
  cost_of_bond: number;
  monthly_gas_estimate: number;
  fund_requirements: FundRequirementsTemplate;
};

export type FundRequirementsTemplate = {
  agent: number;
  safe: number;
};

export type DeployedNodes = {
  agent: string[];
  tendermint: string[];
};

export type Deployment = {
  status: MiddlewareDeploymentStatus;
  nodes: DeployedNodes;
};

export type AppInfo = {
  account?: {
    key: Address;
  };
};

export type WalletResponse = {
  address: Address;
  safe_chains: MiddlewareChain[];
  ledger_type: MiddlewareLedger;
  safes: {
    [middlewareChainId in (typeof MiddlewareChain)[keyof typeof MiddlewareChain]]: Address;
  };
  safe_nonce: number;
};

export type Wallet = WalletResponse & {
  ethBalance?: number;
  olasBalance?: number;
  usdcBalance?: number;
};
