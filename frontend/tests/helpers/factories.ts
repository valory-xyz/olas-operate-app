import { ACHIEVEMENT_TYPE } from '../../constants/achievement';
import { StakingProgramConfig } from '../../config/stakingPrograms';
import { AgentMap } from '../../constants/agent';
import {
  EvmChainId,
  EvmChainIdMap,
  MiddlewareChainMap,
  SupportedMiddlewareChain,
} from '../../constants/chains';
import { MiddlewareDeploymentStatusMap } from '../../constants/deployment';
import {
  STAKING_PROGRAM_IDS,
  StakingProgramId,
} from '../../constants/stakingProgram';
import {
  MasterEoa,
  MasterSafe,
  WALLET_OWNER,
  WALLET_TYPE,
} from '../../constants/wallet';
import { MultisigOwners } from '../../hooks/useMultisig';
import { AchievementWithConfig } from '../../types/Achievement';
import { Address } from '../../types/Address';
import { AgentConfig } from '../../types/Agent';
import {
  ServiceStakingDetails,
  StakingContractDetails,
  StakingRewardsInfo,
  StakingState,
} from '../../types/Autonolas';
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
export const DEFAULT_STAKING_CONTRACT_ADDRESS: Address =
  '0x3333333333333333333333333333333333333333';
export const SECOND_STAKING_CONTRACT_ADDRESS: Address =
  '0x4444444444444444444444444444444444444444';

export const DEFAULT_SERVICE_NFT_TOKEN_ID = 42;
export const DEFAULT_STAKING_PROGRAM_ID: StakingProgramId =
  STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3;
export const SECOND_STAKING_PROGRAM_ID: StakingProgramId =
  STAKING_PROGRAM_IDS.PearlBeta6;
export const DEFAULT_TS_CHECKPOINT = 1_710_000_000;
export const DEFAULT_LIVENESS_PERIOD_S = 86_400;

export const MOCK_TX_HASH_1: `0x${string}` =
  '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1';
export const MOCK_TX_HASH_2: `0x${string}` =
  '0xdef789abc012def789abc012def789abc012def789abc012def789abc012def7';
export const MOCK_TX_HASH_3: `0x${string}` =
  '0x111222333444555666777888999aaabbbcccdddeeefff000111222333444555666';

export const DEFAULT_MULTICALL_ADDRESS =
  '0xcA11bde05977b3631167028862bE2a173976CA11';

export const TRADER_SERVICE_HASH =
  'bafybeib5hmzpf7cmxyfevq65tk22fjvlothjskw7nacgh4ervgs5mos7ra';
export const MODIUS_SERVICE_HASH =
  'bafybeicrpqmggwurhkxiakuxzuxhdzm2x5zqyfvwcned56eikomkufma4i';

export const TRADER_SERVICE_NAME = 'Trader Agent';
export const MODIUS_SERVICE_NAME = 'Optimus';

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
      token: overrides.token ?? DEFAULT_SERVICE_NFT_TOKEN_ID,
      on_chain_state: overrides.on_chain_state ?? 3,
      staked: overrides.staked ?? true,
      user_params: {
        agent_id: 14,
        cost_of_bond: '10000000000000000',
        fund_requirements: {},
        nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
        staking_program_id:
          overrides.staking_program_id ?? DEFAULT_STAKING_PROGRAM_ID,
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

/** Creates a StakingProgramConfig for tests (defaults based on PearlBetaMechMarketplace3). */
export const makeStakingProgramConfig = (
  overrides: Partial<StakingProgramConfig> = {},
): StakingProgramConfig =>
  ({
    chainId: EvmChainIdMap.Gnosis,
    name: 'Pearl Beta Mech Marketplace III',
    address: DEFAULT_STAKING_CONTRACT_ADDRESS,
    deprecated: false,
    agentsSupported: [AgentMap.PredictTrader],
    stakingRequirements: { OLAS: 40 },
    id: '0x0000000000000000000000003333333333333333333333333333333333333333',
    ...overrides,
  }) as StakingProgramConfig;

export const makeStakingContractDetails = (
  overrides: Partial<StakingContractDetails> = {},
): StakingContractDetails => ({
  availableRewards: 10,
  maxNumServices: 5,
  serviceIds: [DEFAULT_SERVICE_NFT_TOKEN_ID],
  minimumStakingDuration: DEFAULT_LIVENESS_PERIOD_S,
  minStakingDeposit: 100,
  apy: 12.5,
  olasStakeRequired: 100,
  rewardsPerWorkPeriod: 1,
  epochCounter: 7,
  livenessPeriod: DEFAULT_LIVENESS_PERIOD_S,
  ...overrides,
});

export const makeServiceStakingDetails = (
  overrides: Partial<ServiceStakingDetails> = {},
): ServiceStakingDetails => ({
  serviceStakingStartTime: DEFAULT_TS_CHECKPOINT,
  serviceStakingState: StakingState.Staked,
  ...overrides,
});

/**
 * Lightweight BigNumber-like mock for agent service tests.
 * Mimics ethers.BigNumber arithmetic without pulling in the real library.
 */
type MockBN = {
  toNumber: () => number;
  mul: (other: MockBN | number) => MockBN;
  div: (other: MockBN | number) => MockBN;
  add: (other: MockBN | number) => MockBN;
  gt: (other: number) => boolean;
  toString: () => string;
};

const unwrap = (v: MockBN | number): number =>
  typeof v === 'number' ? v : v.toNumber();

export const makeBN = (val: number): MockBN => ({
  toNumber: () => val,
  mul: (other) => makeBN(val * unwrap(other)),
  div: (other) => makeBN(Math.floor(val / unwrap(other))),
  add: (other) => makeBN(val + unwrap(other)),
  gt: (other) => val > other,
  toString: () => `${val}`,
});

type RawBigNumber = {
  _isBigNumber: boolean;
  _hex: string;
};

const toHexBigNumber = (value: number | bigint): RawBigNumber => ({
  _isBigNumber: true,
  _hex: `0x${BigInt(value).toString(16)}`,
});

type RawStakingRewardsInfo = {
  serviceInfo: unknown[];
  livenessPeriod: RawBigNumber;
  livenessRatio: RawBigNumber;
  rewardsPerSecond: RawBigNumber;
  isEligibleForRewards: boolean;
  availableRewardsForEpoch: number;
  accruedServiceStakingRewards: number;
  minimumStakedAmount: number;
  tsCheckpoint: RawBigNumber;
};

export const makeRawStakingRewardsInfo = (
  overrides: Partial<RawStakingRewardsInfo> = {},
): RawStakingRewardsInfo => ({
  serviceInfo: [],
  livenessPeriod: toHexBigNumber(DEFAULT_LIVENESS_PERIOD_S),
  livenessRatio: toHexBigNumber(1),
  rewardsPerSecond: toHexBigNumber(1),
  isEligibleForRewards: true,
  availableRewardsForEpoch: 1,
  accruedServiceStakingRewards: 0.5,
  minimumStakedAmount: 50,
  tsCheckpoint: toHexBigNumber(DEFAULT_TS_CHECKPOINT),
  ...overrides,
});

export const makeStakingRewardsInfo = (
  overrides: Partial<StakingRewardsInfo> = {},
): StakingRewardsInfo => ({
  serviceInfo: [],
  livenessPeriod: toHexBigNumber(DEFAULT_LIVENESS_PERIOD_S),
  livenessRatio: toHexBigNumber(1),
  rewardsPerSecond: toHexBigNumber(1),
  isEligibleForRewards: true,
  availableRewardsForEpoch: 1,
  accruedServiceStakingRewards: 0.5,
  minimumStakedAmount: 50,
  tsCheckpoint: DEFAULT_TS_CHECKPOINT,
  ...overrides,
});

// Local type — not exported from source (GraphQL response shape)
type RewardsHistoryEntry = {
  id: string;
  epoch: string;
  contractAddress: string;
  rewardAmount: string;
  checkpointedAt: string | null;
  blockTimestamp: string;
  blockNumber: string;
  transactionHash: string;
  checkpoint: {
    epochLength: string;
    availableRewards: string;
  } | null;
};

export const makeRewardsHistoryEntry = (
  overrides: Partial<RewardsHistoryEntry> = {},
): RewardsHistoryEntry => ({
  id: 'checkpoint-1',
  epoch: '1',
  contractAddress: DEFAULT_STAKING_CONTRACT_ADDRESS,
  rewardAmount: '1000000000000000000',
  checkpointedAt: `${DEFAULT_TS_CHECKPOINT}`,
  blockTimestamp: `${DEFAULT_TS_CHECKPOINT + DEFAULT_LIVENESS_PERIOD_S}`,
  blockNumber: '100',
  transactionHash: MOCK_TX_HASH_1,
  checkpoint: {
    epochLength: `${DEFAULT_LIVENESS_PERIOD_S}`,
    availableRewards: '1000000000000000000',
  },
  ...overrides,
});

export const makeRewardsHistoryServiceResponse = ({
  latestStakingContract = DEFAULT_STAKING_CONTRACT_ADDRESS,
  rewardsHistory = [makeRewardsHistoryEntry()],
  serviceId = `${DEFAULT_SERVICE_NFT_TOKEN_ID}`,
}: {
  latestStakingContract?: string | null;
  rewardsHistory?: RewardsHistoryEntry[];
  serviceId?: string;
} = {}) => ({
  service: {
    id: serviceId,
    latestStakingContract,
    rewardsHistory,
  },
});

// --- Achievement factories ---

/** Bet ID: transaction hash + position suffix (Polymarket format) */
export const MOCK_BET_ID = `${MOCK_TX_HASH_1}f7080000` as `0x${string}`;

export const MOCK_MARKET_ID = '0x5Cd1f40b82F3e3b1DD1BCaF916245AbcDEF12345';

export const MOCK_ACHIEVEMENT_ID = 'ach-polystrat-payout-001';

/**
 * Realistic polystrat payout achievement based on a real Polymarket
 * USDC.e bet settlement (2.50 wagered → 5.32 payout ≈ 2.13× multiplier).
 * Achievements are shown when the multiplier exceeds 1.5×.
 */
export const makePolystratPayoutAchievement = (
  overrides: Partial<AchievementWithConfig> = {},
): AchievementWithConfig => ({
  achievement_id: MOCK_ACHIEVEMENT_ID,
  achievement_type: ACHIEVEMENT_TYPE.POLYSTRAT_PAYOUT,
  acknowledgement_timestamp: 0,
  acknowledged: false,
  title: '2.13× Payout',
  description: 'Your prediction paid off with a 2.13× return',
  timestamp: 1741336277,
  data: {
    id: MOCK_BET_ID,
    prediction_side: 'Yes',
    bet_amount: 2.5,
    status: 'settled',
    net_profit: 2.82,
    total_payout: 5.32,
    created_at: '2026-03-05T14:00:00Z',
    settled_at: '2026-03-07T09:31:17Z',
    transaction_hash: MOCK_TX_HASH_1,
    market: {
      id: MOCK_MARKET_ID,
      title: 'Will ETH hit $5,000 by March 2026?',
      external_url: `https://polymarket.com/event/${MOCK_MARKET_ID}`,
    },
  },
  serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
  ...overrides,
});
