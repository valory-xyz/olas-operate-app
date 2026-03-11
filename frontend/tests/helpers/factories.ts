import {
  EvmChainId,
  EvmChainIdMap,
  MiddlewareChainMap,
  SupportedMiddlewareChain,
} from '../../constants/chains';
import { MiddlewareDeploymentStatusMap } from '../../constants/deployment';
import { StakingProgramId } from '../../constants/stakingProgram';
import {
  MasterEoa,
  MasterSafe,
  WALLET_OWNER,
  WALLET_TYPE,
} from '../../constants/wallet';
import { MultisigOwners } from '../../hooks/useMultisig';
import { Address } from '../../types/Address';
import { AgentConfig } from '../../types/Agent';
import { MiddlewareServiceResponse, Service } from '../../types/Service';

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

/** EIP-55 checksummed addresses — safe with `getAddress()` and `isAddress()` */
export const DEFAULT_EOA_ADDRESS: Address =
  '0x1234567890AbcdEF1234567890aBcdef12345678';
export const DEFAULT_SAFE_ADDRESS: Address =
  '0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD';
export const SECOND_SAFE_ADDRESS: Address =
  '0xC581D42746dfBf60E9F1beA5BeeF2ED4619CCfEE';
export const POLYGON_SAFE_ADDRESS: Address =
  '0x7a1B537D2F56bbAE9E57CA04bC0E2BfD2e176c2A';
export const BACKUP_SIGNER_ADDRESS: Address =
  '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa';
export const BACKUP_SIGNER_ADDRESS_2: Address =
  '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB';
export const AGENT_KEY_ADDRESS: Address =
  '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC';

export const GNOSIS_SAFE_ADDRESS: Address =
  '0xE97C17124cd1CD95300E2bE3e207C4B8162A535C';
export const MOCK_BACKUP_OWNER: Address =
  '0x2455556c4bd75975ccFa293B87476Fb0d6CB5524';

export const MOCK_INSTANCE_ADDRESS: Address =
  '0x1111111111111111111111111111111111111111';
export const MOCK_MULTISIG_ADDRESS: Address =
  '0x2222222222222222222222222222222222222222';

export const MOCK_TX_HASH_1: `0x${string}` =
  '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1';
export const MOCK_TX_HASH_2: `0x${string}` =
  '0xdef789abc012def789abc012def789abc012def789abc012def789abc012def7';
export const MOCK_TX_HASH_3: `0x${string}` =
  '0x111222333444555666777888999aaabbbcccdddeeefff000111222333444555666';

export const DEFAULT_MULTICALL_ADDRESS =
  '0xcA11bde05977b3631167028862bE2a173976CA11';

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
export const MOCK_SERVICE_CONFIG_ID_2 =
  'sc-aa001122-bb33-cc44-dd55-eeff66778890';
export const MOCK_SERVICE_CONFIG_ID_3 =
  'sc-11223344-5566-7788-99aa-bbccddeeff00';
export const MOCK_SERVICE_CONFIG_ID_4 =
  'sc-aabbccdd-eeff-0011-2233-445566778899';

export const SERVICE_PUBLIC_ID_MAP = {
  TRADER: 'valory/trader_pearl:0.1.0',
  OPTIMUS: 'valory/optimus:0.1.0',
  PETT_AI: 'pettaidev/pett_agent:0.1.0',
  MEMOOORR: 'dvilela/memeooorr:0.1.0',
};

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

/** Builds a chain_configs entry for a single chain. */
export const makeChainConfig = (
  chain: SupportedMiddlewareChain,
  overrides: {
    instances?: Address[] | undefined;
    multisig?: Address | undefined;
    token?: number;
    on_chain_state?: number;
    staked?: boolean;
    staking_program_id?: StakingProgramId;
  } = {},
) => ({
  [chain]: {
    ledger_config: { rpc: 'http://localhost', chain },
    chain_data: {
      instances:
        'instances' in overrides
          ? overrides.instances
          : [MOCK_INSTANCE_ADDRESS],
      multisig:
        'multisig' in overrides ? overrides.multisig : MOCK_MULTISIG_ADDRESS,
      token: overrides.token ?? 42,
      on_chain_state: overrides.on_chain_state ?? 3,
      staked: overrides.staked ?? true,
      user_params: {
        agent_id: 14,
        cost_of_bond: '10000000000000000',
        fund_requirements: {},
        nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
        staking_program_id:
          overrides.staking_program_id ??
          ('pearl_beta_mech_marketplace_3' as StakingProgramId),
        threshold: 1,
        use_mech_marketplace: true,
        use_staking: true,
      },
    },
  },
});

/** Builds a MiddlewareServiceResponse for a given chain. */
export const makeMiddlewareService = (
  chain: SupportedMiddlewareChain = MiddlewareChainMap.GNOSIS,
  overrides: Partial<MiddlewareServiceResponse> = {},
): MiddlewareServiceResponse => ({
  service_public_id: SERVICE_PUBLIC_ID_MAP.TRADER,
  service_config_id: DEFAULT_SERVICE_CONFIG_ID,
  version: 1,
  name: 'Trader Agent',
  description: 'Trader agent for omen prediction markets',
  hash: 'bafybeib5hmzpf7cmxyfevq65tk22fjvlothjskw7nacgh4ervgs5mos7ra',
  hash_history: {},
  agent_release: {
    is_aea: true,
    repository: { owner: 'valory-xyz', name: 'trader', version: 'v0.31.7-rc2' },
  },
  home_chain: chain,
  keys: [],
  chain_configs: makeChainConfig(chain),
  env_variables: {},
  ...overrides,
});

/**
 * Builds a MiddlewareServiceResponse from an AgentConfig.
 * Callers pass `AGENT_CONFIG[AgentMap.X]` — factories.ts avoids importing
 * config/agents directly (it triggers parseEther via service templates).
 */
export const makeAgentService = (
  agentConfig: Pick<
    AgentConfig,
    'servicePublicId' | 'middlewareHomeChainId' | 'name' | 'description'
  >,
  overrides: Partial<MiddlewareServiceResponse> = {},
): MiddlewareServiceResponse =>
  makeMiddlewareService(agentConfig.middlewareHomeChainId, {
    service_public_id: agentConfig.servicePublicId,
    name: agentConfig.name,
    description: agentConfig.description,
    ...overrides,
  });
