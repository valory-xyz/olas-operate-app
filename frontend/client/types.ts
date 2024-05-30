import { Address } from '@/types';

import { Chain, DeploymentStatus, Ledger } from './enums';

export type ServiceHash = string;

export type LedgerConfig = {
  rpc: string;
  type: Ledger;
  chain: Chain;
};

export type ServiceKeys = {
  address: Address;
  private_key: string;
  ledger: Chain;
};

export type ChainData = {
  instances?: Address[];
  token?: number;
  multisig?: Address;
};

export type Service = {
  name: string;
  hash: string;
  keys: ServiceKeys[];
  readme?: string;
  ledger: LedgerConfig;
  chain_data: ChainData;
};

export type ServiceTemplate = {
  name: string;
  hash: string;
  image: string;
  description: string;
  configuration: ConfigurationTemplate;
  deploy?: boolean;
};

export type ConfigurationTemplate = {
  nft: string;
  rpc?: string; // added by user
  agent_id: number;
  threshold: number;
  use_staking: boolean;
  cost_of_bond: number;
  olas_cost_of_bond: number;
  olas_required_to_stake: number;
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
  safe_chains: Chain[];
  ledger_type: Ledger;
  safe: Address;
  safe_nonce: number;
};

export type Wallet = WalletResponse & {
  ethBalance?: number;
  olasBalance?: number;
};
