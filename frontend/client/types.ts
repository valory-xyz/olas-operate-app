import { StakingProgramId } from '@/enums/StakingProgram';
import { Address } from '@/types/Address';

import { DeploymentStatus, Ledger, MiddlewareChain } from './enums';

export type ServiceHash = string;

export type LedgerConfig = {
  rpc: string;
  type: Ledger;
  chain: MiddlewareChain;
};

export type ServiceKeys = {
  address: Address;
  private_key: string;
  ledger: MiddlewareChain;
};

export type ChainData = {
  instances?: Address[];
  token?: number;
  multisig?: Address;
  on_chain_state: number;
  staked: boolean;
  user_params: {
    cost_of_bond: number;
    fund_requirements: {
      agent: number;
      safe: number;
    };
    nft: string;
    staking_program_id: StakingProgramId;
    threshold: number;
    use_staking: true;
  };
};

export type Service = {
  name: string;
  hash: string;
  keys: ServiceKeys[];
  readme?: string;
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
  image: string;
  description: string;
  service_version: string;
  home_chain_id: string;
  configurations: { [key: string]: ConfigurationTemplate };
  deploy?: boolean;
};

export type ConfigurationTemplate = {
  rpc?: string; // added on deployment
  staking_program_id?: StakingProgramId; // added on deployment
  nft: string;
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
  status: DeploymentStatus;
  nodes: DeployedNodes;
};

export type EmptyPayload = Record<string, never>;

export type EmptyResponse = Record<string, never>;

export type HttpResponse = {
  error?: string;
  data?: string;
};

export type ClientResponse<ResponseType> = {
  error?: string;
  data?: ResponseType;
};

export type StopDeployment = {
  delete: boolean /* Delete deployment*/;
};

export type UpdateServicePayload = {
  old: ServiceHash;
  new: ServiceTemplate;
};

export type DeleteServicesPayload = {
  hashes: ServiceHash[];
};

export type DeleteServicesResponse = {
  hashes: ServiceHash[];
};

export type AppInfo = {
  account?: {
    key: Address;
  };
};

export type WalletResponse = {
  address: Address;
  safe_chains: MiddlewareChain[];
  ledger_type: Ledger;
  safes: {
    [middlewareChainId in (typeof MiddlewareChain)[keyof typeof MiddlewareChain]]: Address;
  };
  safe_nonce: number;
};

export type Wallet = WalletResponse & {
  ethBalance?: number;
  olasBalance?: number;
};
