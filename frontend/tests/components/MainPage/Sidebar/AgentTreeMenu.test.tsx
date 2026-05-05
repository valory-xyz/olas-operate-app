import { fireEvent, render, screen } from '@testing-library/react';

// Import after mocks
import { AgentTreeMenu } from '../../../../components/MainPage/Sidebar/AgentTreeMenu';
import { SidebarAgentGroup } from '../../../../components/MainPage/Sidebar/types';
import { AgentMap } from '../../../../constants/agent';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  MOCK_SERVICE_CONFIG_ID_2,
  MOCK_SERVICE_CONFIG_ID_3,
} from '../../../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({}));
jest.mock('../../../../config/providers', () => ({}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <img {...props} alt={props.alt as string} />
  ),
}));

jest.mock('react-icons/ri', () => ({
  RiArrowDownSLine: () => <span data-testid="arrow-down" />,
  RiArrowRightSLine: () => <span data-testid="arrow-right" />,
}));

const makeGroup = (
  agentType: string,
  instances: Array<{
    serviceConfigId: string;
    name: string;
    hasEarnedRewards?: boolean;
  }>,
): SidebarAgentGroup => ({
  agentType: agentType as SidebarAgentGroup['agentType'],
  instances,
});

describe('AgentTreeMenu', () => {
  const mockOnGroupSelect = jest.fn();
  const mockOnInstanceSelect = jest.fn();

  const traderGroup = makeGroup(AgentMap.PredictTrader, [
    { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID, name: 'Omenstrat #1' },
    { serviceConfigId: MOCK_SERVICE_CONFIG_ID_2, name: 'Omenstrat #2' },
  ]);

  const optimusGroup = makeGroup(AgentMap.Optimus, [
    { serviceConfigId: MOCK_SERVICE_CONFIG_ID_3, name: 'Optimus #1' },
  ]);

  const mockOnArchiveRequest = jest.fn();

  const defaultProps = {
    groups: [traderGroup, optimusGroup],
    selectedServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
    runningServiceConfigIds: new Set<string>(),
    totalInstanceCount: 3,
    onGroupSelect: mockOnGroupSelect,
    onInstanceSelect: mockOnInstanceSelect,
    onArchiveRequest: mockOnArchiveRequest,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all group headers', () => {
    render(<AgentTreeMenu {...defaultProps} />);
    expect(screen.getByText('Omenstrat')).toBeInTheDocument();
    expect(screen.getByText('Optimus')).toBeInTheDocument();
  });

  it('auto-expands group containing selected instance', () => {
    render(<AgentTreeMenu {...defaultProps} />);
    // The trader group should be expanded because selected instance is in it
    expect(screen.getByText('Omenstrat #1')).toBeInTheDocument();
    expect(screen.getByText('Omenstrat #2')).toBeInTheDocument();
  });

  it('does not expand groups that do not contain selected instance', () => {
    render(<AgentTreeMenu {...defaultProps} />);
    // Optimus group should NOT be expanded
    expect(screen.queryByText('Optimus #1')).not.toBeInTheDocument();
  });

  it('toggles group expansion on header click', () => {
    render(<AgentTreeMenu {...defaultProps} />);
    // Optimus is collapsed, click to expand
    fireEvent.click(screen.getByText('Optimus'));
    expect(screen.getByText('Optimus #1')).toBeInTheDocument();
  });

  it('collapses group on second header click', () => {
    render(<AgentTreeMenu {...defaultProps} selectedServiceConfigId={null} />);
    // Click to expand trader group
    fireEvent.click(screen.getByText('Omenstrat'));
    expect(screen.getByText('Omenstrat #1')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(screen.getByText('Omenstrat'));
    expect(screen.queryByText('Omenstrat #1')).not.toBeInTheDocument();
  });

  it('calls onGroupSelect with first instance when expanding group without prior selection in that group', () => {
    render(<AgentTreeMenu {...defaultProps} />);
    // Click Optimus header (no instance selected in this group)
    fireEvent.click(screen.getByText('Optimus'));
    expect(mockOnGroupSelect).toHaveBeenCalledWith(MOCK_SERVICE_CONFIG_ID_3);
  });

  it('does not call onGroupSelect when expanding a group that has a selected instance', () => {
    render(<AgentTreeMenu {...defaultProps} />);
    // Collapse trader group first
    fireEvent.click(screen.getByText('Omenstrat'));
    mockOnGroupSelect.mockClear();
    // Re-expand: the selected instance is still in this group
    fireEvent.click(screen.getByText('Omenstrat'));
    expect(mockOnGroupSelect).not.toHaveBeenCalled();
  });

  it('calls onInstanceSelect when clicking an instance row', () => {
    render(<AgentTreeMenu {...defaultProps} />);
    fireEvent.click(screen.getByText('Omenstrat #2'));
    expect(mockOnInstanceSelect).toHaveBeenCalledWith(MOCK_SERVICE_CONFIG_ID_2);
  });

  it('shows running dot on collapsed group when an instance is running', () => {
    const { container } = render(
      <AgentTreeMenu
        {...defaultProps}
        selectedServiceConfigId={null}
        runningServiceConfigIds={new Set([MOCK_SERVICE_CONFIG_ID_3])}
      />,
    );
    // Optimus is collapsed and has a running instance
    // The PulseDot should be rendered (has role="status")
    const statusElements = container.querySelectorAll('[role="status"]');
    expect(statusElements.length).toBeGreaterThan(0);
  });

  it('shows running dot on expanded instance row when running', () => {
    render(
      <AgentTreeMenu
        {...defaultProps}
        runningServiceConfigIds={new Set([DEFAULT_SERVICE_CONFIG_ID])}
      />,
    );
    // Trader group is expanded, running dot should show on the instance
    const statusElements = screen.getAllByRole('status');
    expect(statusElements.length).toBeGreaterThan(0);
  });

  it('does not show running dot when no instances are running', () => {
    render(<AgentTreeMenu {...defaultProps} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows green reward dot (role="img") for non-running instance with hasEarnedRewards=true', () => {
    const traderGroupWithRewards = makeGroup(AgentMap.PredictTrader, [
      {
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        name: 'Omenstrat #1',
        hasEarnedRewards: true,
      },
      {
        serviceConfigId: MOCK_SERVICE_CONFIG_ID_2,
        name: 'Omenstrat #2',
        hasEarnedRewards: false,
      },
    ]);

    render(
      <AgentTreeMenu
        {...defaultProps}
        groups={[traderGroupWithRewards]}
        runningServiceConfigIds={new Set()}
      />,
    );

    expect(
      screen.getByRole('img', { name: 'Earned rewards this cycle' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'No rewards earned this cycle' }),
    ).toBeInTheDocument();
  });

  it('does not show reward dot for non-running instance when hasEarnedRewards is undefined', () => {
    const traderGroupNoRewardData = makeGroup(AgentMap.PredictTrader, [
      {
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        name: 'Omenstrat #1',
        // hasEarnedRewards intentionally omitted
      },
    ]);

    render(
      <AgentTreeMenu
        {...defaultProps}
        groups={[traderGroupNoRewardData]}
        runningServiceConfigIds={new Set()}
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('does not show reward dot for a running instance', () => {
    const traderGroupWithRewards = makeGroup(AgentMap.PredictTrader, [
      {
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        name: 'Omenstrat #1',
        hasEarnedRewards: true,
      },
    ]);

    render(
      <AgentTreeMenu
        {...defaultProps}
        groups={[traderGroupWithRewards]}
        runningServiceConfigIds={new Set([DEFAULT_SERVICE_CONFIG_ID])}
      />,
    );

    // PulseDot (role="status") should be shown, no RewardDot (role="img")
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
