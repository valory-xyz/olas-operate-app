import { renderHook, waitFor } from '@testing-library/react';

import { AgentMap } from '../../constants/agent';
import { useOnboardingSurvey } from '../../hooks/useOnboardingSurvey';
import { makePearlStore } from '../helpers/factories';
import { createQueryClientWrapper } from '../helpers/queryClient';

// The kill switch as it actually ships. Its own file because a module mock cannot be swapped
// mid-suite without `jest.resetModules()`, which would also hand the re-required hook a second
// copy of React.
jest.mock('../../components/OnboardingSurvey/constants', () => ({
  ...jest.requireActual('../../components/OnboardingSurvey/constants'),
  IS_ONBOARDING_SURVEY_ENABLED: false,
}));

const mockStoreSet = jest.fn();
const mockUseStore = jest.fn();
const mockUseServices = jest.fn();
const mockSubmit = jest.fn();

jest.mock('../../hooks/useElectronApi', () => ({
  useElectronApi: () => ({
    store: { set: mockStoreSet, get: jest.fn() },
    getAppVersion: jest.fn(),
    getOsInfo: jest.fn(),
  }),
}));
jest.mock('../../hooks/useStore', () => ({ useStore: () => mockUseStore() }));
jest.mock('../../hooks/useServices', () => ({
  useServices: () => mockUseServices(),
}));
jest.mock('../../hooks/useOnlineStatus', () => ({
  useOnlineStatusContext: () => ({ isOnline: true }),
}));
jest.mock('../../service/OnboardingSurvey', () => ({
  OnboardingSurveyService: {
    submit: (...args: unknown[]) => mockSubmit(...args),
  },
}));

describe('useOnboardingSurvey with IS_ONBOARDING_SURVEY_ENABLED = false', () => {
  it('shows nothing and never arms, even with both triggers satisfied', () => {
    mockUseStore.mockReturnValue({
      storeState: makePearlStore({ firstStakingRewardAchieved: true }),
    });
    mockUseServices.mockReturnValue({
      services: [],
      isFetched: true,
      selectedAgentType: AgentMap.Connect,
    });

    const { result } = renderHook(() => useOnboardingSurvey(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.reportConnectProfileVisit();

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.showNudge).toBe(false);
    expect(
      mockStoreSet.mock.calls.filter(
        ([key]: [string]) =>
          key.startsWith('onboardingSurvey') &&
          key !== 'onboardingSurvey.timingUnavailable',
      ),
    ).toHaveLength(0);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('still records the timing classification, so a later flip does not misclassify the account', async () => {
    mockUseStore.mockReturnValue({ storeState: makePearlStore({}) });
    mockUseServices.mockReturnValue({
      services: [],
      isFetched: true,
      selectedAgentType: AgentMap.Polystrat,
    });

    renderHook(() => useOnboardingSurvey(), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() =>
      expect(mockStoreSet).toHaveBeenCalledWith(
        'onboardingSurvey.timingUnavailable',
        false,
      ),
    );
  });
});
