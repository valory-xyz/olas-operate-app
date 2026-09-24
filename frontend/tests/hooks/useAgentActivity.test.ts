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

describe('useAgentActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    const renderWithLiveness = (
      liveness: Parameters<typeof makeAgentLiveness>[0] | null,
    ) => {
      mockUseServices.mockReturnValue({
        selectedService: makeService({
          deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
        }),
        deploymentDetails:
          liveness === null
            ? mockDeploymentDetails
            : makeServiceDeployment({
                agent_liveness: makeAgentLiveness(liveness),
              }),
      });
      return renderHook(() => useAgentActivity());
    };

    it('reports the agent inactive when the process has been gone for a while', () => {
      // The reported symptom: an evicted agent whose process died, while the
      // middleware still reports the deployment as DEPLOYED.
      const { result } = renderWithLiveness({
        is_alive: false,
        reason: 'agent_process_exited',
        consecutive_failures: 60,
      });

      expect(result.current.isAgentActive).toBe(false);
      // `isServiceRunning` stays deployment-only so Staking.tsx can't end up
      // telling the user to start an agent whose button reads "Stop agent".
      expect(result.current.isServiceRunning).toBe(true);
    });

    it('reports the agent inactive when unresponsive for a while', () => {
      const { result } = renderWithLiveness({
        is_alive: false,
        reason: 'agent_unresponsive',
        consecutive_failures: 60,
      });

      expect(result.current.isAgentActive).toBe(false);
    });

    // Regression, OPE-1920 follow-up: the agent answers HTTP 425 ("Too Early")
    // while starting up, which the middleware counts as an unhealthy probe and
    // which flips `is_alive` false on the very first one. Believing that
    // rendered "Agent is not running" under a "Pause" button.
    it('does not report a starting agent down across the longest observed window', () => {
      // 12 consecutive failures is the worst unhealthy stretch measured on a
      // real capture for an agent that was perfectly fine (56 s of HTTP 425
      // while it started). An earlier floor of 12 would have tripped on it.
      const { result } = renderWithLiveness({
        is_alive: false,
        reason: 'agent_unresponsive',
        consecutive_failures: 12,
      });

      expect(result.current.isAgentActive).toBe(true);
    });

    it('does not report down on a single failed probe', () => {
      const { result } = renderWithLiveness({
        is_alive: false,
        reason: 'agent_process_exited',
        consecutive_failures: 1,
      });

      expect(result.current.isAgentActive).toBe(true);
    });

    // Not probe-derived — the middleware stopped the service itself because it
    // could not clear an on-chain eviction, so there is nothing to wait out.
    it('reports down immediately for an uncleared eviction', () => {
      const { result } = renderWithLiveness({
        is_alive: false,
        reason: 'evicted_cannot_restake',
        consecutive_failures: 0,
      });

      expect(result.current.isAgentActive).toBe(false);
    });

    // The middleware reports `not_monitored` when it holds no health-check
    // record and its PID-name probe misses — unknown, not dead.
    it('treats not_monitored as unknown, however many probes failed', () => {
      const { result } = renderWithLiveness({
        is_alive: false,
        reason: 'not_monitored',
        consecutive_failures: 60,
      });

      expect(result.current.isAgentActive).toBe(true);
    });

    it('returns isAgentActive=true when DEPLOYED and the agent is alive', () => {
      const { result } = renderWithLiveness({});

      expect(result.current.isAgentActive).toBe(true);
    });

    it('treats absent liveness as unknown, not as not-alive', () => {
      // Pearl ships against older middleware builds. Inverting this default
      // would read "Agent is not running" for every healthy agent.
      const { result } = renderWithLiveness(null);

      expect(result.current.isAgentActive).toBe(true);
    });
  });

  describe('stall derivation', () => {
    // Thin wrappers over the shared factory: only the health fields a case
    // turns on are named, everything else stays the factory's default.
    // `setHealth` is separate from `renderWithHealth` so that a case can feed
    // a *second* payload to the *same* hook instance — which is the only way
    // to exercise the verdict held across the band between the two bars.
    const setHealth = (
      health: Parameters<typeof makeAgentHealthCheck>[0] = {},
      { isAlive = true }: { isAlive?: boolean } = {},
    ) => {
      mockUseServices.mockReturnValue({
        selectedService: makeService({
          deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
        }),
        deploymentDetails: makeServiceDeployment({
          healthcheck: makeAgentHealthCheck(health),
          agent_liveness: makeAgentLiveness(
            isAlive
              ? {}
              : {
                  is_alive: false,
                  reason: 'agent_process_exited',
                  consecutive_failures: 60,
                },
          ),
        }),
      });
    };

    const renderWithHealth = (
      ...args: Parameters<typeof setHealth>
    ): ReturnType<
      typeof renderHook<ReturnType<typeof useAgentActivity>, never>
    > => {
      setHealth(...args);
      return renderHook(() => useAgentActivity());
    };

    describe('the threshold reads the service its own pause duration', () => {
      // Polystrat pauses 90 s between trading cycles, so 95 s of dwell is a
      // legitimate pause, not a stall. Pair this with the case below — a flat
      // 120 s threshold also passes this one.
      it('does not flag a Polystrat agent inside its own reset pause', () => {
        const { result } = renderWithHealth({
          reset_pause_duration: 90,
          seconds_since_last_transition: 95,
        });

        expect(result.current.isAgentStalled).toBe(false);
      });

      // Omenstrat pauses 30 s, so its threshold is the 2-minute floor rather
      // than `reset_pause_duration + margin` (60 s).
      //
      // NOTE(OPE-1941): the technical scope is internally inconsistent here.
      // Its hard-constraint list, its Section 5 and 7 prose and the
      // reviewer's recorded Q4 answer all give the rule as
      // `max(2 * ONE_MINUTE_INTERVAL, reset_pause_duration + margin)`, which
      // cannot produce a threshold below 120 s and so cannot stall at 95 s.
      // Its Section 9 test brief asks for the opposite — that this case *does*
      // stall, "which a flat 120 s threshold fails". Implemented per the
      // hard constraint, which is the decided rule and is stated four times;
      // this test pins what that rule actually does. Flagged for a human: if
      // the floor is meant to be a per-service value rather than a floor, both
      // this test and the constant change together.
      it('holds a short-pause agent to the two-minute floor', () => {
        const { result } = renderWithHealth({
          reset_pause_duration: 30,
          seconds_since_last_transition: 95,
        });

        expect(result.current.isAgentStalled).toBe(false);
      });

      // The case that distinguishes reading the field from hardcoding 120 s:
      // a template raising RESET_PAUSE_DURATION past the floor must widen the
      // bar, not flag the agent for every one of its normal pauses.
      it('widens the bar for a service whose pause exceeds the floor', () => {
        const { result } = renderWithHealth({
          reset_pause_duration: 300,
          seconds_since_last_transition: 290,
        });

        expect(result.current.isAgentStalled).toBe(false);
        expect(result.current.agentHealth.announceThresholdMs).toBe(330_000);
      });
    });

    it('does not flag a healthy agent that is transitioning', () => {
      const { result } = renderWithHealth({
        rounds: ['polymarket_fetch_market_round'],
        seconds_since_last_transition: 17,
      });

      expect(result.current.isAgentStalled).toBe(false);
    });

    // The reported incident: unhealthy, Tendermint fine, no transition for
    // five minutes, while the strip rendered the frozen round list.
    it('flags an agent that has not transitioned past the threshold', () => {
      const { result } = renderWithHealth({
        is_healthy: false,
        is_tm_healthy: true,
        is_transitioning_fast: false,
        rounds: ['polymarket_fetch_market_round'],
        seconds_since_last_transition: 300,
      });

      expect(result.current.isAgentStalled).toBe(true);
    });

    // A wedged Tendermint is a different fault with the same dwell. The
    // verdict is the same; the fields are what let a consumer say so.
    it('exposes the fields that separate a wedged agent from a stalled one', () => {
      const { result } = renderWithHealth({
        is_healthy: false,
        is_tm_healthy: false,
        seconds_since_last_transition: 300,
      });

      expect(result.current.isAgentStalled).toBe(true);
      expect(result.current.agentHealth.isTmHealthy).toBe(false);
      expect(result.current.agentHealth.isHealthy).toBe(false);
      expect(result.current.agentHealth.secondsSinceLastTransition).toBe(300);
    });

    // The ticket's own healthy run had a legitimate 16.5 s round.
    it('does not flag a slow round below the threshold', () => {
      const { result } = renderWithHealth({
        is_healthy: false,
        seconds_since_last_transition: 17,
      });

      expect(result.current.isAgentStalled).toBe(false);
    });

    // The verdict is independent of `agent_liveness`, which is what keeps it
    // reachable. The probe failures that make up a stall are the same ones
    // that drive `is_alive` false -- at the pinned middleware an HTTP 200
    // answer carrying `is_healthy: false` is a failed probe just like an
    // unreachable port -- so gating on liveness would have retired the verdict
    // at ~150 s of continuous stall, and left it unreachable altogether for a
    // service whose pause pushes its threshold past that. A consumer
    // rendering both resolves the precedence itself.
    it('still flags a stall while liveness reports the process down', () => {
      const { result } = renderWithHealth(
        { seconds_since_last_transition: 300 },
        { isAlive: false },
      );

      expect(result.current.isAgentStalled).toBe(true);
      expect(result.current.isAgentActive).toBe(false);
    });

    // The genuinely dead agent is excluded by the freshness guard rather than
    // by liveness: it stops answering, so the middleware stops rewriting
    // `healthcheck.json` and every field on it -- the dwell included -- ages.
    it('does not flag a stall from a healthcheck older than the bar', () => {
      const { result } = renderWithHealth({
        seconds_since_last_transition: 300,
        age_seconds: 200,
      });

      expect(result.current.isAgentStalled).toBe(false);
    });

    // The incident's own shape: `/healthcheck` stops answering mid-round, so
    // the last body written holds the small dwell taken just after the round
    // started. Believing it would keep the strip reporting normal operation
    // for the whole outage -- which is what the operator watched it do.
    it('does not flag a stall from a stale payload holding a small dwell', () => {
      const { result } = renderWithHealth({
        seconds_since_last_transition: 4,
        age_seconds: 300,
      });

      expect(result.current.isAgentStalled).toBe(false);
    });

    // A reading taken within the bar still describes the window being judged.
    it('flags a stall from a reading younger than the bar', () => {
      const { result } = renderWithHealth({
        seconds_since_last_transition: 300,
        age_seconds: 5,
      });

      expect(result.current.isAgentStalled).toBe(true);
    });

    // Middleware older than 0.15.40 omits `age_seconds`. Reading its absence
    // as "stale" would disable the derivation outright on those builds.
    it('treats a missing age as fresh rather than as stale', () => {
      const { result } = renderWithHealth({
        seconds_since_last_transition: 300,
        age_seconds: undefined,
      });

      expect(result.current.isAgentStalled).toBe(true);
    });

    describe('clearing', () => {
      it('clears once the agent transitions again', () => {
        const { result, rerender } = renderWithHealth({
          seconds_since_last_transition: 300,
        });
        expect(result.current.isAgentStalled).toBe(true);

        setHealth({ seconds_since_last_transition: 2 });
        rerender();

        expect(result.current.isAgentStalled).toBe(false);
      });

      // The verdict carries nothing over from the previous payload. This is
      // what lets two surfaces read the hook independently and still agree:
      // an alert mounted mid-stall and a strip mounted before it see the same
      // answer, because the answer is a function of the payload and nothing
      // else.
      //
      // NOTE(OPE-1941): the technical scope also specifies a second, lower
      // bar — "clear after THIRTY_SECONDS_INTERVAL of continuous health" —
      // which is not implemented, because it cannot be as specified. Holding a
      // verdict across payloads needs state; per-hook-instance state lets the
      // two surfaces disagree, which the scope forbids as a hard constraint,
      // and the shared state that would fix it is a new provider, which the
      // scope also rules out. Left for a human: in practice dwell has to climb
      // back over the announce bar before the indicator can return, so the
      // shortest possible cycle is already ~2 minutes, not a flicker.
      it('carries nothing over from the previous payload', () => {
        const { result, rerender } = renderWithHealth({
          seconds_since_last_transition: 300,
        });
        expect(result.current.isAgentStalled).toBe(true);

        setHealth({ seconds_since_last_transition: 60 });
        rerender();

        expect(result.current.isAgentStalled).toBe(false);

        const fresh = renderWithHealth({ seconds_since_last_transition: 60 });
        expect(fresh.result.current.isAgentStalled).toBe(false);
      });
    });

    // `agentHealth` is the only non-primitive this hook builds itself, so it is
    // the only one a consumer can accidentally put in a dependency array and
    // get a memo that never memoises.
    it('keeps agentHealth referentially stable across renders', () => {
      const { result, rerender } = renderWithHealth({
        seconds_since_last_transition: 300,
      });
      const first = result.current.agentHealth;

      rerender();

      expect(result.current.agentHealth).toBe(first);
    });

    // The query carrying the healthcheck polls at 5 s, 15 s or 50 s with a
    // deployment active, 15/45/150 s without one, and stops entirely when it
    // is not in a `success` state. The verdict must be a function of the
    // payload alone — this is the guard against anyone reintroducing a poll
    // counter, and the no-re-render case is the one that would catch it.
    it.each([
      ['one render', 1],
      ['a few renders', 2],
      ['many renders', 12],
    ])(
      'reaches the same verdict from the same payload (%s)',
      (_label, renders) => {
        const { result, rerender } = renderWithHealth({
          seconds_since_last_transition: 300,
        });

        for (let i = 1; i < renders; i += 1) rerender();

        expect(result.current.isAgentStalled).toBe(true);
      },
    );
  });

  // The middleware's own name for this condition, incoming from
  // `olas-operate-middleware#481`: the agent answered the probe, promptly and
  // well-formed, and reported itself unhealthy. It is the one reason in that
  // vocabulary where the process is demonstrably up, so it must route to the
  // stall treatment and never to the down treatment. Pinned now so the
  // distinction cannot be lost when the middleware side merges.
  describe('agent_reported_unhealthy', () => {
    const renderWithReason = (
      liveness: Parameters<typeof makeAgentLiveness>[0],
      health: Parameters<typeof makeAgentHealthCheck>[0] = {},
    ) => {
      mockUseServices.mockReturnValue({
        selectedService: makeService({
          deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
        }),
        deploymentDetails: makeServiceDeployment({
          healthcheck: makeAgentHealthCheck(health),
          agent_liveness: makeAgentLiveness(liveness),
        }),
      });
      return renderHook(() => useAgentActivity());
    };

    it('never reports the agent down, however many probes failed', () => {
      const { result } = renderWithReason({
        is_alive: false,
        reason: 'agent_reported_unhealthy',
        consecutive_failures: 60,
      });

      expect(result.current.isAgentActive).toBe(true);
    });

    // The route that matters: the payload's own dwell is stale and small, so
    // the dwell rule cannot see the stall. The middleware's conclusion can.
    it('reaches the stall verdict where a frozen dwell cannot', () => {
      const { result } = renderWithReason(
        {
          is_alive: false,
          reason: 'agent_reported_unhealthy',
          consecutive_failures: 60,
        },
        { seconds_since_last_transition: 4, age_seconds: 300 },
      );

      expect(result.current.isAgentStalled).toBe(true);
    });

    // On the same evidence floor as any other probe-derived reason: the reason
    // flips on the *first* failed probe, and announcing five seconds into one
    // would cry wolf on every transient blip.
    it('does not announce on a short streak of failed probes', () => {
      const { result } = renderWithReason({
        is_alive: false,
        reason: 'agent_reported_unhealthy',
        consecutive_failures: 1,
      });

      expect(result.current.isAgentStalled).toBe(false);
    });

    // A stopped service is not stalled, whatever a leftover record says.
    it('does not announce for a service that is not running', () => {
      mockUseServices.mockReturnValue({
        selectedService: makeService({
          deploymentStatus: MiddlewareDeploymentStatusMap.STOPPED,
        }),
        deploymentDetails: makeServiceDeployment({
          agent_liveness: makeAgentLiveness({
            is_alive: false,
            reason: 'agent_reported_unhealthy',
            consecutive_failures: 60,
          }),
        }),
      });

      const { result } = renderHook(() => useAgentActivity());

      expect(result.current.isAgentStalled).toBe(false);
    });
  });

  // The redeploy case. A middleware-forced restart leaves the deployment
  // reporting DEPLOYED with an empty round list, which is indistinguishable
  // from an agent that has not answered its first probe yet -- so the strip
  // claimed "Agent is running" at the one moment it certainly was not. The
  // restart counter is the only field that separates the two.
  describe('redeploy derivation', () => {
    const renderWithRestarts = (
      liveness: Parameters<typeof makeAgentLiveness>[0] | null,
      deploymentStatus: MiddlewareDeploymentStatus = MiddlewareDeploymentStatusMap.DEPLOYED,
    ) => {
      mockUseServices.mockReturnValue({
        selectedService: makeService({ deploymentStatus }),
        deploymentDetails: makeServiceDeployment({
          healthcheck: makeAgentHealthCheck({ rounds: [] }),
          agent_liveness:
            liveness === null ? undefined : makeAgentLiveness(liveness),
        }),
      });
      return renderHook(() => useAgentActivity());
    };

    it('reports a redeploy when the middleware has restarted the agent', () => {
      const { result } = renderWithRestarts({
        is_alive: false,
        reason: 'agent_unresponsive',
        consecutive_failures: 60,
        restarts_since_last_healthy: 1,
      });

      expect(result.current.isAgentRedeploying).toBe(true);
    });

    // The ambiguity this counter resolves: same status, same empty round list,
    // no restart behind it.
    it('does not report a redeploy for a slow first poll', () => {
      const { result } = renderWithRestarts({ restarts_since_last_healthy: 0 });

      expect(result.current.isAgentRedeploying).toBe(false);
    });

    // Middleware older than 0.15.40 omits the field, and so does a payload
    // with no liveness object at all. Absent must read as "no restart", not as
    // a restart of unknown count.
    it.each([
      ['an absent counter', { restarts_since_last_healthy: undefined }],
      ['an absent liveness object', null],
    ])('does not report a redeploy from %s', (_label, liveness) => {
      const { result } = renderWithRestarts(liveness);

      expect(result.current.isAgentRedeploying).toBe(false);
    });

    // A stopped service is not redeploying, and the counter survives the stop.
    it('does not report a redeploy for a service that is not running', () => {
      const { result } = renderWithRestarts(
        { restarts_since_last_healthy: 3 },
        MiddlewareDeploymentStatusMap.STOPPED,
      );

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
