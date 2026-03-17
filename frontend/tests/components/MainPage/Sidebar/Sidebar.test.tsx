import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { Sidebar } from '../../../../components/MainPage/Sidebar/Sidebar';
import { PAGES } from '../../../../constants';
import { AgentMap } from '../../../../constants/agent';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({}));

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

// Mock Dropdown to render menu items inline so tests can interact with them
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  type DropdownProps = {
    children: React.ReactNode;
    menu?: {
      items?: {
        key: string;
        label: string;
        onClick?: (e: { domEvent: { stopPropagation: () => void } }) => void;
      }[];
    };
  };
  return {
    ...actual,
    Dropdown: ({ children, menu }: DropdownProps) => (
      <div data-testid="dropdown-container">
        {children}
        <div data-testid="dropdown-menu">
          {menu?.items?.map((item) => (
            <button
              key={item.key}
              onClick={() =>
                item.onClick?.({ domEvent: { stopPropagation: () => {} } })
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    ),
  };
});

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, src }: { alt: string; src: string }) => (
    <img alt={alt} src={src} />
  ),
}));

// Stub child components that are not under test
jest.mock('../../../../components/MainPage/BackupSeedPhraseAlert', () => ({
  BackupSeedPhraseAlert: () => null,
}));
jest.mock(
  '../../../../components/MainPage/UpdateAvailableAlert/UpdateAvailableAlert',
  () => ({ UpdateAvailableAlert: () => null }),
);
jest.mock(
  '../../../../components/MainPage/UpdateAvailableAlert/UpdateAvailableModal',
  () => ({ UpdateAvailableModal: () => null }),
);
jest.mock('../../../../components/MainPage/Sidebar/AutoRunControl', () => ({
  AutoRunControl: () => null,
}));
jest.mock('../../../../components/MainPage/Sidebar/PulseDot', () => ({
  PulseDot: () => <span data-testid="pulse-dot" />,
}));

// ---------------------------------------------------------------------------
// Hook mocks
// ---------------------------------------------------------------------------

const mockGotoSetup = jest.fn();
const mockGotoPage = jest.fn();
const mockUpdateAgentType = jest.fn();
const mockArchiveAgent = jest.fn();

const mockUseSetup = jest.fn();
const mockUsePageState = jest.fn();
const mockUseServices = jest.fn();
const mockUseArchivedAgents = jest.fn();
const mockUseMasterWalletContext = jest.fn();
const mockUseAgentRunning = jest.fn();
const mockUseBalanceAndRefillRequirementsContext = jest.fn();

jest.mock('../../../../hooks', () => ({
  useSetup: (...args: unknown[]) => mockUseSetup(...args),
  usePageState: (...args: unknown[]) => mockUsePageState(...args),
  useServices: (...args: unknown[]) => mockUseServices(...args),
  useArchivedAgents: (...args: unknown[]) => mockUseArchivedAgents(...args),
  useMasterWalletContext: (...args: unknown[]) =>
    mockUseMasterWalletContext(...args),
  useAgentRunning: (...args: unknown[]) => mockUseAgentRunning(...args),
  useBalanceAndRefillRequirementsContext: (...args: unknown[]) =>
    mockUseBalanceAndRefillRequirementsContext(...args),
}));

jest.mock('../../../../config/agents', () => ({
  ACTIVE_AGENTS: [
    [
      'memeooorr',
      {
        displayName: 'Agents.fun',
        servicePublicId: 'valory/memeooorr_pearl:0.1.0',
        middlewareHomeChainId: 8453,
        evmHomeChainId: 8453,
        isAgentEnabled: true,
        isUnderConstruction: false,
      },
    ],
    [
      'trader',
      {
        displayName: 'Omenstrat',
        servicePublicId: 'valory/trader_pearl:0.1.0',
        middlewareHomeChainId: 100,
        evmHomeChainId: 100,
        isAgentEnabled: true,
        isUnderConstruction: false,
      },
    ],
  ],
  AVAILABLE_FOR_ADDING_AGENTS: [],
}));

jest.mock('../../../../config/chains', () => ({
  CHAIN_CONFIG: {
    8453: { name: 'Base' },
    100: { name: 'Gnosis' },
  },
}));

const twoServices = [
  {
    service_public_id: 'valory/memeooorr_pearl:0.1.0',
    home_chain: 8453,
    service_config_id: 'sc-1',
  },
  {
    service_public_id: 'valory/trader_pearl:0.1.0',
    home_chain: 100,
    service_config_id: 'sc-2',
  },
];

const defaultSetup = (
  overrides: {
    services?: typeof twoServices;
    archivedAgents?: string[];
    runningAgentType?: string | null;
  } = {},
) => {
  const {
    services = twoServices,
    archivedAgents = [],
    runningAgentType = null,
  } = overrides;

  mockUseSetup.mockReturnValue({ goto: mockGotoSetup });
  mockUsePageState.mockReturnValue({
    pageState: PAGES.Main,
    goto: mockGotoPage,
  });
  mockUseServices.mockReturnValue({
    services,
    isLoading: false,
    selectedAgentType: AgentMap.AgentsFun,
    updateAgentType: mockUpdateAgentType,
  });
  mockUseArchivedAgents.mockReturnValue({
    archivedAgents,
    archiveAgent: mockArchiveAgent,
  });
  mockUseMasterWalletContext.mockReturnValue({
    masterSafes: [],
    isLoading: false,
  });
  mockUseAgentRunning.mockReturnValue({ runningAgentType });
  mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
    isPearlWalletRefillRequired: false,
  });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    defaultSetup();
  });

  it('renders agents from services', () => {
    render(<Sidebar />);
    expect(screen.getByText('Agents.fun')).toBeInTheDocument();
    expect(screen.getByText('Omenstrat')).toBeInTheDocument();
  });

  it('hides archived agents from the sidebar list', () => {
    defaultSetup({ archivedAgents: [AgentMap.AgentsFun] });
    render(<Sidebar />);
    expect(screen.queryByText('Agents.fun')).not.toBeInTheDocument();
    expect(screen.getByText('Omenstrat')).toBeInTheDocument();
  });

  it('does not show "…" button when only one agent in sidebar', () => {
    // Only one visible agent (the other is archived)
    defaultSetup({ archivedAgents: [AgentMap.AgentsFun] });
    render(<Sidebar />);
    expect(
      screen.queryByRole('button', { name: /Archive Omenstrat/i }),
    ).not.toBeInTheDocument();
  });

  it('shows "…" button for stopped agents when 2+ agents in sidebar', () => {
    defaultSetup({ runningAgentType: null });
    render(<Sidebar />);
    // Both agents are stopped and 2 agents shown: archive buttons visible (aria-label)
    expect(
      screen.getByRole('button', { name: /Archive Agents\.fun/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Archive Omenstrat/i }),
    ).toBeInTheDocument();
  });

  it('does not show "…" button for the running agent', () => {
    defaultSetup({ runningAgentType: AgentMap.AgentsFun });
    render(<Sidebar />);
    // Running agent has no archive button
    expect(
      screen.queryByRole('button', { name: /Archive Agents\.fun/i }),
    ).not.toBeInTheDocument();
    // Stopped agent still has one
    expect(
      screen.getByRole('button', { name: /Archive Omenstrat/i }),
    ).toBeInTheDocument();
  });

  it('opens archive modal when "Move to archive" is clicked', () => {
    defaultSetup({ runningAgentType: null });
    render(<Sidebar />);

    // Click the first "Move to archive" dropdown item (Dropdown is mocked to render inline)
    const moveToArchiveBtns = screen.getAllByText('Move to archive');
    fireEvent.click(moveToArchiveBtns[0]);

    // Modal should appear with archive content
    expect(screen.getByText('Archive agent')).toBeInTheDocument();
    // The modal's "Archive Agent" confirm button
    expect(
      screen.getByRole('button', { name: 'Archive Agent' }),
    ).toBeInTheDocument();
  });

  it('calls archiveAgent and selects next agent on archive confirm', () => {
    defaultSetup({ runningAgentType: null });
    render(<Sidebar />);

    const moveToArchiveBtns = screen.getAllByText('Move to archive');
    fireEvent.click(moveToArchiveBtns[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Archive Agent' }));

    expect(mockArchiveAgent).toHaveBeenCalledTimes(1);
  });

  it('shows "Add New Agent" button when there are archived agents (even if no new agents)', () => {
    // AVAILABLE_FOR_ADDING_AGENTS is [] in mock, so normally button would be hidden.
    // But archived agents exist, so the button must still show for restore flow.
    defaultSetup({ archivedAgents: ['memeooorr'], services: twoServices });
    render(<Sidebar />);
    expect(
      screen.getByRole('button', { name: /Add New Agent/i }),
    ).toBeInTheDocument();
  });

  it('dismisses modal on cancel without archiving', () => {
    defaultSetup({ runningAgentType: null });
    render(<Sidebar />);

    const moveToArchiveBtns = screen.getAllByText('Move to archive');
    fireEvent.click(moveToArchiveBtns[0]);

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(mockArchiveAgent).not.toHaveBeenCalled();
    expect(screen.queryByText('Archive agent')).not.toBeInTheDocument();
  });
});
