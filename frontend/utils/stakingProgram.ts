import type {
  StakingProgramConfig,
  StakingProgramMap,
} from '@/config/stakingPrograms';
import type { AgentType, StakingProgramId } from '@/constants';
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
 * 1. The current program first — even if deprecated or incompatible, the user
 *    must be able to see the contract they are actually staked in.
 * 2. Deprecated programs are hidden.
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
    if (program.deprecated) return acc;
    if (!program.agentsSupported.includes(agentType)) return acc;
    if (!isStakingProgramCompatibleWithMultisig(program, isPolySafeService)) {
      return acc;
    }

    return [...acc, stakingProgramId];
  }, []);
