import { renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { StakingProgramId } from '../../constants/stakingProgram';
import { StakingContractDetailsContext } from '../../context/StakingContractDetailsProvider';
import {
  useActiveStakingContractDetails,
  useStakingContractContext,
  useStakingContractDetails,
} from '../../hooks/useStakingContractDetails';
import {
  ServiceStakingDetails,
  StakingContractDetails,
  StakingState,
} from '../../types/Autonolas';
import {
  DEFAULT_LIVENESS_PERIOD_S,
  DEFAULT_SERVICE_NFT_TOKEN_ID,
  DEFAULT_STAKING_PROGRAM_ID,
  DEFAULT_TS_CHECKPOINT,
  makeServiceStakingDetails,
  makeStakingContractDetails,
  SECOND_STAKING_PROGRAM_ID,
} from '../helpers/factories';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ContextValue = {
  selectedStakingContractDetails?: Partial<
    StakingContractDetails & ServiceStakingDetails
  > | null;
  isSelectedStakingContractDetailsLoading?: boolean;
  allStakingContractDetailsRecord?: Record<
    StakingProgramId,
    Partial<StakingContractDetails>
  >;
  isAllStakingContractDetailsRecordLoaded?: boolean;
  isPaused?: boolean;
};

/**
 * Builds a React wrapper that provides StakingContractDetailsContext
 * with the given (partial) value merged over sensible defaults.
 */
function makeWrapper(overrides: ContextValue = {}) {
  const Wrapper = ({ children }: PropsWithChildren) =>
    createElement(
      StakingContractDetailsContext.Provider,
      {
        value: {
          selectedStakingContractDetails:
            overrides.selectedStakingContractDetails ?? null,
          isSelectedStakingContractDetailsLoading:
            overrides.isSelectedStakingContractDetailsLoading ?? false,
          allStakingContractDetailsRecord:
            overrides.allStakingContractDetailsRecord,
          isAllStakingContractDetailsRecordLoaded:
            overrides.isAllStakingContractDetailsRecordLoaded ?? false,
          refetchSelectedStakingContractDetails: async () => {},
          isPaused: overrides.isPaused ?? false,
          setIsPaused: () => {},
        },
      },
      children,
    );
  return Wrapper;
}

/** Fixed "now" used by Date.now spies – well past DEFAULT_TS_CHECKPOINT. */
const FIXED_NOW_S = DEFAULT_TS_CHECKPOINT + DEFAULT_LIVENESS_PERIOD_S + 1000;
const FIXED_NOW_MS = FIXED_NOW_S * 1000;

// ---------------------------------------------------------------------------
// useStakingContractContext
// ---------------------------------------------------------------------------

describe('useStakingContractContext', () => {
  it('returns the context value provided by StakingContractDetailsContext', () => {
    const details = {
      ...makeStakingContractDetails(),
      ...makeServiceStakingDetails(),
    };
    const wrapper = makeWrapper({
      selectedStakingContractDetails: details,
      isSelectedStakingContractDetailsLoading: true,
    });

    const { result } = renderHook(() => useStakingContractContext(), {
      wrapper,
    });

    expect(result.current.selectedStakingContractDetails).toBe(details);
    expect(result.current.isSelectedStakingContractDetailsLoading).toBe(true);
  });

  it('returns defaults when no provider is present', () => {
    const { result } = renderHook(() => useStakingContractContext());
    expect(result.current.selectedStakingContractDetails).toBeNull();
    expect(result.current.isSelectedStakingContractDetailsLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useActiveStakingContractDetails
// ---------------------------------------------------------------------------

describe('useActiveStakingContractDetails', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('when selectedStakingContractDetails is null', () => {
    it('returns safe defaults', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: null,
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });

      expect(result.current.isAgentEvicted).toBe(false);
      expect(result.current.isServiceStaked).toBe(false);
      expect(result.current.hasEnoughServiceSlots).toBeNull();
      // isRewardsAvailable is false because (undefined ?? 0) > 0 evaluates to false, so false && null short-circuits to false
      expect(result.current.hasEnoughRewardsAndSlots).toBe(false);
      expect(result.current.isServiceStakedForMinimumDuration).toBe(false);
      expect(result.current.evictionExpiresAt).toBe(0);
      // isEligibleForStaking: !isNil(false) && (false ? ... : true) = true && true = true
      // This is arguably a bug — isEligibleForStaking is true even when
      // hasEnoughRewardsAndSlots is false (but not nil).
      expect(result.current.isEligibleForStaking).toBe(true);
      expect(result.current.selectedStakingContractDetails).toBeNull();
    });
  });

  // ---- isAgentEvicted ----

  describe('isAgentEvicted', () => {
    it('is true when serviceStakingState is Evicted', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails(),
          ...makeServiceStakingDetails({
            serviceStakingState: StakingState.Evicted,
          }),
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.isAgentEvicted).toBe(true);
    });

    it.each([StakingState.NotStaked, StakingState.Staked])(
      'is false when serviceStakingState is %i',
      (state) => {
        const wrapper = makeWrapper({
          selectedStakingContractDetails: {
            ...makeStakingContractDetails(),
            ...makeServiceStakingDetails({ serviceStakingState: state }),
          },
        });
        const { result } = renderHook(() => useActiveStakingContractDetails(), {
          wrapper,
        });
        expect(result.current.isAgentEvicted).toBe(false);
      },
    );
  });

  // ---- isServiceStaked ----

  describe('isServiceStaked', () => {
    it('is true when staked and start time is non-zero', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails(),
          ...makeServiceStakingDetails({
            serviceStakingState: StakingState.Staked,
            serviceStakingStartTime: DEFAULT_TS_CHECKPOINT,
          }),
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.isServiceStaked).toBe(true);
    });

    it('is false when state is Staked but start time is 0', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails(),
          ...makeServiceStakingDetails({
            serviceStakingState: StakingState.Staked,
            serviceStakingStartTime: 0,
          }),
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.isServiceStaked).toBe(false);
    });

    it('is false when start time is set but state is NotStaked', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails(),
          ...makeServiceStakingDetails({
            serviceStakingState: StakingState.NotStaked,
            serviceStakingStartTime: DEFAULT_TS_CHECKPOINT,
          }),
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.isServiceStaked).toBe(false);
    });
  });

  // ---- isRewardsAvailable ----

  describe('isRewardsAvailable', () => {
    it('is true when availableRewards > 0', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails({ availableRewards: 10 }),
          ...makeServiceStakingDetails(),
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.isRewardsAvailable).toBe(true);
    });

    it('is false when availableRewards is 0', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails({ availableRewards: 0 }),
          ...makeServiceStakingDetails(),
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.isRewardsAvailable).toBe(false);
    });

    it('is false when availableRewards is undefined (fallback is 0)', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeServiceStakingDetails(),
          // No availableRewards — will be undefined from destructuring
          maxNumServices: 5,
          serviceIds: [DEFAULT_SERVICE_NFT_TOKEN_ID],
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      // (undefined ?? 0) > 0 === false
      expect(result.current.isRewardsAvailable).toBe(false);
    });
  });

  // ---- hasEnoughServiceSlots ----

  describe('hasEnoughServiceSlots', () => {
    it('is null when serviceIds is undefined', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeServiceStakingDetails(),
          availableRewards: 10,
          maxNumServices: 5,
          // serviceIds intentionally omitted
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.hasEnoughServiceSlots).toBeNull();
    });

    it('is null when maxNumServices is undefined', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeServiceStakingDetails(),
          availableRewards: 10,
          serviceIds: [1, 2],
          // maxNumServices intentionally omitted
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.hasEnoughServiceSlots).toBeNull();
    });

    it('is true when serviceIds.length < maxNumServices (slots available)', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails({
            serviceIds: [1, 2],
            maxNumServices: 5,
          }),
          ...makeServiceStakingDetails(),
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.hasEnoughServiceSlots).toBe(true);
    });

    it('is false when serviceIds.length === maxNumServices (no slots)', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails({
            serviceIds: [1, 2, 3],
            maxNumServices: 3,
          }),
          ...makeServiceStakingDetails(),
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.hasEnoughServiceSlots).toBe(false);
    });

    it('is false when serviceIds.length > maxNumServices', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails({
            serviceIds: [1, 2, 3, 4],
            maxNumServices: 3,
          }),
          ...makeServiceStakingDetails(),
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.hasEnoughServiceSlots).toBe(false);
    });
  });

  // ---- hasEnoughRewardsAndSlots ----

  describe('hasEnoughRewardsAndSlots', () => {
    it('is truthy when both rewards and slots are available', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails({
            availableRewards: 10,
            serviceIds: [1],
            maxNumServices: 5,
          }),
          ...makeServiceStakingDetails(),
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.hasEnoughRewardsAndSlots).toBe(true);
    });

    it('is falsy when rewards are 0 (slots available)', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails({
            availableRewards: 0,
            serviceIds: [1],
            maxNumServices: 5,
          }),
          ...makeServiceStakingDetails(),
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      // 0 && true === 0 (falsy)
      expect(result.current.hasEnoughRewardsAndSlots).toBeFalsy();
    });

    it('is false when slots are full (rewards available)', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails({
            availableRewards: 10,
            serviceIds: [1, 2, 3],
            maxNumServices: 3,
          }),
          ...makeServiceStakingDetails(),
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.hasEnoughRewardsAndSlots).toBe(false);
    });

    it('is null when serviceIds or maxNumServices is undefined', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeServiceStakingDetails(),
          availableRewards: 10,
          // serviceIds and maxNumServices omitted → hasEnoughServiceSlots = null
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      // 10 && null === null
      expect(result.current.hasEnoughRewardsAndSlots).toBeNull();
    });
  });

  // ---- isServiceStakedForMinimumDuration ----

  describe('isServiceStakedForMinimumDuration', () => {
    it('is true when now - startTime >= minimumStakingDuration', () => {
      jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW_MS);
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails({
            minimumStakingDuration: DEFAULT_LIVENESS_PERIOD_S,
          }),
          ...makeServiceStakingDetails({
            serviceStakingStartTime: DEFAULT_TS_CHECKPOINT,
          }),
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      // FIXED_NOW_S - DEFAULT_TS_CHECKPOINT = DEFAULT_LIVENESS_PERIOD_S + 1000 >= DEFAULT_LIVENESS_PERIOD_S
      expect(result.current.isServiceStakedForMinimumDuration).toBe(true);
    });

    it('is false when now - startTime < minimumStakingDuration', () => {
      // Set "now" to 10 seconds after staking start
      const earlyNowMs = (DEFAULT_TS_CHECKPOINT + 10) * 1000;
      jest.spyOn(Date, 'now').mockReturnValue(earlyNowMs);
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails({
            minimumStakingDuration: DEFAULT_LIVENESS_PERIOD_S,
          }),
          ...makeServiceStakingDetails({
            serviceStakingStartTime: DEFAULT_TS_CHECKPOINT,
          }),
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.isServiceStakedForMinimumDuration).toBe(false);
    });

    it('is false when serviceStakingStartTime is nil', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails(),
          // serviceStakingStartTime intentionally omitted
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.isServiceStakedForMinimumDuration).toBe(false);
    });

    it('is false when minimumStakingDuration is nil', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeServiceStakingDetails(),
          // minimumStakingDuration intentionally omitted
          availableRewards: 10,
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.isServiceStakedForMinimumDuration).toBe(false);
    });
  });

  // ---- evictionExpiresAt ----

  describe('evictionExpiresAt', () => {
    it('equals serviceStakingStartTime + minimumStakingDuration', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails({
            minimumStakingDuration: DEFAULT_LIVENESS_PERIOD_S,
          }),
          ...makeServiceStakingDetails({
            serviceStakingStartTime: DEFAULT_TS_CHECKPOINT,
          }),
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.evictionExpiresAt).toBe(
        DEFAULT_TS_CHECKPOINT + DEFAULT_LIVENESS_PERIOD_S,
      );
    });

    it('falls back to 0 for undefined fields', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          // Both serviceStakingStartTime and minimumStakingDuration omitted
          availableRewards: 10,
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      // (undefined ?? 0) + (undefined ?? 0) = 0
      expect(result.current.evictionExpiresAt).toBe(0);
    });
  });

  // ---- isEligibleForStaking ----

  describe('isEligibleForStaking', () => {
    it('is true when hasEnoughRewardsAndSlots is non-nil and not evicted', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails({
            availableRewards: 10,
            serviceIds: [1],
            maxNumServices: 5,
          }),
          ...makeServiceStakingDetails({
            serviceStakingState: StakingState.Staked,
          }),
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.isEligibleForStaking).toBe(true);
    });

    it('is false when hasEnoughRewardsAndSlots is null (slots data missing)', () => {
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeServiceStakingDetails(),
          availableRewards: 10,
          // serviceIds omitted → hasEnoughServiceSlots = null → hasEnoughRewardsAndSlots = null
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.isEligibleForStaking).toBe(false);
    });

    it('is true when evicted and minimum duration has passed', () => {
      jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW_MS);
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails({
            availableRewards: 10,
            serviceIds: [1],
            maxNumServices: 5,
            minimumStakingDuration: DEFAULT_LIVENESS_PERIOD_S,
          }),
          ...makeServiceStakingDetails({
            serviceStakingState: StakingState.Evicted,
            serviceStakingStartTime: DEFAULT_TS_CHECKPOINT,
          }),
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.isAgentEvicted).toBe(true);
      expect(result.current.isServiceStakedForMinimumDuration).toBe(true);
      expect(result.current.isEligibleForStaking).toBe(true);
    });

    it('is false when evicted but minimum duration has NOT passed', () => {
      // "now" is only 10s after staking start
      const earlyNowMs = (DEFAULT_TS_CHECKPOINT + 10) * 1000;
      jest.spyOn(Date, 'now').mockReturnValue(earlyNowMs);
      const wrapper = makeWrapper({
        selectedStakingContractDetails: {
          ...makeStakingContractDetails({
            availableRewards: 10,
            serviceIds: [1],
            maxNumServices: 5,
            minimumStakingDuration: DEFAULT_LIVENESS_PERIOD_S,
          }),
          ...makeServiceStakingDetails({
            serviceStakingState: StakingState.Evicted,
            serviceStakingStartTime: DEFAULT_TS_CHECKPOINT,
          }),
        },
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.isAgentEvicted).toBe(true);
      expect(result.current.isServiceStakedForMinimumDuration).toBe(false);
      expect(result.current.isEligibleForStaking).toBe(false);
    });
  });

  // ---- isSelectedStakingContractDetailsLoading passthrough ----

  describe('passthrough fields', () => {
    it('passes through isSelectedStakingContractDetailsLoading', () => {
      const wrapper = makeWrapper({
        isSelectedStakingContractDetailsLoading: true,
      });
      const { result } = renderHook(() => useActiveStakingContractDetails(), {
        wrapper,
      });
      expect(result.current.isSelectedStakingContractDetailsLoading).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// useStakingContractDetails
// ---------------------------------------------------------------------------

describe('useStakingContractDetails', () => {
  describe('when stakingProgramId is null', () => {
    it('returns null stakingContractInfo and false booleans', () => {
      const wrapper = makeWrapper({
        allStakingContractDetailsRecord: {
          [DEFAULT_STAKING_PROGRAM_ID]: makeStakingContractDetails(),
        } as Record<StakingProgramId, Partial<StakingContractDetails>>,
      });
      const { result } = renderHook(() => useStakingContractDetails(null), {
        wrapper,
      });
      expect(result.current.stakingContractInfo).toBeNull();
      expect(result.current.hasEnoughServiceSlots).toBe(false);
      expect(result.current.isRewardsAvailable).toBe(false);
      expect(result.current.hasEnoughRewardsAndSlots).toBe(false);
    });
  });

  describe('when stakingProgramId is not found in record', () => {
    it('returns undefined stakingContractInfo and false booleans', () => {
      const wrapper = makeWrapper({
        allStakingContractDetailsRecord: {} as Record<
          StakingProgramId,
          Partial<StakingContractDetails>
        >,
      });
      const { result } = renderHook(
        () => useStakingContractDetails(DEFAULT_STAKING_PROGRAM_ID),
        { wrapper },
      );
      expect(result.current.stakingContractInfo).toBeUndefined();
      expect(result.current.hasEnoughServiceSlots).toBe(false);
      expect(result.current.isRewardsAvailable).toBe(false);
      expect(result.current.hasEnoughRewardsAndSlots).toBe(false);
    });
  });

  describe('when allStakingContractDetailsRecord is undefined', () => {
    it('returns undefined stakingContractInfo', () => {
      const wrapper = makeWrapper({
        allStakingContractDetailsRecord: undefined,
      });
      const { result } = renderHook(
        () => useStakingContractDetails(DEFAULT_STAKING_PROGRAM_ID),
        { wrapper },
      );
      expect(result.current.stakingContractInfo).toBeUndefined();
    });
  });

  describe('isRewardsAvailable', () => {
    it('is true when availableRewards > 0', () => {
      const wrapper = makeWrapper({
        allStakingContractDetailsRecord: {
          [DEFAULT_STAKING_PROGRAM_ID]: makeStakingContractDetails({
            availableRewards: 5,
          }),
        } as Record<StakingProgramId, Partial<StakingContractDetails>>,
      });
      const { result } = renderHook(
        () => useStakingContractDetails(DEFAULT_STAKING_PROGRAM_ID),
        { wrapper },
      );
      expect(result.current.isRewardsAvailable).toBe(true);
    });

    it('is false when availableRewards is 0', () => {
      const wrapper = makeWrapper({
        allStakingContractDetailsRecord: {
          [DEFAULT_STAKING_PROGRAM_ID]: makeStakingContractDetails({
            availableRewards: 0,
          }),
        } as Record<StakingProgramId, Partial<StakingContractDetails>>,
      });
      const { result } = renderHook(
        () => useStakingContractDetails(DEFAULT_STAKING_PROGRAM_ID),
        { wrapper },
      );
      expect(result.current.isRewardsAvailable).toBe(false);
    });
  });

  describe('hasEnoughServiceSlots', () => {
    it('is true when serviceIds.length < maxNumServices', () => {
      const wrapper = makeWrapper({
        allStakingContractDetailsRecord: {
          [DEFAULT_STAKING_PROGRAM_ID]: makeStakingContractDetails({
            serviceIds: [1],
            maxNumServices: 5,
          }),
        } as Record<StakingProgramId, Partial<StakingContractDetails>>,
      });
      const { result } = renderHook(
        () => useStakingContractDetails(DEFAULT_STAKING_PROGRAM_ID),
        { wrapper },
      );
      expect(result.current.hasEnoughServiceSlots).toBe(true);
    });

    it('is false when serviceIds.length >= maxNumServices', () => {
      const wrapper = makeWrapper({
        allStakingContractDetailsRecord: {
          [DEFAULT_STAKING_PROGRAM_ID]: makeStakingContractDetails({
            serviceIds: [1, 2, 3],
            maxNumServices: 3,
          }),
        } as Record<StakingProgramId, Partial<StakingContractDetails>>,
      });
      const { result } = renderHook(
        () => useStakingContractDetails(DEFAULT_STAKING_PROGRAM_ID),
        { wrapper },
      );
      expect(result.current.hasEnoughServiceSlots).toBe(false);
    });

    it('is false when serviceIds is nil (differs from active hook which returns null)', () => {
      // The factory always includes serviceIds, so we need to force-omit it
      const record = {
        [DEFAULT_STAKING_PROGRAM_ID]: {
          availableRewards: 10,
          maxNumServices: 5,
          // serviceIds intentionally omitted
        },
      } as Record<StakingProgramId, Partial<StakingContractDetails>>;
      const wrapper = makeWrapper({
        allStakingContractDetailsRecord: record,
      });
      const { result } = renderHook(
        () => useStakingContractDetails(DEFAULT_STAKING_PROGRAM_ID),
        { wrapper },
      );
      // !isNil(undefined) is false → short-circuits to false
      expect(result.current.hasEnoughServiceSlots).toBe(false);
    });
  });

  describe('hasEnoughRewardsAndSlots', () => {
    it('is truthy when both rewards and slots are available', () => {
      const wrapper = makeWrapper({
        allStakingContractDetailsRecord: {
          [DEFAULT_STAKING_PROGRAM_ID]: makeStakingContractDetails({
            availableRewards: 10,
            serviceIds: [1],
            maxNumServices: 5,
          }),
        } as Record<StakingProgramId, Partial<StakingContractDetails>>,
      });
      const { result } = renderHook(
        () => useStakingContractDetails(DEFAULT_STAKING_PROGRAM_ID),
        { wrapper },
      );
      expect(result.current.hasEnoughRewardsAndSlots).toBe(true);
    });

    it('is false when slots are full', () => {
      const wrapper = makeWrapper({
        allStakingContractDetailsRecord: {
          [DEFAULT_STAKING_PROGRAM_ID]: makeStakingContractDetails({
            availableRewards: 10,
            serviceIds: [1, 2, 3],
            maxNumServices: 3,
          }),
        } as Record<StakingProgramId, Partial<StakingContractDetails>>,
      });
      const { result } = renderHook(
        () => useStakingContractDetails(DEFAULT_STAKING_PROGRAM_ID),
        { wrapper },
      );
      expect(result.current.hasEnoughRewardsAndSlots).toBe(false);
    });
  });

  describe('looks up correct program by id', () => {
    it('returns the matching program details', () => {
      const programA = makeStakingContractDetails({ availableRewards: 100 });
      const programB = makeStakingContractDetails({ availableRewards: 200 });
      const wrapper = makeWrapper({
        allStakingContractDetailsRecord: {
          [DEFAULT_STAKING_PROGRAM_ID]: programA,
          [SECOND_STAKING_PROGRAM_ID]: programB,
        } as Record<StakingProgramId, Partial<StakingContractDetails>>,
      });

      const { result: resultA } = renderHook(
        () => useStakingContractDetails(DEFAULT_STAKING_PROGRAM_ID),
        { wrapper },
      );
      expect(resultA.current.stakingContractInfo).toBe(programA);

      const { result: resultB } = renderHook(
        () => useStakingContractDetails(SECOND_STAKING_PROGRAM_ID),
        { wrapper },
      );
      expect(resultB.current.stakingContractInfo).toBe(programB);
    });
  });
});
