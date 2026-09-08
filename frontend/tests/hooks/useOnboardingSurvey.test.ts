import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';

import { ONBOARDING_SURVEY_EXPIRY_MS } from '../../components/OnboardingSurvey/constants';
import { AgentMap, AgentType } from '../../constants/agent';
import { useOnboardingSurvey } from '../../hooks/useOnboardingSurvey';
import { PearlStore } from '../../types/ElectronApi';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeOnboardingSurveyState,
  makePearlStore,
} from '../helpers/factories';
import { createQueryClientWrapper } from '../helpers/queryClient';

// The feature ships behind a kill switch that is `false` until pearl-api is deployed. Forcing it
// on here keeps every case below about the gating rules rather than about the flag; the one case
// that asserts the flag's own behaviour re-mocks it.
jest.mock('../../components/OnboardingSurvey/constants', () => ({
  ...jest.requireActual('../../components/OnboardingSurvey/constants'),
  IS_ONBOARDING_SURVEY_ENABLED: true,
}));

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

/** A service that carries an on-chain NFT token id — i.e. an account that predates the feature. */
const makeDeployedService = () => ({
  service_config_id: DEFAULT_SERVICE_CONFIG_ID,
  home_chain: 'gnosis',
  chain_configs: { gnosis: { chain_data: { token: 42 } } },
});

const makeUndeployedService = () => ({
  service_config_id: DEFAULT_SERVICE_CONFIG_ID,
  home_chain: 'gnosis',
  chain_configs: { gnosis: { chain_data: {} } },
});

type SetupOptions = {
  services?: unknown[];
  isFetched?: boolean;
  selectedAgentType?: AgentType;
  isOnline?: boolean;
};

const setup = (
  storeState: PearlStore | undefined,
  {
    services = [],
    isFetched = true,
    selectedAgentType = AgentMap.Polystrat,
    isOnline = true,
  }: SetupOptions = {},
) => {
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
      const { result } = setup(
        makePearlStore({ firstStakingRewardAchieved: true }),
      );

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
        makePearlStore({
          firstStakingRewardAchieved: true,
          onboardingSurvey: makeOnboardingSurveyState({
            firstShownAt: new Date(NOW - 1000).toISOString(),
          }),
        }),
      );

      expect(result.current.isModalOpen).toBe(false);
      expect(writeFor('onboardingSurvey.firstShownAt')).toBeUndefined();
    });

    it('does not fire when the survey was already completed', () => {
      const { result } = setup(
        makePearlStore({
          firstStakingRewardAchieved: true,
          onboardingSurvey: makeOnboardingSurveyState({ completed: true }),
        }),
      );

      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.showNudge).toBe(false);
    });

    it('shows an existing user the modal on the first launch after the update', async () => {
      // firstStakingRewardAchieved is already true and onboardingSurvey is absent.
      const { result } = setup(
        makePearlStore({ firstStakingRewardAchieved: true }),
      );

      await waitFor(() => expect(result.current.isModalOpen).toBe(true));
    });

    it('arms only once when several consumers mount the hook', async () => {
      mockUseStore.mockReturnValue({
        storeState: makePearlStore({ firstStakingRewardAchieved: true }),
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
    it('opens the modal when Home reports the Profile visit', async () => {
      const { result } = setup(makePearlStore({}), {
        selectedAgentType: AgentMap.Connect,
      });

      act(() => result.current.reportConnectProfileVisit());

      await waitFor(() => expect(result.current.isModalOpen).toBe(true));
      expect(writeFor('onboardingSurvey.agentType')?.[1]).toBe(
        AgentMap.Connect,
      );
    });

    it('ignores the Profile visit for a non-Connect agent', () => {
      const { result } = setup(makePearlStore({}), {
        selectedAgentType: AgentMap.Polystrat,
      });

      act(() => result.current.reportConnectProfileVisit());

      expect(result.current.isModalOpen).toBe(false);
      // The timing classification still runs — only the trigger must not.
      expect(writeFor('onboardingSurvey.firstShownAt')).toBeUndefined();
      expect(writeFor('onboardingSurvey.agentType')).toBeUndefined();
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

  describe('dismissal and the nudge', () => {
    it('dismissing closes the modal, records it and shows the nudge', async () => {
      const { result } = setup(
        makePearlStore({ firstStakingRewardAchieved: true }),
      );
      await waitFor(() => expect(result.current.isModalOpen).toBe(true));

      act(() => result.current.dismiss());

      expect(writeFor('onboardingSurvey.dismissed')?.[1]).toBe(true);
      await waitFor(() => expect(result.current.isModalOpen).toBe(false));
    });

    it('does not reopen the modal on the next launch — only the nudge persists', () => {
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
      expect(result.current.showNudge).toBe(true);
    });

    it('the nudge reopens the modal without rewriting firstShownAt', async () => {
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

    it('hides the nudge once the survey is completed', () => {
      const { result } = setup(
        makePearlStore({
          onboardingSurvey: makeOnboardingSurveyState({
            firstShownAt: new Date(NOW - 1000).toISOString(),
            completed: true,
          }),
        }),
      );

      expect(result.current.showNudge).toBe(false);
    });
  });

  describe('two-week expiry', () => {
    const shownDaysAgo = (days: number) =>
      new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();

    it('still shows the nudge at 13 days', () => {
      const { result } = setup(
        makePearlStore({
          onboardingSurvey: makeOnboardingSurveyState({
            firstShownAt: shownDaysAgo(13),
            dismissed: true,
          }),
        }),
      );

      expect(result.current.showNudge).toBe(true);
    });

    it('removes the nudge and blocks reopening at 15 days', () => {
      const { result } = setup(
        makePearlStore({
          onboardingSurvey: makeOnboardingSurveyState({
            firstShownAt: shownDaysAgo(15),
            dismissed: true,
          }),
        }),
      );

      expect(result.current.showNudge).toBe(false);

      act(() => result.current.open());

      // Reopening an expired survey is a no-op, so nothing to wait for.
      expect(result.current.isModalOpen).toBe(false);
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('uses the scoped window rather than an ad-hoc number', () => {
      expect(ONBOARDING_SURVEY_EXPIRY_MS).toBe(14 * 24 * 60 * 60 * 1000);
    });
  });

  describe('timing classification', () => {
    it('marks an account with a deployed service as timing-unavailable', async () => {
      setup(makePearlStore({}), { services: [makeDeployedService()] });

      await waitFor(() =>
        expect(writeFor('onboardingSurvey.timingUnavailable')?.[1]).toBe(true),
      );
    });

    it('marks a fresh install as timing-available', async () => {
      setup(makePearlStore({}), { services: [] });

      await waitFor(() =>
        expect(writeFor('onboardingSurvey.timingUnavailable')?.[1]).toBe(false),
      );
    });

    it('does not classify before the service list has been fetched', () => {
      // An unfetched list looks empty, which would misclassify a returning user as new.
      setup(makePearlStore({}), {
        services: undefined,
        isFetched: false,
      });

      expect(writeFor('onboardingSurvey.timingUnavailable')).toBeUndefined();
    });

    it('does not reclassify once already recorded', () => {
      setup(
        makePearlStore({
          onboardingSurvey: makeOnboardingSurveyState({
            timingUnavailable: true,
          }),
        }),
        { services: [makeUndeployedService()] },
      );

      expect(writeFor('onboardingSurvey.timingUnavailable')).toBeUndefined();
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
      // Shown 3 days ago, dismissed, then submitted now via the nudge.
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
      expect(result.current.showNudge).toBe(false);
    });

    it('leaves the nudge in place and records nothing when the request fails', async () => {
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
      expect(result.current.showNudge).toBe(true);
    });
  });

  it('exposes the offline state so the submit paths can be disabled', () => {
    const { result } = setup(makePearlStore({}), { isOnline: false });

    expect(result.current.isOnline).toBe(false);
  });
});
