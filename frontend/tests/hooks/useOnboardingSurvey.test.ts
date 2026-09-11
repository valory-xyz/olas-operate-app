import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';

import { ONBOARDING_SURVEY_EXPIRY_MS } from '../../components/OnboardingSurvey/constants';
import { AgentMap, AgentType } from '../../constants/agent';
import { useOnboardingSurvey } from '../../hooks/useOnboardingSurvey';
import { PearlStore } from '../../types/ElectronApi';
import {
  makeOnboardingSurveyState,
  makePearlStore,
} from '../helpers/factories';
import { createQueryClientWrapper } from '../helpers/queryClient';

const mockStoreSet = jest.fn();
const mockStoreGet = jest.fn();
const mockGetAppVersion = jest.fn();
const mockGetOsInfo = jest.fn();
const mockUseStore = jest.fn();
const mockUseServices = jest.fn();
const mockUseOnlineStatus = jest.fn();
const mockSubmit = jest.fn();

jest.mock('../../hooks/useElectronApi', () => ({
  useElectronApi: () => ({
    store: { set: mockStoreSet, get: mockStoreGet },
    getAppVersion: mockGetAppVersion,
    getOsInfo: mockGetOsInfo,
  }),
}));
jest.mock('../../hooks/useStore', () => ({ useStore: () => mockUseStore() }));
jest.mock('../../hooks/useServices', () => ({
  useServices: () => mockUseServices(),
}));
jest.mock('../../hooks/useOnlineStatus', () => ({
  useOnlineStatusContext: () => mockUseOnlineStatus(),
}));
jest.mock('../../service/OnboardingSurvey', () => ({
  OnboardingSurveyService: {
    submit: (...args: unknown[]) => mockSubmit(...args),
  },
}));

const OS_INFO = {
  type: 'Darwin',
  platform: 'darwin',
  arch: 'arm64',
  release: '24.3.0',
};

const FIRST_OPENED_AT = '2026-01-01T00:00:00.000Z';
const NOW = Date.parse('2026-01-02T02:00:00.000Z'); // 1 day 2 hours later

type SetupOptions = {
  services?: unknown[];
  isFetched?: boolean;
  selectedAgentType?: AgentType;
  isOnline?: boolean;
};

const setup = (
  storeState: PearlStore | undefined,
  options: SetupOptions = {},
) => {
  const {
    isFetched = true,
    selectedAgentType = AgentMap.Polystrat,
    isOnline = true,
  } = options;
  // `undefined` is a meaningful value for `services` (nothing was fetched), so it only defaults
  // to an empty list when the key is absent — a destructuring default would swallow it.
  const services = 'services' in options ? options.services : [];

  mockUseStore.mockReturnValue({ storeState });
  mockUseServices.mockReturnValue({
    services,
    isFetched,
    selectedAgentType,
  });
  mockUseOnlineStatus.mockReturnValue({ isOnline });

  return renderHook(() => useOnboardingSurvey(), {
    wrapper: createQueryClientWrapper(),
  });
};

const surveyWrites = () =>
  mockStoreSet.mock.calls.filter(([key]: [string]) =>
    key.startsWith('onboardingSurvey'),
  );

/**
 * A new account whose first reward has just been detected: classified as new by
 * `useOnboardingSurveyTiming`, with the earning agent recorded by RewardProvider.
 */
const makeNewAccountWithReward = (
  survey: Partial<PearlStore['onboardingSurvey']> = {},
  rest: Partial<PearlStore> = {},
) =>
  makePearlStore({
    firstStakingRewardAchieved: true,
    firstStakingRewardAgentType: AgentMap.Polystrat,
    onboardingSurvey: makeOnboardingSurveyState({
      timingUnavailable: false,
      ...survey,
    }),
    ...rest,
  });

const writeFor = (key: string) =>
  mockStoreSet.mock.calls.find(([k]: [string]) => k === key);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  mockGetAppVersion.mockResolvedValue('0.9.4');
  mockGetOsInfo.mockResolvedValue(OS_INFO);
  mockStoreGet.mockResolvedValue(FIRST_OPENED_AT);
  mockSubmit.mockResolvedValue({ success: true });
});

afterEach(() => jest.restoreAllMocks());

describe('useOnboardingSurvey', () => {
  describe('staking trigger', () => {
    it('opens the modal and records the trigger when the first reward is earned', async () => {
      const { result } = setup(makeNewAccountWithReward());

      await waitFor(() => expect(result.current.isModalOpen).toBe(true));
      expect(writeFor('onboardingSurvey.firstShownAt')).toBeDefined();
      expect(writeFor('onboardingSurvey.agentType')?.[1]).toBe(
        AgentMap.Polystrat,
      );
    });

    it('does nothing before the store has hydrated', () => {
      const { result } = setup(undefined);

      expect(result.current.isModalOpen).toBe(false);
      expect(surveyWrites()).toHaveLength(0);
    });

    it('does not fire when the survey was already shown', () => {
      const { result } = setup(
        makeNewAccountWithReward({
          firstShownAt: new Date(NOW - 1000).toISOString(),
        }),
      );

      expect(result.current.isModalOpen).toBe(false);
      expect(writeFor('onboardingSurvey.firstShownAt')).toBeUndefined();
    });

    it('does not fire when the survey was already completed', () => {
      const { result } = setup(makeNewAccountWithReward({ completed: true }));

      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.showFeedbackAlert).toBe(false);
    });

    it('never shows an account that predates the feature', () => {
      // The functional scope excludes a retroactive trigger: a pre-existing account keeps its
      // flag but the questionnaire must not appear on the first launch after the update.
      const { result } = setup(
        makeNewAccountWithReward({ timingUnavailable: true }),
      );

      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.showFeedbackAlert).toBe(false);
      expect(writeFor('onboardingSurvey.firstShownAt')).toBeUndefined();
    });

    it('does not arm until the account has been classified', () => {
      const { result } = setup(
        makeNewAccountWithReward({ timingUnavailable: undefined }),
      );

      expect(result.current.isModalOpen).toBe(false);
      expect(writeFor('onboardingSurvey.firstShownAt')).toBeUndefined();
    });

    it('does not arm on a flag written without the earning agent', () => {
      // Only builds before this feature wrote the flag alone; such an account predates it.
      const { result } = setup(
        makeNewAccountWithReward(
          {},
          { firstStakingRewardAgentType: undefined },
        ),
      );

      expect(result.current.isModalOpen).toBe(false);
      expect(writeFor('onboardingSurvey.firstShownAt')).toBeUndefined();
    });

    it('records the agent that earned the reward, not the one selected now', async () => {
      // RewardProvider writes the earning agent alongside the flag; the user has since switched.
      const { result } = setup(
        makeNewAccountWithReward(
          {},
          { firstStakingRewardAgentType: AgentMap.Modius },
        ),
        { selectedAgentType: AgentMap.Polystrat },
      );

      await waitFor(() => expect(result.current.isModalOpen).toBe(true));
      expect(writeFor('onboardingSurvey.agentType')?.[1]).toBe(AgentMap.Modius);
    });

    it('arms only once when several consumers mount the hook', async () => {
      mockUseStore.mockReturnValue({
        storeState: makeNewAccountWithReward(),
      });
      mockUseServices.mockReturnValue({
        services: [],
        isFetched: true,
        selectedAgentType: AgentMap.Polystrat,
      });
      mockUseOnlineStatus.mockReturnValue({ isOnline: true });

      const wrapper = createQueryClientWrapper();
      // Main, Sidebar and Home each mount their own instance against one cache.
      renderHook(
        () => {
          useOnboardingSurvey();
          useOnboardingSurvey();
          useOnboardingSurvey();
        },
        { wrapper },
      );

      await waitFor(() =>
        expect(writeFor('onboardingSurvey.firstShownAt')).toBeDefined(),
      );
      expect(
        mockStoreSet.mock.calls.filter(
          ([key]: [string]) => key === 'onboardingSurvey.firstShownAt',
        ),
      ).toHaveLength(1);
    });
  });

  describe('Connect trigger', () => {
    const newConnectAccount = makePearlStore({
      onboardingSurvey: makeOnboardingSurveyState({ timingUnavailable: false }),
    });

    it('opens the modal when Home reports the Profile visit', async () => {
      const { result } = setup(newConnectAccount, {
        selectedAgentType: AgentMap.Connect,
      });

      act(() => result.current.reportConnectProfileVisit());

      await waitFor(() => expect(result.current.isModalOpen).toBe(true));
      expect(writeFor('onboardingSurvey.agentType')?.[1]).toBe(
        AgentMap.Connect,
      );
    });

    it('ignores the Profile visit for a non-Connect agent', () => {
      const { result } = setup(newConnectAccount, {
        selectedAgentType: AgentMap.Polystrat,
      });

      act(() => result.current.reportConnectProfileVisit());

      expect(result.current.isModalOpen).toBe(false);
      expect(writeFor('onboardingSurvey.firstShownAt')).toBeUndefined();
      expect(writeFor('onboardingSurvey.agentType')).toBeUndefined();
    });

    it('ignores the Profile visit for an account that predates the feature', () => {
      const { result } = setup(
        makePearlStore({
          onboardingSurvey: makeOnboardingSurveyState({
            timingUnavailable: true,
          }),
        }),
        { selectedAgentType: AgentMap.Connect },
      );

      act(() => result.current.reportConnectProfileVisit());

      expect(result.current.isModalOpen).toBe(false);
      expect(writeFor('onboardingSurvey.firstShownAt')).toBeUndefined();
    });

    it('does not re-trigger for a second Connect instance', () => {
      // A second instance completing its first run leaves connect.firstRunCompleted with a new
      // entry — which must not matter, because the gate is the survey state alone.
      const { result } = setup(
        makePearlStore({
          connect: {
            isInitialFunded: {},
            firstRunCompleted: { a: true, b: true },
          },
          onboardingSurvey: makeOnboardingSurveyState({
            firstShownAt: new Date(NOW - 1000).toISOString(),
            dismissed: true,
          }),
        }),
        { selectedAgentType: AgentMap.Connect },
      );

      act(() => result.current.reportConnectProfileVisit());

      expect(result.current.isModalOpen).toBe(false);
      expect(writeFor('onboardingSurvey.firstShownAt')).toBeUndefined();
    });
  });

  describe('dismissal and the feedback alert', () => {
    it('dismissing closes the modal, records it and shows the feedback alert', async () => {
      const { result } = setup(makeNewAccountWithReward());
      await waitFor(() => expect(result.current.isModalOpen).toBe(true));

      act(() => result.current.dismiss());

      expect(writeFor('onboardingSurvey.dismissed')?.[1]).toBe(true);
      await waitFor(() => expect(result.current.isModalOpen).toBe(false));
    });

    it('does not reopen the modal on the next launch — only the feedback alert persists', () => {
      const { result } = setup(
        makePearlStore({
          firstStakingRewardAchieved: true,
          onboardingSurvey: makeOnboardingSurveyState({
            firstShownAt: new Date(NOW - 1000).toISOString(),
            dismissed: true,
          }),
        }),
      );

      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.showFeedbackAlert).toBe(true);
    });

    it('the feedback alert reopens the modal without rewriting firstShownAt', async () => {
      const { result } = setup(
        makePearlStore({
          onboardingSurvey: makeOnboardingSurveyState({
            firstShownAt: new Date(NOW - 1000).toISOString(),
            dismissed: true,
          }),
        }),
      );

      act(() => result.current.open());

      await waitFor(() => expect(result.current.isModalOpen).toBe(true));
      expect(writeFor('onboardingSurvey.firstShownAt')).toBeUndefined();
    });

    it('hides the feedback alert once the survey is completed', () => {
      const { result } = setup(
        makePearlStore({
          onboardingSurvey: makeOnboardingSurveyState({
            firstShownAt: new Date(NOW - 1000).toISOString(),
            completed: true,
          }),
        }),
      );

      expect(result.current.showFeedbackAlert).toBe(false);
    });
  });

  describe('two-week expiry', () => {
    const shownDaysAgo = (days: number) =>
      new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();

    it('still shows the feedback alert at 13 days', () => {
      const { result } = setup(
        makePearlStore({
          onboardingSurvey: makeOnboardingSurveyState({
            firstShownAt: shownDaysAgo(13),
            dismissed: true,
          }),
        }),
      );

      expect(result.current.showFeedbackAlert).toBe(true);
    });

    it('removes the feedback alert and blocks reopening at 15 days', () => {
      const { result } = setup(
        makePearlStore({
          onboardingSurvey: makeOnboardingSurveyState({
            firstShownAt: shownDaysAgo(15),
            dismissed: true,
          }),
        }),
      );

      expect(result.current.showFeedbackAlert).toBe(false);

      act(() => result.current.open());

      // Reopening an expired survey is a no-op, so nothing to wait for.
      expect(result.current.isModalOpen).toBe(false);
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('uses the scoped window rather than an ad-hoc number', () => {
      expect(ONBOARDING_SURVEY_EXPIRY_MS).toBe(14 * 24 * 60 * 60 * 1000);
    });
  });

  describe('submission', () => {
    const shownAt = new Date(NOW - 42_000).toISOString();

    const setupForSubmit = (survey = {}) =>
      setup(
        makePearlStore({
          onboardingSurvey: makeOnboardingSurveyState({
            firstShownAt: shownAt,
            agentType: AgentMap.Polystrat,
            timingUnavailable: false,
            ...survey,
          }),
        }),
        { selectedAgentType: AgentMap.PredictTrader },
      );

    it('sends null while the timing classification is still pending', async () => {
      // `timingUnavailable` is undefined until services have fetched; an unclassified account
      // must not report a duration measured from a possibly meaningless stamp.
      const { result } = setupForSubmit({ timingUnavailable: undefined });

      await act(async () => {
        await result.current.submit({
          frictionAreas: ['other'],
          rating: 2,
          comment: '',
        });
      });

      expect(mockSubmit.mock.calls[0][0].timeToFirstSuccessSeconds).toBeNull();
    });

    it('reports a failed attempt rather than throwing when an IPC call rejects', async () => {
      mockGetOsInfo.mockRejectedValue(new Error('ipc down'));
      const { result } = setupForSubmit();

      let outcome: unknown;
      await act(async () => {
        outcome = await result.current.submit({
          frictionAreas: ['other'],
          rating: 2,
          comment: '',
        });
      });

      expect(outcome).toEqual({ success: false, error: expect.any(String) });
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(writeFor('onboardingSurvey.completed')).toBeUndefined();
    });

    it('sends the full payload and records completion on success', async () => {
      const { result } = setupForSubmit();

      await act(async () => {
        await result.current.submit({
          frictionAreas: ['backup_wallet'],
          rating: 2,
          comment: 'hello',
        });
      });

      const payload = mockSubmit.mock.calls[0][0];
      expect(payload).toMatchObject({
        frictionAreas: ['backup_wallet'],
        rating: 2,
        comment: 'hello',
        os: OS_INFO,
        pearlVersion: '0.9.4',
        // 1 day 2 hours from first app open to NOW, less the 42s the survey has been open:
        // the metric ends at the trigger, not at submission.
        timeToFirstSuccessSeconds: 93_558,
        timeToCompleteSurveySeconds: 42,
      });
      expect(payload.submissionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(writeFor('onboardingSurvey.completed')?.[1]).toBe(true);
    });

    it('reports the agent recorded at trigger time, not the one selected now', async () => {
      const { result } = setupForSubmit();

      await act(async () => {
        await result.current.submit({
          frictionAreas: [],
          rating: 3,
          comment: '',
        });
      });

      expect(mockSubmit.mock.calls[0][0].agentType).toBe(AgentMap.Polystrat);
    });

    it('sends a fresh submissionId per attempt', async () => {
      const { result } = setupForSubmit();

      await act(async () => {
        await result.current.submit({
          frictionAreas: [],
          rating: 3,
          comment: '',
        });
      });
      await act(async () => {
        await result.current.submit({
          frictionAreas: [],
          rating: 3,
          comment: '',
        });
      });

      expect(mockSubmit.mock.calls[0][0].submissionId).not.toBe(
        mockSubmit.mock.calls[1][0].submissionId,
      );
    });

    it('sends timeToFirstSuccessSeconds as null when timing is unavailable', async () => {
      const { result } = setupForSubmit({ timingUnavailable: true });

      await act(async () => {
        await result.current.submit({
          frictionAreas: [],
          rating: 3,
          comment: '',
        });
      });

      expect(mockSubmit.mock.calls[0][0].timeToFirstSuccessSeconds).toBeNull();
    });

    it('sends null, not 0, when firstAppOpenedAt was never stamped', async () => {
      mockStoreGet.mockResolvedValue('');
      const { result } = setupForSubmit();

      await act(async () => {
        await result.current.submit({
          frictionAreas: [],
          rating: 3,
          comment: '',
        });
      });

      expect(mockSubmit.mock.calls[0][0].timeToFirstSuccessSeconds).toBeNull();
    });

    it('measures survey duration from the persisted firstShownAt, not from mount', async () => {
      // Shown 3 days ago, dismissed, then submitted now via the feedback alert.
      const { result } = setupForSubmit({
        firstShownAt: new Date(NOW - 3 * 24 * 60 * 60 * 1000).toISOString(),
        dismissed: true,
      });

      await act(async () => {
        await result.current.submit({
          frictionAreas: [],
          rating: 3,
          comment: '',
        });
      });

      expect(mockSubmit.mock.calls[0][0].timeToCompleteSurveySeconds).toBe(
        3 * 24 * 60 * 60,
      );
    });

    it('the fast exit sends only everything_smooth with an automatic Good rating', async () => {
      const { result } = setupForSubmit();

      await act(async () => {
        await result.current.submitEverythingSmooth();
      });

      expect(mockSubmit.mock.calls[0][0]).toMatchObject({
        frictionAreas: ['everything_smooth'],
        rating: 3,
        comment: '',
      });
    });

    it('stays open after a successful submission so the success view can render', async () => {
      // Submitting writes `completed`, which makes the survey ineligible. If that also closed
      // the modal, the user would never see the thank-you screen.
      const { result, rerender } = setupForSubmit();
      act(() => result.current.open());
      await waitFor(() => expect(result.current.isModalOpen).toBe(true));

      await act(async () => {
        await result.current.submit({
          frictionAreas: [],
          rating: 3,
          comment: '',
        });
      });

      // Replay the store write the way StoreProvider would.
      mockUseStore.mockReturnValue({
        storeState: makePearlStore({
          onboardingSurvey: makeOnboardingSurveyState({
            firstShownAt: shownAt,
            agentType: AgentMap.Polystrat,
            timingUnavailable: false,
            completed: true,
          }),
        }),
      });
      rerender();

      expect(result.current.isModalOpen).toBe(true);
      expect(result.current.showFeedbackAlert).toBe(false);
    });

    it('leaves the feedback alert in place and records nothing when the request fails', async () => {
      mockSubmit.mockResolvedValue({ success: false, error: 'boom' });
      const { result } = setupForSubmit({ dismissed: true });

      await act(async () => {
        await result.current.submit({
          frictionAreas: [],
          rating: 1,
          comment: '',
        });
      });

      expect(writeFor('onboardingSurvey.completed')).toBeUndefined();
      expect(result.current.showFeedbackAlert).toBe(true);
    });
  });

  it('exposes the offline state so the submit paths can be disabled', () => {
    const { result } = setup(makePearlStore({}), { isOnline: false });

    expect(result.current.isOnline).toBe(false);
  });
});
