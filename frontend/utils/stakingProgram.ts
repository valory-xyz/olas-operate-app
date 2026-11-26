import type {
  StakingProgramConfig,
  StakingProgramMap,
} from '@/config/stakingPrograms';
import type { AgentType, StakingProgramId } from '@/constants';
import { NO_STAKING_PROGRAM_ID } from '@/constants/stakingProgram';
import { Address, Nullable } from '@/types';

/**
 * Given an address, returns a normalized staking program ID by lowercasing the address
 *
 * @example 0xAbC123... -> 0x000000000000000000000000abc123...
 */
export const deriveStakingProgramId = (address: Address): string => {
  const normalized = address.toLowerCase().replace(/^0x/, '');
  return `0x${normalized.padStart(64, '0')}`;
};

/**
 * Whether a service runs without staking (Connect). Such agents have no
 * staking contract or epoch, so staking reads and the staking KPI do not apply.
 */
export const isNoStakingProgram = (
  stakingProgramId: Nullable<StakingProgramId> | undefined,
) => stakingProgramId === NO_STAKING_PROGRAM_ID;

/** Whether any program on the chain only accepts PolySafe-deployed services. */
export const chainHasPolySafePrograms = (programs: StakingProgramMap) =>
  Object.values(programs).some((program) => program.requiresPolySafe);

/**
 * Whether the service multisig type matches what the staking contract accepts.
 * Contracts pin `service.multisig.codehash`, so a PolySafe service can only
 * stake on `requiresPolySafe` programs and a standard Safe service only on the
 * others.
 */
export const isStakingProgramCompatibleWithMultisig = (
  program: Pick<StakingProgramConfig, 'requiresPolySafe'>,
  isPolySafeService: boolean,
) => !!program.requiresPolySafe === isPolySafeService;

type GetCompatibleStakingProgramIdsParams = {
  /** Staking programs of the agent's home chain. */
  programs: StakingProgramMap;
  agentType: AgentType;
  /** Whether the selected service was deployed with a PolySafe multisig. */
  isPolySafeService: boolean;
  /** Program the service is currently staked in (or has stored), if any. */
  currentStakingProgramId: Nullable<StakingProgramId>;
};

/**
 * Ordered list of staking programs the user may select:
 * 1. The current program first — even if deprecated, retired or incompatible, the user
 *    must be able to see the contract they are actually staked in.
 * 2. Deprecated and retired programs are hidden.
 * 3. Programs not supporting the agent type are hidden.
 * 4. Programs whose multisig requirement doesn't match the service are hidden
 *    (the contract would reject the stake transaction anyway).
 */
export const getCompatibleStakingProgramIds = ({
  programs,
  agentType,
  isPolySafeService,
  currentStakingProgramId,
}: GetCompatibleStakingProgramIdsParams): StakingProgramId[] =>
  Object.entries(programs).reduce<StakingProgramId[]>((acc, [id, program]) => {
    const stakingProgramId = id as StakingProgramId;

    if (stakingProgramId === currentStakingProgramId) {
      return [stakingProgramId, ...acc];
    }
    if (program.deprecated || program.retired) return acc;
    if (!program.agentsSupported.includes(agentType)) return acc;
    if (!isStakingProgramCompatibleWithMultisig(program, isPolySafeService)) {
      return acc;
    }

    return [...acc, stakingProgramId];
  }, []);

/**
 * Time a start may take, so a start that begins this close to the end of an
 * eviction is treated as one that re-stakes.
 */
export const EVICTION_RUN_START_MARGIN_SECONDS = 30 * 60;

/**
 * Whether an agent that can run evicted starts inside its eviction window, with
 * enough of it left that the start cannot turn into a re-stake. Such a run does
 * not re-stake, so it needs no free slot.
 */
export const runsInsideEvictionWindow = ({
  isAgentEvicted,
  canRunWhileEvicted,
  evictionExpiresAt,
  nowSeconds,
}: {
  isAgentEvicted: boolean;
  canRunWhileEvicted: boolean | undefined;
  /** When the eviction ends, in seconds; 0 when unknown. */
  evictionExpiresAt: number;
  nowSeconds: number;
}): boolean =>
  isAgentEvicted &&
  !!canRunWhileEvicted &&
  evictionExpiresAt - nowSeconds > EVICTION_RUN_START_MARGIN_SECONDS;

/**
 * Withdrawal-only mode: a PolySafe service on a retired program can't switch,
 * as no live program accepts a PolySafe. It only starts unstaked, to redeem
 * and withdraw. The one definition of the rule; callers differ only in how
 * they read the Safe type.
 */
export const isWithdrawalOnly = ({
  isRetired,
  isPolySafeService,
}: {
  isRetired: boolean;
  isPolySafeService: boolean;
}) => isRetired && isPolySafeService;

/** What the retired-contract alert can say about a service on a retired program. */
export type RetiredProgramStatus =
  /** PolySafe (or already set up so): it only redeems and withdraws. */
  | 'withdrawalOnly'
  /** In the contract, inside its minimum staking period. */
  | 'cooldown'
  /** The Safe type couldn't be read, so neither variant can be offered. */
  | 'safeTypeUnknown'
  /** The staking details couldn't be read, so cooldown and switch are unknown. */
  | 'stakingDetailsUnknown'
  /** The Safe type or the staking details are still loading. */
  | 'loading'
  /** Past its period but still in the contract: the middleware has yet to unstake it. */
  | 'awaitingUnstake'
  /** Unstaked, standard Safe: it can switch to a live program. */
  | 'switch';

/**
 * Classifies a service already known to be on a retired program. One order
 * for every caller, so a state can't read as "switch" while it is unknown.
 */
export const getRetiredProgramStatus = ({
  isWithdrawalOnly: withdrawalOnly,
  isSafeTypeError,
  hasStakingDetails,
  isStakingDetailsError,
  isInMinimumStakingPeriod,
  isServiceOutOfContract,
}: {
  /** `undefined` while the Safe type is loading or couldn't be read. */
  isWithdrawalOnly: boolean | undefined;
  isSafeTypeError: boolean;
  hasStakingDetails: boolean;
  isStakingDetailsError: boolean;
  isInMinimumStakingPeriod: boolean;
  isServiceOutOfContract: boolean;
}): RetiredProgramStatus => {
  if (withdrawalOnly === true) return 'withdrawalOnly';
  if (isInMinimumStakingPeriod) return 'cooldown';
  if (withdrawalOnly === undefined) {
    return isSafeTypeError ? 'safeTypeUnknown' : 'loading';
  }
  if (!hasStakingDetails) {
    return isStakingDetailsError ? 'stakingDetailsUnknown' : 'loading';
  }
  return isServiceOutOfContract ? 'switch' : 'awaitingUnstake';
};
