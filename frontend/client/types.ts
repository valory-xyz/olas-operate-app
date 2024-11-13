import { StakingProgramId } from '@/enums/StakingProgram';
import { Address } from '@/types/Address';

import {
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
  type: MiddlewareLedger;
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
  description: string;
  hash: string;
  hash_history: {
    [block: string]: string;
  };
  home_chain_id: number;
  keys: ServiceKeys[];
  name: string;
  service_path?: string;
  service_config_id: string;
  version: string;
  chain_configs: {
    [chainId: number]: {
      ledger_config: LedgerConfig;
      chain_data: ChainData;
    };
  };
};

export type ServiceTemplate = {
  name: string;
  hash: string;
  description: string;
  image: string;
  service_version: string;
  home_chain_id: string;
  configurations: { [key: string]: ConfigurationTemplate };
  deploy?: boolean;
  service_env_variables?: {
    [key: string]: {
      name: string;
      env_variable_name: string;
      description: string;
      value: string;
      provision_type: string;
    };
  };
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
