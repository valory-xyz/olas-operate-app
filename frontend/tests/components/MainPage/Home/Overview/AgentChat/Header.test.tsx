import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { AgentChatHeader } from '../../../../../../components/MainPage/Home/Overview/AgentChat/Header';
import { useCanManageStaking } from '../../../../../../components/MainPage/Home/Overview/Staking/Staking';
import { PAGES } from '../../../../../../constants/pages';
import {
  useAgentPerformance,
  usePageState,
  useService,
  useServices,
} from '../../../../../../hooks';

const mockGoto = jest.fn();

jest.mock('../../../../../../hooks', () => ({
  useAgentPerformance: jest.fn(),
  usePageState: jest.fn(),
  useService: jest.fn(),
  useServices: jest.fn(),
}));

jest.mock('../../../../../../context/AutoRunProvider', () => ({
  useAutoRunContext: () => ({ enabled: false }),
}));

jest.mock('../../../../../../components/ui', () => ({
  CardFlex: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  InfoTooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="metric-info">{children}</div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useContentTransitionValue: <T,>(value: T) => value,
}));

jest.mock(
  '../../../../../../components/MainPage/Home/Overview/AgentInfo',
  () => ({
    AboutAgent: () => null,
    ChainLogo: () => <span>chain logo</span>,
    AutoRunAlert: () => null,
    AgentInfoAlerts: () => <div>AgentInfo banners</div>,
    IconButton: ({
      children,
      onClick,
      ...rest
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      'aria-label'?: string;
    }) => (
      <button aria-label={rest['aria-label']} onClick={onClick}>
        {children}
      </button>
    ),
  }),
);
jest.mock(
  '../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentRunButton',
  () => ({ AgentRunButton: () => <button>Pause Agent</button> }),
);
jest.mock(
  '../../../../../../components/MainPage/Home/Overview/Performance',
  () => ({
    MetricsCapturedTimestampAlert: () => <div>Data captured banner</div>,
    MetricsUnavailableAlert: () => <div>Metrics unavailable banner</div>,
    NoMetricsAlert: () => <div>No metrics banner</div>,
  }),
);
jest.mock(
  '../../../../../../components/MainPage/Home/Overview/Staking/Staking',
  () => ({
    StakingAlert: () => <div>Staking banner</div>,
    useCanManageStaking: jest.fn(),
  }),
);
jest.mock(
  '../../../../../../components/MainPage/Home/Overview/Staking/Streak',
  () => ({
    Streak: ({ isCompact }: { isCompact?: boolean }) => (
      <span>{isCompact ? 'compact streak' : 'streak'}</span>
    ),
  }),
);

const mockUseServices = useServices as jest.Mock;
const mockUseService = useService as jest.Mock;
const mockUseAgentPerformance = useAgentPerformance as jest.Mock;
const mockUsePageState = usePageState as jest.Mock;
const mockUseCanManageStaking = useCanManageStaking as jest.Mock;

const METRICS = [
  { name: 'Prediction accuracy', value: '53%', is_primary: false },
  {
    name: 'Total ROI',
    value: '10.22%',
    is_primary: true,
    description: 'ROI <b>explained</b>',
  },
  { name: 'Trades', value: '12', is_primary: false },
];

const renderHeader = ({
  metrics = METRICS,
  timestamp = null as number | null,
  isServiceActive = true,
  canManageStaking = true,
  arePerformanceMetricsUnavailable = false,
} = {}) => {
  mockUseServices.mockReturnValue({
    selectedAgentType: 'polymarket_trader',
    selectedAgentNameOrFallback: 'fafon-norlo48',
    selectedService: { service_config_id: 'sc-1' },
    selectedAgentConfig: {
      isX402Enabled: true,
      requiresSetup: true,
      arePerformanceMetricsUnavailable,
    },
  });
  mockUseService.mockReturnValue({ isServiceActive });
  mockUseAgentPerformance.mockReturnValue({
    data: { metrics, timestamp, agent_behavior: null },
    isLoading: false,
  });
  mockUsePageState.mockReturnValue({ goto: mockGoto });
  mockUseCanManageStaking.mockReturnValue(canManageStaking);
  return render(<AgentChatHeader />);
};

describe('AgentChatHeader', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the agent name and run button', () => {
    renderHeader();

    expect(screen.getByText('fafon-norlo48')).toBeInTheDocument();
    expect(screen.getByText('Pause Agent')).toBeInTheDocument();
  });

  it('shows the chain logo next to the agent name', () => {
    renderHeader();

    expect(screen.getByText('fafon-norlo48').parentElement).toContainElement(
      screen.getByText('chain logo'),
    );
  });

  it("shows the agent's two key metrics, primary first, with its tooltip", () => {
    renderHeader();

    expect(screen.getByText('Total ROI:')).toBeInTheDocument();
    expect(screen.getByText('10.22%')).toBeInTheDocument();
    expect(screen.getByText('Prediction accuracy:')).toBeInTheDocument();
    expect(screen.queryByText('Trades:')).toBeNull();
    expect(screen.getByTestId('metric-info')).toHaveTextContent(
      'ROI explained',
    );
  });

  it('opens the Agent Wallet from the wallet icon', () => {
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Agent Wallet' }));

    expect(mockGoto).toHaveBeenCalledWith(PAGES.AgentWallet);
  });

  it('opens Manage Staking from the streak flame', () => {
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Manage Staking' }));

    expect(mockGoto).toHaveBeenCalledWith(PAGES.AgentStaking);
  });

  it('fits the streak to the icon row', () => {
    renderHeader();

    expect(
      screen.getByRole('button', { name: 'Manage Staking' }),
    ).toHaveTextContent('compact streak');
  });

  it('does not open Manage Staking when staking cannot be managed', () => {
    renderHeader({ canManageStaking: false });

    fireEvent.click(screen.getByRole('button', { name: 'Manage Staking' }));

    expect(mockGoto).not.toHaveBeenCalled();
  });

  it("shows today's Overview banners at the bottom of the header", () => {
    renderHeader({ isServiceActive: false, timestamp: 1_760_000_000 });

    expect(screen.getByText('AgentInfo banners')).toBeInTheDocument();
    expect(screen.getByText('Staking banner')).toBeInTheDocument();
    expect(screen.getByText('Data captured banner')).toBeInTheDocument();
  });

  it('shows the no-metrics banner when the agent has no metrics yet', () => {
    renderHeader({ metrics: [] });

    expect(screen.getByText('No metrics banner')).toBeInTheDocument();
  });

  it('shows the metrics-unavailable banner instead of metrics when flagged', () => {
    renderHeader({ arePerformanceMetricsUnavailable: true });

    expect(screen.getByText('Metrics unavailable banner')).toBeInTheDocument();
    expect(screen.queryByText('Total ROI:')).toBeNull();
  });
});
