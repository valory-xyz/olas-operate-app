import { act, renderHook } from '@testing-library/react';

import { MiddlewareChainMap } from '../../constants/chains';
import { MiddlewareDeploymentStatusMap } from '../../constants/deployment';
import { PAGES } from '../../constants/pages';
import { SETUP_SCREEN } from '../../constants/setupScreen';
import { useConnectStakingAnnouncement } from '../../hooks/useConnectStakingAnnouncement';
import { useElectronApi } from '../../hooks/useElectronApi';
import { useOnboardingSurvey } from '../../hooks/useOnboardingSurvey';
import { usePageState } from '../../hooks/usePageState';
import { useServices } from '../../hooks/useServices';
import { useSetup } from '../../hooks/useSetup';
import { useStore } from '../../hooks/useStore';

jest.mock('../../config/agents', () => ({
  AGENT_CONFIG: { connect: { servicePublicId: 'valory/connect:0.1.0' } },
}));
// `@/constants` loads `config/chains`, which needs the real number formatters.
jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils/numberFormatters'),
  asEvmChainId: (chain: string) =>
    ({ gnosis: 100, robinhood: 4663, polygon: 137 })[chain],
  matchesAgentConfig: (service: { isConnect?: boolean }) => !!service.isConnect,
}));
jest.mock('../../hooks/useElectronApi', () => ({ useElectronApi: jest.fn() }));
jest.mock('../../hooks/useOnboardingSurvey', () => ({
  useOnboardingSurvey: jest.fn(),
}));
jest.mock('../../hooks/usePageState', () => ({ usePageState: jest.fn() }));
jest.mock('../../hooks/useServices', () => ({ useServices: jest.fn() }));
jest.mock('../../hooks/useSetup', () => ({ useSetup: jest.fn() }));
jest.mock('../../hooks/useStore', () => ({ useStore: jest.fn() }));

const mockStoreSet = jest.fn();
const mockGotoPage = jest.fn();
const mockGotoSetup = jest.fn();
const mockUpdateSelectedServiceConfigId = jest.fn();

const connectOn = (home_chain: string, id = `sc-connect-${home_chain}`) => ({
  isConnect: true,
  home_chain,
  service_config_id: id,
});

type Setup = {
  storeState?: object | undefined;
  pageState?: string;
  isSurveyOpen?: boolean;
  services?: object[];
  selectedAgentType?: string;
  selectedService?: object;
};

const setup = (overrides: Setup = {}) => {
  const {
    pageState = PAGES.Main,
    isSurveyOpen = false,
    services = [],
    selectedAgentType = 'trader',
    selectedService,
  } = overrides;
  // An explicit `undefined` is the not-yet-loaded store, not "use the default".
  const storeState = 'storeState' in overrides ? overrides.storeState : {};
  (useElectronApi as jest.Mock).mockReturnValue({
    store: { set: mockStoreSet },
  });
  (useStore as jest.Mock).mockReturnValue({ storeState });
  (usePageState as jest.Mock).mockReturnValue({
    pageState,
    goto: mockGotoPage,
  });
  (useSetup as jest.Mock).mockReturnValue({ goto: mockGotoSetup });
  (useOnboardingSurvey as jest.Mock).mockReturnValue({
    isModalOpen: isSurveyOpen,
  });
  (useServices as jest.Mock).mockReturnValue({
    services,
    selectedService,
    selectedAgentType,
    updateSelectedServiceConfigId: mockUpdateSelectedServiceConfigId,
  });
  return renderHook(() => useConnectStakingAnnouncement()).result;
};

describe('useConnectStakingAnnouncement', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('isOpen', () => {
    it('opens once for every user on the main page, Connect or not', () => {
      expect(setup().current.isOpen).toBe(true);
    });

    it.each([
      [
        'it was answered',
        { storeState: { connectStakingAnnouncementSeen: true } },
      ],
      ['the store has not loaded', { storeState: undefined }],
      ['the user is in setup', { pageState: PAGES.Setup }],
      ['the onboarding survey is open', { isSurveyOpen: true }],
      [
        "Connect's first-run modal is due",
        {
          selectedAgentType: 'connect',
          selectedService: {
            service_config_id: 'sc-1',
            deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
          },
          storeState: { connect: { firstRunCompleted: {} } },
        },
      ],
    ])('stays closed while %s', (_, overrides) => {
      expect(setup(overrides as Setup).current.isOpen).toBe(false);
    });

    it("opens once Connect's first run is complete", () => {
      const result = setup({
        selectedAgentType: 'connect',
        selectedService: {
          service_config_id: 'sc-1',
          deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
        },
        storeState: { connect: { firstRunCompleted: { 'sc-1': true } } },
      });
      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('Stake your Connect Agent', () => {
    it("opens the Gnosis agent's contract list first", () => {
      const result = setup({
        services: [
          connectOn(MiddlewareChainMap.ROBINHOOD),
          connectOn(MiddlewareChainMap.GNOSIS),
        ],
      });

      act(() => result.current.stake());

      expect(mockStoreSet).toHaveBeenCalledWith(
        'connectStakingAnnouncementSeen',
        true,
      );
      expect(mockUpdateSelectedServiceConfigId).toHaveBeenCalledWith(
        'sc-connect-gnosis',
      );
      expect(mockGotoPage).toHaveBeenCalledWith(PAGES.SelectStaking);
    });

    it("opens the Robinhood agent's list when there is no Gnosis agent", () => {
      const result = setup({
        services: [
          connectOn(MiddlewareChainMap.POLYGON),
          connectOn(MiddlewareChainMap.ROBINHOOD),
        ],
      });

      act(() => result.current.stake());

      expect(mockUpdateSelectedServiceConfigId).toHaveBeenCalledWith(
        'sc-connect-robinhood',
      );
      expect(mockGotoPage).toHaveBeenCalledWith(PAGES.SelectStaking);
    });

    it('opens agent creation when the only Connect agent is on Polygon', () => {
      const result = setup({
        services: [connectOn(MiddlewareChainMap.POLYGON)],
      });

      act(() => result.current.stake());

      expect(mockUpdateSelectedServiceConfigId).not.toHaveBeenCalled();
      expect(mockGotoPage).toHaveBeenCalledWith(PAGES.Setup);
      expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.AgentOnboarding);
    });

    it('ignores other agents on Gnosis', () => {
      const result = setup({
        services: [
          { ...connectOn(MiddlewareChainMap.GNOSIS), isConnect: false },
        ],
      });

      act(() => result.current.stake());

      expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.AgentOnboarding);
    });
  });

  it('Not Now marks it as seen and goes nowhere', () => {
    const result = setup();

    act(() => result.current.dismiss());

    expect(mockStoreSet).toHaveBeenCalledWith(
      'connectStakingAnnouncementSeen',
      true,
    );
    expect(mockGotoPage).not.toHaveBeenCalled();
  });
});
