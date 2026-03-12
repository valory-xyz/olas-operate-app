import { render, screen } from '@testing-library/react';
import { ReactNode } from 'react';

import { useNotifyOnAgentRewards } from '../../../components/MainPage/hooks/useNotifyOnAgentRewards';
import { useNotifyOnNewEpoch } from '../../../components/MainPage/hooks/useNotifyOnNewEpoch';
import { useSetupTrayIcon } from '../../../components/MainPage/hooks/useSetupTrayIcon';
// ---------------------------------------------------------------------------
// Import under test and mocked modules (after mocks)
// ---------------------------------------------------------------------------
import { Main } from '../../../components/MainPage/index';
import { PAGES, Pages } from '../../../constants/pages';
import { usePageState } from '../../../hooks';

// ---------------------------------------------------------------------------
// Module mocks -- stub every child component & hook
// ---------------------------------------------------------------------------

jest.mock('../../../components/MainPage/Home', () => ({
  Home: () => <div data-testid="home" />,
}));

jest.mock('../../../components/MainPage/Sidebar/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

jest.mock('../../../components/AchievementModal', () => ({
  AchievementModal: () => <div data-testid="achievement-modal" />,
}));

jest.mock('../../../components/PearlWallet', () => ({
  PearlWallet: () => <div data-testid="pearl-wallet" />,
}));

jest.mock('../../../components/AgentWallet', () => ({
  AgentWallet: () => <div data-testid="agent-wallet" />,
}));

jest.mock('../../../components/SettingsPage', () => ({
  Settings: () => <div data-testid="settings" />,
}));

jest.mock('../../../components/Pages/HelpAndSupportPage', () => ({
  HelpAndSupport: () => <div data-testid="help-and-support" />,
}));

jest.mock('../../../components/UpdateAgentPage', () => ({
  UpdateAgentPage: () => <div data-testid="update-agent-page" />,
}));

jest.mock('../../../components/AgentStaking/AgentStaking', () => ({
  AgentStaking: () => <div data-testid="agent-staking" />,
}));

jest.mock('../../../components/SelectStakingPage', () => ({
  SelectStakingPage: ({ mode }: { mode: string }) => (
    <div data-testid="select-staking-page" data-mode={mode} />
  ),
}));

jest.mock('../../../components/ConfirmSwitch/ConfirmSwitch', () => ({
  ConfirmSwitch: () => <div data-testid="confirm-switch" />,
}));

jest.mock('../../../components/ConfirmSwitch/DepositOlasForStaking', () => ({
  DepositOlasForStaking: () => <div data-testid="deposit-olas-for-staking" />,
}));

jest.mock('../../../components/FundPearlWallet', () => ({
  FundPearlWallet: () => <div data-testid="fund-pearl-wallet" />,
}));

// PageTransition: pass children through
jest.mock('../../../components/ui', () => ({
  PageTransition: ({ children }: { children?: ReactNode }) => (
    <div data-testid="page-transition">{children}</div>
  ),
}));

// Hooks -- use inline jest.fn() inside factories to avoid hoisting issues
jest.mock('../../../hooks', () => ({
  usePageState: jest.fn(),
}));

jest.mock('../../../components/MainPage/hooks/useScrollPage', () => ({
  useScrollPage: jest.fn(() => ({ current: null })),
}));

jest.mock('../../../components/MainPage/hooks/useSetupTrayIcon', () => ({
  useSetupTrayIcon: jest.fn(),
}));

jest.mock('../../../components/MainPage/hooks/useNotifyOnNewEpoch', () => ({
  useNotifyOnNewEpoch: jest.fn(),
}));

jest.mock('../../../components/MainPage/hooks/useNotifyOnAgentRewards', () => ({
  useNotifyOnAgentRewards: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

const mockUsePageState = usePageState as jest.Mock;
const mockUseSetupTrayIcon = useSetupTrayIcon as jest.Mock;
const mockUseNotifyOnNewEpoch = useNotifyOnNewEpoch as jest.Mock;
const mockUseNotifyOnAgentRewards = useNotifyOnAgentRewards as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const renderWithPage = (pageState: Pages | string) => {
  mockUsePageState.mockReturnValue({ pageState: pageState as Pages });
  return render(<Main />);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Main (MainPage entry)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('page initialization hooks', () => {
    it('calls useSetupTrayIcon on render', () => {
      renderWithPage(PAGES.Main);
      expect(mockUseSetupTrayIcon).toHaveBeenCalled();
    });

    it('calls useNotifyOnNewEpoch on render', () => {
      renderWithPage(PAGES.Main);
      expect(mockUseNotifyOnNewEpoch).toHaveBeenCalled();
    });

    it('calls useNotifyOnAgentRewards on render', () => {
      renderWithPage(PAGES.Main);
      expect(mockUseNotifyOnAgentRewards).toHaveBeenCalled();
    });
  });

  describe('always-rendered components', () => {
    it('renders Sidebar regardless of page state', () => {
      renderWithPage(PAGES.Settings);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('renders AchievementModal regardless of page state', () => {
      renderWithPage(PAGES.HelpAndSupport);
      expect(screen.getByTestId('achievement-modal')).toBeInTheDocument();
    });
  });

  describe('page routing', () => {
    const routingCases: {
      label: string;
      pageState: Pages;
      expectedTestId: string;
    }[] = [
      {
        label: 'PearlWallet',
        pageState: PAGES.PearlWallet,
        expectedTestId: 'pearl-wallet',
      },
      {
        label: 'AgentWallet',
        pageState: PAGES.AgentWallet,
        expectedTestId: 'agent-wallet',
      },
      {
        label: 'Settings',
        pageState: PAGES.Settings,
        expectedTestId: 'settings',
      },
      {
        label: 'HelpAndSupport',
        pageState: PAGES.HelpAndSupport,
        expectedTestId: 'help-and-support',
      },
      {
        label: 'UpdateAgentTemplate',
        pageState: PAGES.UpdateAgentTemplate,
        expectedTestId: 'update-agent-page',
      },
      {
        label: 'AgentStaking',
        pageState: PAGES.AgentStaking,
        expectedTestId: 'agent-staking',
      },
      {
        label: 'SelectStaking',
        pageState: PAGES.SelectStaking,
        expectedTestId: 'select-staking-page',
      },
      {
        label: 'ConfirmSwitch',
        pageState: PAGES.ConfirmSwitch,
        expectedTestId: 'confirm-switch',
      },
      {
        label: 'DepositOlasForStaking',
        pageState: PAGES.DepositOlasForStaking,
        expectedTestId: 'deposit-olas-for-staking',
      },
      {
        label: 'FundPearlWallet',
        pageState: PAGES.FundPearlWallet,
        expectedTestId: 'fund-pearl-wallet',
      },
    ];

    it.each(routingCases)(
      'renders the correct component for $label',
      ({ pageState, expectedTestId }) => {
        renderWithPage(pageState);
        expect(screen.getByTestId(expectedTestId)).toBeInTheDocument();
      },
    );

    it('renders Home for the default case (PAGES.Main)', () => {
      renderWithPage(PAGES.Main);
      expect(screen.getByTestId('home')).toBeInTheDocument();
    });
  });

  describe('SelectStaking mode prop', () => {
    it('passes mode="migrate" to SelectStakingPage', () => {
      renderWithPage(PAGES.SelectStaking);
      const el = screen.getByTestId('select-staking-page');
      expect(el).toHaveAttribute('data-mode', 'migrate');
    });
  });
});
