import {
  EvmChainId,
  EvmChainIdMap,
  MiddlewareChainMap,
} from '../../constants/chains';
import { MiddlewareDeploymentStatusMap } from '../../constants/deployment';
import {
  MasterEoa,
  MasterSafe,
  WALLET_OWNER,
  WALLET_TYPE,
} from '../../constants/wallet';
import { MultisigOwners } from '../../hooks/useMultisig';
import { Address } from '../../types/Address';
import { Service } from '../../types/Service';

export const INVALID_CHAIN_ID = 999 as EvmChainId;

export const UNKNOWN_TOKEN_ADDRESS: Address =
  '0x0000000000000000000000000000000000000001';

export const ALL_EVM_CHAIN_IDS: EvmChainId[] = [
  EvmChainIdMap.Gnosis,
  EvmChainIdMap.Base,
  EvmChainIdMap.Mode,
  EvmChainIdMap.Optimism,
  EvmChainIdMap.Polygon,
];

export const DEFAULT_EOA_ADDRESS: Address =
  '0x1234567890AbcdEF1234567890aBCDef12345678';
export const DEFAULT_SAFE_ADDRESS: Address =
  '0xAbCDefAbCDefAbCDefAbCDefAbCDefAbCDefAbCd';
export const BACKUP_SIGNER_ADDRESS: Address =
  '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa';
export const BACKUP_SIGNER_ADDRESS_2: Address =
  '0xBBbbBBbbBBbbBBbbBBbbBBbbBBbbBBbbBBbbBBbb';
export const AGENT_KEY_ADDRESS: Address =
  '0xCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCc';

export const makeMasterEoa = (
  address: Address = DEFAULT_EOA_ADDRESS,
): MasterEoa => ({
  address,
  type: WALLET_TYPE.EOA,
  owner: WALLET_OWNER.Master,
});

export const makeMasterSafe = (
  evmChainId: EvmChainId,
  address: Address = DEFAULT_SAFE_ADDRESS,
): MasterSafe => ({
  address,
  evmChainId,
  type: WALLET_TYPE.Safe,
  owner: WALLET_OWNER.Master,
});

export const makeMultisigOwners = (
  evmChainId: EvmChainId,
  owners: Address[],
  safeAddress: Address = DEFAULT_SAFE_ADDRESS,
): MultisigOwners => ({
  safeAddress,
  evmChainId,
  owners,
});

export const DEFAULT_SERVICE_CONFIG_ID =
  'sc-aa001122-bb33-cc44-dd55-eeff66778899';

export const makeService = (overrides: Partial<Service> = {}): Service => ({
  service_public_id: 'valory/trader:0.1.0',
  service_config_id: DEFAULT_SERVICE_CONFIG_ID,
  version: 1,
  name: 'Trader Agent',
  description: 'Trader agent for omen prediction markets',
  hash: 'bafybeib5hmzpf7cmxyfevq65tk22fjvlothjskw7nacgh4ervgs5mos7ra',
  hash_history: {},
  agent_release: {
    is_aea: true,
    repository: {
      owner: 'valory-xyz',
      name: 'trader',
      version: 'v0.31.7-rc2',
    },
  },
  home_chain: MiddlewareChainMap.GNOSIS,
  keys: [
    {
      address: AGENT_KEY_ADDRESS,
      private_key: 'key',
      ledger: MiddlewareChainMap.ETHEREUM,
    },
  ],
  chain_configs: {},
  env_variables: {},
  deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
  ...overrides,
});
