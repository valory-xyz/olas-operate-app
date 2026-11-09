import {
  hasAnsweredSinceStart,
  observeAgentLiveness,
} from '../../context/agentAnsweredLatch';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeAgentLiveness,
  MOCK_SERVICE_CONFIG_ID_2,
} from '../helpers/factories';

const ID = DEFAULT_SERVICE_CONFIG_ID;

const deployed = (liveness: Parameters<typeof makeAgentLiveness>[0]) => ({
  isDeployed: true,
  liveness: makeAgentLiveness({ last_healthy_at: null, ...liveness }),
});

const ANSWERED = deployed({
  is_alive: false,
  reason: 'agent_reported_unhealthy',
  consecutive_failures: 3,
});
const failingAt = (consecutive_failures: number) =>
  deployed({
    is_alive: false,
    reason: 'agent_unresponsive',
    consecutive_failures,
  });

describe('agentAnsweredLatch', () => {
  beforeEach(() => {
    [ID, MOCK_SERVICE_CONFIG_ID_2].forEach((id) =>
      observeAgentLiveness(id, { isDeployed: false, liveness: undefined }),
    );
  });

  it('counts the current answer before any poll is observed', () => {
    expect(hasAnsweredSinceStart(ID, ANSWERED)).toBe(true);
  });

  it('does not count failing probes that were never preceded by an answer', () => {
    expect(hasAnsweredSinceStart(ID, failingAt(4))).toBe(false);
  });

  it('keeps an observed answer through later failed probes', () => {
    observeAgentLiveness(ID, ANSWERED);

    expect(hasAnsweredSinceStart(ID, failingAt(4))).toBe(true);
  });

  it('keeps the answer per service', () => {
    observeAgentLiveness(ID, ANSWERED);

    expect(hasAnsweredSinceStart(MOCK_SERVICE_CONFIG_ID_2, failingAt(4))).toBe(
      false,
    );
  });

  it('does not record an answer seen while the service is not deployed', () => {
    observeAgentLiveness(ID, { ...ANSWERED, isDeployed: false });

    expect(hasAnsweredSinceStart(ID, failingAt(4))).toBe(false);
  });

  it('forgets the answer once the service is seen not deployed', () => {
    observeAgentLiveness(ID, ANSWERED);
    observeAgentLiveness(ID, { isDeployed: false, liveness: undefined });

    expect(hasAnsweredSinceStart(ID, failingAt(4))).toBe(false);
  });

  // A start the app never saw as a status: the new record's count restarts
  // below the stored one, then climbs past it while the agent boots.
  it('forgets the answer once a fresh record is seen, even after its count climbs past', () => {
    observeAgentLiveness(ID, ANSWERED);
    observeAgentLiveness(ID, failingAt(1));
    observeAgentLiveness(ID, failingAt(4));

    expect(hasAnsweredSinceStart(ID, failingAt(4))).toBe(false);
  });

  // Every failed probe after the answer raises the count, so an equal count
  // from a failed probe can only come from a fresh record.
  it('treats an equal count that is not an answer as a new start', () => {
    observeAgentLiveness(ID, ANSWERED);

    expect(hasAnsweredSinceStart(ID, failingAt(3))).toBe(false);
  });

  it('keeps the answer when the same answer is polled again', () => {
    observeAgentLiveness(ID, ANSWERED);
    observeAgentLiveness(ID, ANSWERED);

    expect(hasAnsweredSinceStart(ID, failingAt(4))).toBe(true);
  });

  it('treats a lower count on read as a new start', () => {
    observeAgentLiveness(ID, ANSWERED);

    expect(hasAnsweredSinceStart(ID, failingAt(1))).toBe(false);
  });

  it('is never answered while the service is not deployed', () => {
    expect(hasAnsweredSinceStart(ID, { ...ANSWERED, isDeployed: false })).toBe(
      false,
    );
  });
});
