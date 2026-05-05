/**
 * Tests for deployment status constants and guard functions.
 *
 * `isActiveDeploymentStatus` and `isTransitioningDeploymentStatus` are used
 * throughout the codebase to decide whether the service is considered running
 * and whether the UI should show a loading spinner. Getting these wrong causes
 * silent regressions (e.g. treating a STOPPED service as active).
 */

import {
  isActiveDeploymentStatus,
  isTransitioningDeploymentStatus,
  MiddlewareDeploymentStatusMap,
} from '../../constants/deployment';

describe('MiddlewareDeploymentStatusMap', () => {
  it('assigns the documented numeric values to every status', () => {
    expect(MiddlewareDeploymentStatusMap.CREATED).toBe(0);
    expect(MiddlewareDeploymentStatusMap.BUILT).toBe(1);
    expect(MiddlewareDeploymentStatusMap.DEPLOYING).toBe(2);
    expect(MiddlewareDeploymentStatusMap.DEPLOYED).toBe(3);
    expect(MiddlewareDeploymentStatusMap.STOPPING).toBe(4);
    expect(MiddlewareDeploymentStatusMap.STOPPED).toBe(5);
    expect(MiddlewareDeploymentStatusMap.DELETED).toBe(6);
  });

  it('covers exactly 7 statuses with consecutive values 0–6', () => {
    const values = Object.values(MiddlewareDeploymentStatusMap);
    expect(values).toHaveLength(7);
    expect(values.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('has no duplicate numeric values', () => {
    const values = Object.values(MiddlewareDeploymentStatusMap);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe('isActiveDeploymentStatus', () => {
  /**
   * A service is "active" when it is DEPLOYED, DEPLOYING, or STOPPING.
   * These are the states where the service occupies a staking slot and work
   * can be credited to the agent.
   */

  it('returns true for DEPLOYED', () => {
    expect(
      isActiveDeploymentStatus(MiddlewareDeploymentStatusMap.DEPLOYED),
    ).toBe(true);
  });

  it('returns true for DEPLOYING (transitioning into active)', () => {
    expect(
      isActiveDeploymentStatus(MiddlewareDeploymentStatusMap.DEPLOYING),
    ).toBe(true);
  });

  it('returns true for STOPPING (transitioning out of active)', () => {
    expect(
      isActiveDeploymentStatus(MiddlewareDeploymentStatusMap.STOPPING),
    ).toBe(true);
  });

  it('returns false for CREATED (service not yet built)', () => {
    // CREATED has numeric value 0 which is falsy — callers must not rely on truthiness
    expect(
      isActiveDeploymentStatus(MiddlewareDeploymentStatusMap.CREATED),
    ).toBe(false);
  });

  it('returns false for BUILT', () => {
    expect(isActiveDeploymentStatus(MiddlewareDeploymentStatusMap.BUILT)).toBe(
      false,
    );
  });

  it('returns false for STOPPED', () => {
    expect(
      isActiveDeploymentStatus(MiddlewareDeploymentStatusMap.STOPPED),
    ).toBe(false);
  });

  it('returns false for DELETED', () => {
    expect(
      isActiveDeploymentStatus(MiddlewareDeploymentStatusMap.DELETED),
    ).toBe(false);
  });

  it('returns false for undefined (missing deployment status)', () => {
    expect(isActiveDeploymentStatus(undefined)).toBe(false);
  });

  it('returns false for null (no service yet)', () => {
    expect(isActiveDeploymentStatus(null)).toBe(false);
  });
});

describe('isTransitioningDeploymentStatus', () => {
  /**
   * A service is "transitioning" when it is DEPLOYING or STOPPING.
   * This subset is used to show loading/spinner UI — DEPLOYED itself is NOT
   * transitioning even though it is active.
   */

  it('returns true for DEPLOYING', () => {
    expect(
      isTransitioningDeploymentStatus(MiddlewareDeploymentStatusMap.DEPLOYING),
    ).toBe(true);
  });

  it('returns true for STOPPING', () => {
    expect(
      isTransitioningDeploymentStatus(MiddlewareDeploymentStatusMap.STOPPING),
    ).toBe(true);
  });

  it('returns false for DEPLOYED (stable active — not transitioning)', () => {
    expect(
      isTransitioningDeploymentStatus(MiddlewareDeploymentStatusMap.DEPLOYED),
    ).toBe(false);
  });

  it('returns false for CREATED', () => {
    expect(
      isTransitioningDeploymentStatus(MiddlewareDeploymentStatusMap.CREATED),
    ).toBe(false);
  });

  it('returns false for BUILT', () => {
    expect(
      isTransitioningDeploymentStatus(MiddlewareDeploymentStatusMap.BUILT),
    ).toBe(false);
  });

  it('returns false for STOPPED', () => {
    expect(
      isTransitioningDeploymentStatus(MiddlewareDeploymentStatusMap.STOPPED),
    ).toBe(false);
  });

  it('returns false for DELETED', () => {
    expect(
      isTransitioningDeploymentStatus(MiddlewareDeploymentStatusMap.DELETED),
    ).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isTransitioningDeploymentStatus(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isTransitioningDeploymentStatus(null)).toBe(false);
  });
});

describe('relationship between isActive and isTransitioning', () => {
  it('every transitioning status is also active', () => {
    // DEPLOYING and STOPPING are both active and transitioning.
    // Filter first so there is no conditional expect inside the loop.
    const transitioningStatuses = Object.values(
      MiddlewareDeploymentStatusMap,
    ).filter(isTransitioningDeploymentStatus);
    for (const status of transitioningStatuses) {
      expect(isActiveDeploymentStatus(status)).toBe(true);
    }
  });

  it('DEPLOYED is active but not transitioning', () => {
    // DEPLOYED is stable — the agent is running but not in flux
    expect(
      isActiveDeploymentStatus(MiddlewareDeploymentStatusMap.DEPLOYED),
    ).toBe(true);
    expect(
      isTransitioningDeploymentStatus(MiddlewareDeploymentStatusMap.DEPLOYED),
    ).toBe(false);
  });

  it('exactly 2 statuses are transitioning and 3 are active', () => {
    const allStatuses = Object.values(MiddlewareDeploymentStatusMap);
    const transitioning = allStatuses.filter(isTransitioningDeploymentStatus);
    const active = allStatuses.filter(isActiveDeploymentStatus);
    expect(transitioning).toHaveLength(2);
    expect(active).toHaveLength(3);
  });
});
