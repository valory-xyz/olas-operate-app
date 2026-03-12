import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useInterval } from 'usehooks-ts';

import { useStakingContractCountdown } from '../../hooks/useStakingContractCountdown';
import {
  ServiceStakingDetails,
  StakingContractDetails,
} from '../../types/Autonolas';
import { formatCountdownDisplay } from '../../utils/time';

let intervalCallback: (() => void) | null = null;

jest.mock('usehooks-ts', () => ({
  useInterval: jest.fn((cb: () => void) => {
    intervalCallback = cb;
  }),
}));

const mockUseInterval = useInterval as jest.Mock;

const NOW_IN_MS = 1_700_000_000_000; // fixed timestamp
const NOW_IN_S = Math.round(NOW_IN_MS / 1000);

describe('useStakingContractCountdown', () => {
  let dateNowSpy: jest.SpyInstance;

  beforeEach(() => {
    intervalCallback = null;
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW_IN_MS);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  it('returns empty display and undefined seconds when input is null', () => {
    const { result } = renderHook(() => useStakingContractCountdown(null));

    act(() => {
      intervalCallback?.();
    });

    expect(result.current.secondsUntilReady).toBeUndefined();
    expect(result.current.countdownDisplay).toBe('');
  });

  it('returns empty display and undefined seconds when input is undefined', () => {
    const { result } = renderHook(() => useStakingContractCountdown(undefined));

    act(() => {
      intervalCallback?.();
    });

    expect(result.current.secondsUntilReady).toBeUndefined();
    expect(result.current.countdownDisplay).toBe('');
  });

  it('returns empty display when serviceStakingStartTime is missing from input', () => {
    const info: Partial<StakingContractDetails & ServiceStakingDetails> = {
      minimumStakingDuration: 3600,
    };
    const { result } = renderHook(() => useStakingContractCountdown(info));

    act(() => {
      intervalCallback?.();
    });

    expect(result.current.secondsUntilReady).toBeUndefined();
    expect(result.current.countdownDisplay).toBe('');
  });

  it('returns empty display when minimumStakingDuration is missing from input', () => {
    const info: Partial<StakingContractDetails & ServiceStakingDetails> = {
      serviceStakingStartTime: NOW_IN_S - 1000,
    };
    const { result } = renderHook(() => useStakingContractCountdown(info));

    act(() => {
      intervalCallback?.();
    });

    expect(result.current.secondsUntilReady).toBeUndefined();
    expect(result.current.countdownDisplay).toBe('');
  });

  it('computes positive countdown when migration time is in the future', () => {
    const stakingStartTime = NOW_IN_S - 1000; // staked 1000s ago
    const minDuration = 5000; // need 5000s total
    const expectedSeconds = minDuration - (NOW_IN_S - stakingStartTime); // 4000

    const info: Partial<StakingContractDetails & ServiceStakingDetails> = {
      serviceStakingStartTime: stakingStartTime,
      minimumStakingDuration: minDuration,
    };

    const { result } = renderHook(() => useStakingContractCountdown(info));

    act(() => {
      intervalCallback?.();
    });

    expect(result.current.secondsUntilReady).toBe(expectedSeconds);
    expect(result.current.countdownDisplay).toBe(
      formatCountdownDisplay(expectedSeconds),
    );
  });

  it('clamps to 0 when migration time has passed (negative countdown)', () => {
    const stakingStartTime = NOW_IN_S - 10000; // staked 10000s ago
    const minDuration = 5000; // only need 5000s

    const info: Partial<StakingContractDetails & ServiceStakingDetails> = {
      serviceStakingStartTime: stakingStartTime,
      minimumStakingDuration: minDuration,
    };

    const { result } = renderHook(() => useStakingContractCountdown(info));

    act(() => {
      intervalCallback?.();
    });

    expect(result.current.secondsUntilReady).toBe(0);
    expect(result.current.countdownDisplay).toBe(formatCountdownDisplay(0));
  });

  it('returns 0 seconds when staking duration exactly equals elapsed time', () => {
    const minDuration = 5000;
    const stakingStartTime = NOW_IN_S - minDuration; // exactly at boundary

    const info: Partial<StakingContractDetails & ServiceStakingDetails> = {
      serviceStakingStartTime: stakingStartTime,
      minimumStakingDuration: minDuration,
    };

    const { result } = renderHook(() => useStakingContractCountdown(info));

    act(() => {
      intervalCallback?.();
    });

    // timeUntilMigration = 5000 - 5000 = 0, which is not < 0, so it sets 0
    expect(result.current.secondsUntilReady).toBe(0);
    expect(result.current.countdownDisplay).toBe(formatCountdownDisplay(0));
  });

  it('passes 1000ms delay to useInterval', () => {
    renderHook(() => useStakingContractCountdown(null));
    expect(mockUseInterval).toHaveBeenCalledWith(expect.any(Function), 1000);
  });
});
