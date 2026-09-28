import { renderHook } from '@testing-library/react';

import {
  MiddlewareDeploymentStatus,
  MiddlewareDeploymentStatusMap,
} from '../../constants/deployment';
import { useAgentActivity } from '../../hooks/useAgentActivity';
import {
  makeAgentHealthCheck,
  makeAgentLiveness,
  makeService,
  makeServiceDeployment,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({ PROVIDERS: {} }));

const mockDeploymentDetails = makeServiceDeployment();

const mockUseServices = jest.fn();
jest.mock('../../hooks/useServices', () => ({
  useServices: () => mockUseServices(),
}));

const setPayload = ({
  deploymentStatus = MiddlewareDeploymentStatusMap.DEPLOYED,
  deploymentDetails,
}: {
  deploymentStatus?: MiddlewareDeploymentStatus;
  deploymentDetails: ReturnType<typeof makeServiceDeployment>;
}) =>
  mockUseServices.mockReturnValue({
    selectedService: makeService({ deploymentStatus }),
    deploymentDetails,
  });

/** Thin wrapper over the shared factories; `liveness: null` omits the object. */
const renderWith = ({
  health = {},
  liveness = {},
  deploymentStatus,
}: {
  health?: Parameters<typeof makeAgentHealthCheck>[0];
  liveness?: Parameters<typeof makeAgentLiveness>[0] | null;
  deploymentStatus?: MiddlewareDeploymentStatus;
} = {}) => {
  setPayload({
    deploymentStatus,
    deploymentDetails: makeServiceDeployment({
      healthcheck: makeAgentHealthCheck(health),
      agent_liveness:
        liveness === null ? undefined : makeAgentLiveness(liveness),
    }),
  });
  return renderHook(() => useAgentActivity());
};

/** The reported incident: unhealthy, no transition for five minutes. */
const STALLED = {
  is_healthy: false,
  seconds_since_last_transition: 300,
} as const;

describe('useAgentActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns isServiceRunning=true when deployment status is DEPLOYED', () => {
    mockUseServices.mockReturnValue({
      selectedService: makeService({
        deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
      }),
      deploymentDetails: mockDeploymentDetails,
    });

    const { result } = renderHook(() => useAgentActivity());
    expect(result.current.isServiceRunning).toBe(true);
    expect(result.current.isServiceDeploying).toBe(false);
    expect(result.current.deploymentDetails).toBe(mockDeploymentDetails);
  });

  it('returns isServiceDeploying=true when deployment status is DEPLOYING', () => {
    mockUseServices.mockReturnValue({
      selectedService: makeService({
        deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYING,
      }),
      deploymentDetails: undefined,
    });

    const { result } = renderHook(() => useAgentActivity());
    expect(result.current.isServiceRunning).toBe(false);
    expect(result.current.isServiceDeploying).toBe(true);
    expect(result.current.deploymentDetails).toBeUndefined();
  });

  it('returns isServiceRunning & isServiceDeploying flags false when deployment status is STOPPING', () => {
    mockUseServices.mockReturnValue({
      selectedService: makeService({
        deploymentStatus: MiddlewareDeploymentStatusMap.STOPPING,
      }),
      deploymentDetails: undefined,
    });

    const { result } = renderHook(() => useAgentActivity());
    expect(result.current.isServiceRunning).toBe(false);
    expect(result.current.isServiceDeploying).toBe(false);
  });

  it('returns both flags false when deployment status is STOPPED', () => {
    mockUseServices.mockReturnValue({
      selectedService: makeService({
        deploymentStatus: MiddlewareDeploymentStatusMap.STOPPED,
      }),
      deploymentDetails: undefined,
    });

    const { result } = renderHook(() => useAgentActivity());
    expect(result.current.isServiceRunning).toBe(false);
    expect(result.current.isServiceDeploying).toBe(false);
  });

  it('returns both flags false when deployment status is CREATED', () => {
    mockUseServices.mockReturnValue({
      selectedService: makeService({
        deploymentStatus: MiddlewareDeploymentStatusMap.CREATED,
      }),
      deploymentDetails: undefined,
    });

    const { result } = renderHook(() => useAgentActivity());

    expect(result.current.isServiceRunning).toBe(false);
    expect(result.current.isServiceDeploying).toBe(false);
  });

  it('returns both flags false when deployment status is BUILT', () => {
    mockUseServices.mockReturnValue({
      selectedService: makeService({
        deploymentStatus: MiddlewareDeploymentStatusMap.BUILT,
      }),
      deploymentDetails: undefined,
    });

    const { result } = renderHook(() => useAgentActivity());

    expect(result.current.isServiceRunning).toBe(false);
    expect(result.current.isServiceDeploying).toBe(false);
  });

  it('returns both flags false when deployment status is DELETED', () => {
    mockUseServices.mockReturnValue({
      selectedService: makeService({
        deploymentStatus: MiddlewareDeploymentStatusMap.DELETED,
      }),
      deploymentDetails: undefined,
    });

    const { result } = renderHook(() => useAgentActivity());

    expect(result.current.isServiceRunning).toBe(false);
    expect(result.current.isServiceDeploying).toBe(false);
  });

  it('returns both flags false when selectedService is undefined', () => {
    mockUseServices.mockReturnValue({
      selectedService: undefined,
      deploymentDetails: undefined,
    });

    const { result } = renderHook(() => useAgentActivity());

    expect(result.current.isServiceRunning).toBe(false);
    expect(result.current.isServiceDeploying).toBe(false);
  });

  describe('agent liveness', () => {
    it('reports the agent inactive when the process has been gone for a while', () => {
      const { result } = renderWith({
        liveness: {
          is_alive: false,
          reason: 'agent_process_exited',
          consecutive_failures: 60,
        },
      });

      expect(result.current.isAgentActive).toBe(false);
      // `isServiceRunning` stays deployment-only so Staking.tsx can't end up
      // telling the user to start an agent whose button reads "Stop agent".
      expect(result.current.isServiceRunning).toBe(true);
    });

    it('reports the agent inactive when unresponsive for a while', () => {
      const { result } = renderWith({
        liveness: {
          is_alive: false,
          reason: 'agent_unresponsive',
          consecutive_failures: 60,
        },
      });

      expect(result.current.isAgentActive).toBe(false);
    });

    // Regression, OPE-1920 follow-up: a starting agent answers HTTP 425, which
    // flips `is_alive` false on the first probe. 12 failures is the longest
    // such stretch measured on a healthy agent.
    it('does not report a starting agent down across the longest observed window', () => {
      const { result } = renderWith({
        liveness: {
          is_alive: false,
          reason: 'agent_unresponsive',
          consecutive_failures: 12,
        },
      });

      expect(result.current.isAgentActive).toBe(true);
    });

    it.each([
      ['one short of the floor', 29, true],
      ['exactly at the floor', 30, false],
    ])(
      'applies the failure floor %s',
      (_label, consecutiveFailures, isActive) => {
        const { result } = renderWith({
          liveness: {
            is_alive: false,
            reason: 'agent_process_exited',
            consecutive_failures: consecutiveFailures,
          },
        });

        expect(result.current.isAgentActive).toBe(isActive);
      },
    );

    // Set by the middleware when it stops the service itself, so there is no
    // streak to wait out.
    it.each(['evicted_cannot_restake', 'stopped_by_failfast'] as const)(
      'reports down immediately for %s',
      (reason) => {
        const { result } = renderWith({
          liveness: { is_alive: false, reason, consecutive_failures: 0 },
        });

        expect(result.current.isAgentActive).toBe(false);
      },
    );

    // Failfast deletes `healthcheck.json` and tears the deployment down while
    // the status still reads DEPLOYED: empty rounds, restarts at the limit.
    it('does not report a failfast-stopped agent as restarting', () => {
      const { result } = renderWith({
        health: { rounds: [] },
        liveness: {
          is_alive: false,
          reason: 'stopped_by_failfast',
          consecutive_failures: 0,
          restarts_since_last_healthy: 5,
        },
      });

      expect(result.current.isAgentRedeploying).toBe(false);
    });

    it('treats not_monitored as unknown, however many probes failed', () => {
      const { result } = renderWith({
        liveness: {
          is_alive: false,
          reason: 'not_monitored',
          consecutive_failures: 60,
        },
      });

      expect(result.current.isAgentActive).toBe(true);
    });

    it('returns isAgentActive=true when DEPLOYED and the agent is alive', () => {
      const { result } = renderWith();

      expect(result.current.isAgentActive).toBe(true);
    });

    // Older middleware omits `agent_liveness`; absent means unknown.
    it('treats absent liveness as unknown, not as not-alive', () => {
      const { result } = renderWith({ liveness: null });

      expect(result.current.isAgentActive).toBe(true);
    });
  });

  describe('stall derivation', () => {
    describe('the threshold reads the service its own pause duration', () => {
      // Polystrat pauses 90 s between cycles: 95 s of dwell is a pause.
      it('does not flag a Polystrat agent inside its own reset pause', () => {
        const { result } = renderWith({
          health: {
            ...STALLED,
            reset_pause_duration: 90,
            seconds_since_last_transition: 95,
          },
        });

        expect(result.current.isAgentStalled).toBe(false);
      });

      // Omenstrat pauses 30 s; the 2-minute floor still applies.
      it('holds a short-pause agent to the two-minute floor', () => {
        const { result } = renderWith({
          health: {
            ...STALLED,
            reset_pause_duration: 30,
            seconds_since_last_transition: 95,
          },
        });

        expect(result.current.isAgentStalled).toBe(false);
      });

      it('widens the bar for a service whose pause exceeds the floor', () => {
        const { result } = renderWith({
          health: {
            ...STALLED,
            reset_pause_duration: 300,
            seconds_since_last_transition: 290,
          },
        });

        expect(result.current.isAgentStalled).toBe(false);
        expect(result.current.agentHealth.announceThresholdMs).toBe(330_000);
      });

      it.each([
        ['at the bar', 120, false],
        ['just past the bar', 121, true],
      ])('treats a dwell %s', (_label, dwell, isStalled) => {
        const { result } = renderWith({
          health: { ...STALLED, seconds_since_last_transition: dwell },
        });

        expect(result.current.isAgentStalled).toBe(isStalled);
      });
    });

    // The ticket's own healthy run had a legitimate 16.5 s round.
    it('does not flag a slow round below the threshold', () => {
      const { result } = renderWith({
        health: {
          ...STALLED,
          rounds: ['polymarket_fetch_market_round'],
          seconds_since_last_transition: 17,
        },
      });

      expect(result.current.isAgentStalled).toBe(false);
    });

    // One case per arm of trader's `is_healthy = is_transitioning_fast or
    // waiting_for_a_mech_response`.
    describe('mech wait', () => {
      it.each([
        ['healthy and transitioning fast', true, true, true],
        ['healthy but not transitioning fast (mech wait)', true, false, false],
        ['unhealthy and not transitioning fast', false, false, true],
      ])(
        'past the bar, %s',
        (_label, isHealthy, isTransitioningFast, isStalled) => {
          const { result } = renderWith({
            health: {
              is_healthy: isHealthy,
              is_transitioning_fast: isTransitioningFast,
              seconds_since_last_transition: 300,
            },
          });

          expect(result.current.isAgentStalled).toBe(isStalled);
        },
      );
    });

    it('exposes the fields that separate a wedged agent from a stalled one', () => {
      const { result } = renderWith({
        health: { ...STALLED, is_tm_healthy: false },
      });

      expect(result.current.isAgentStalled).toBe(true);
      expect(result.current.agentHealth.isTmHealthy).toBe(false);
      expect(result.current.agentHealth.isHealthy).toBe(false);
      expect(result.current.agentHealth.secondsSinceLastTransition).toBe(300);
    });

    // "Not running" is the stronger claim, so the hook resolves the precedence
    // and no consumer can render both.
    it('does not flag a stall while liveness reports the process down', () => {
      const { result } = renderWith({
        health: STALLED,
        liveness: {
          is_alive: false,
          reason: 'agent_process_exited',
          consecutive_failures: 60,
        },
      });

      expect(result.current.isAgentStalled).toBe(false);
      expect(result.current.isAgentActive).toBe(false);
    });

    describe('healthcheck age', () => {
      it.each([
        ['younger than the bar', 5, true],
        ['exactly at the bar', 120, true],
        ['just past the bar', 121, false],
      ])('a reading %s', (_label, age, isStalled) => {
        const { result } = renderWith({
          health: { ...STALLED, age_seconds: age },
        });

        expect(result.current.isAgentStalled).toBe(isStalled);
      });

      // The incident's own shape: `/healthcheck` stops answering mid-round, so
      // the last body written holds a small dwell.
      it('does not flag a stall from a stale payload holding a small dwell', () => {
        const { result } = renderWith({
          health: {
            ...STALLED,
            seconds_since_last_transition: 4,
            age_seconds: 300,
          },
        });

        expect(result.current.isAgentStalled).toBe(false);
      });

      it('treats a missing age as fresh rather than as stale', () => {
        const { result } = renderWith({
          health: { ...STALLED, age_seconds: undefined },
        });

        expect(result.current.isAgentStalled).toBe(true);
      });
    });

    it.each([
      ['an empty body', {}],
      ['an error body', { error: 'Error reading healthcheck.json' }],
    ])('degrades %s to no stall', (_label, body) => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      setPayload({
        deploymentDetails: makeServiceDeployment({ healthcheck: body }),
      });
      const { result } = renderHook(() => useAgentActivity());

      expect(result.current.isAgentStalled).toBe(false);
    });

    it('logs an unreadable healthcheck', () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      setPayload({
        deploymentDetails: makeServiceDeployment({
          healthcheck: { error: 'Error reading healthcheck.json' },
        }),
      });
      renderHook(() => useAgentActivity());

      expect(consoleError).toHaveBeenCalledWith(
        'Agent healthcheck unreadable:',
        'Error reading healthcheck.json',
      );
    });

    // Pure function of the payload, so two surfaces reading the hook agree.
    it('clears once the agent transitions again, carrying nothing over', () => {
      const { result, rerender } = renderWith({ health: STALLED });
      expect(result.current.isAgentStalled).toBe(true);

      setPayload({
        deploymentDetails: makeServiceDeployment({
          healthcheck: makeAgentHealthCheck({
            ...STALLED,
            seconds_since_last_transition: 60,
          }),
        }),
      });
      rerender();

      expect(result.current.isAgentStalled).toBe(false);
    });

    // Every poll carries a fresh `healthcheck` object (its `age_seconds` is
    // recomputed per request), so stability must survive an equal new payload.
    it('keeps agentHealth referentially stable across equal payloads', () => {
      const { result, rerender } = renderWith({ health: STALLED });
      const first = result.current.agentHealth;

      setPayload({
        deploymentDetails: makeServiceDeployment({
          healthcheck: makeAgentHealthCheck({ ...STALLED, age_seconds: 5 }),
          agent_liveness: makeAgentLiveness(),
        }),
      });
      rerender();

      expect(result.current.agentHealth).toBe(first);
    });

    // Guards against a poll counter: the verdict must not depend on renders.
    it.each([1, 2, 12])(
      'reaches the same verdict from the same payload after %i render(s)',
      (renders) => {
        const { result, rerender } = renderWith({ health: STALLED });

        for (let i = 1; i < renders; i += 1) rerender();

        expect(result.current.isAgentStalled).toBe(true);
      },
    );
  });

  describe('agent_reported_unhealthy', () => {
    const REPORTED_UNHEALTHY = {
      is_alive: false,
      reason: 'agent_reported_unhealthy',
      consecutive_failures: 60,
    } as const;

    it('exposes the reason and the streak it decided from', () => {
      const { result } = renderWith({ liveness: REPORTED_UNHEALTHY });

      expect(result.current.agentHealth.livenessReason).toBe(
        'agent_reported_unhealthy',
      );
      expect(result.current.agentHealth.consecutiveFailures).toBe(60);
    });

    it('never reports the agent down, however many probes failed', () => {
      const { result } = renderWith({ liveness: REPORTED_UNHEALTHY });

      expect(result.current.isAgentActive).toBe(true);
    });

    // The payload's own dwell is stale and small, so only this route sees it.
    it('reaches the stall verdict where a frozen dwell cannot', () => {
      const { result } = renderWith({
        health: { seconds_since_last_transition: 4, age_seconds: 300 },
        liveness: REPORTED_UNHEALTHY,
      });

      expect(result.current.isAgentStalled).toBe(true);
    });

    it('is not silenced by a frozen payload from a mech wait', () => {
      const { result } = renderWith({
        health: {
          is_healthy: true,
          is_transitioning_fast: false,
          seconds_since_last_transition: 300,
          age_seconds: 300,
        },
        liveness: REPORTED_UNHEALTHY,
      });

      expect(result.current.isAgentStalled).toBe(true);
    });

    it.each([
      ['one short of the floor', 29, false],
      ['exactly at the floor', 30, true],
    ])(
      'applies the failure floor %s',
      (_label, consecutiveFailures, isStalled) => {
        const { result } = renderWith({
          liveness: {
            ...REPORTED_UNHEALTHY,
            consecutive_failures: consecutiveFailures,
          },
        });

        expect(result.current.isAgentStalled).toBe(isStalled);
      },
    );

    it('does not announce for a service that is not running', () => {
      const { result } = renderWith({
        liveness: REPORTED_UNHEALTHY,
        deploymentStatus: MiddlewareDeploymentStatusMap.STOPPED,
      });

      expect(result.current.isAgentStalled).toBe(false);
    });
  });

  describe('redeploy derivation', () => {
    it('reports a redeploy when the middleware has restarted the agent', () => {
      const { result } = renderWith({
        health: { rounds: [] },
        liveness: {
          is_alive: false,
          reason: 'agent_unresponsive',
          consecutive_failures: 12,
          restarts_since_last_healthy: 1,
        },
      });

      expect(result.current.isAgentRedeploying).toBe(true);
    });

    // Same status, same empty round list, no restart behind it.
    it('does not report a redeploy for a slow first poll', () => {
      const { result } = renderWith({
        health: { rounds: [] },
        liveness: { restarts_since_last_healthy: 0 },
      });

      expect(result.current.isAgentRedeploying).toBe(false);
    });

    it.each([
      ['an absent counter', { restarts_since_last_healthy: undefined }],
      ['an absent liveness object', null],
    ])('does not report a redeploy from %s', (_label, liveness) => {
      const { result } = renderWith({ health: { rounds: [] }, liveness });

      expect(result.current.isAgentRedeploying).toBe(false);
    });

    it('does not report a redeploy for a service that is not running', () => {
      const { result } = renderWith({
        health: { rounds: [] },
        liveness: { restarts_since_last_healthy: 3 },
        deploymentStatus: MiddlewareDeploymentStatusMap.STOPPED,
      });

      expect(result.current.isAgentRedeploying).toBe(false);
    });
  });

  it('returns both flags false when deploymentStatus is undefined on the service', () => {
    mockUseServices.mockReturnValue({
      selectedService: makeService({ deploymentStatus: undefined }),
      deploymentDetails: undefined,
    });

    const { result } = renderHook(() => useAgentActivity());

    expect(result.current.isServiceRunning).toBe(false);
    expect(result.current.isServiceDeploying).toBe(false);
  });
});
