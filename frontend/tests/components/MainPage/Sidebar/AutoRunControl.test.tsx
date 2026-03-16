import { fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';

import { AutoRunControl } from '../../../../components/MainPage/Sidebar/AutoRunControl';
import { AgentMap, AgentType } from '../../../../constants/agent';
import { IncludedAgent } from '../../../../context/AutoRunProvider/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetEnabled = jest.fn();
const mockIncludeAgent = jest.fn();
const mockExcludeAgent = jest.fn();

const mockUseAutoRunContext = jest.fn();
jest.mock('../../../../context/AutoRunProvider', () => ({
  useAutoRunContext: (...args: unknown[]) => mockUseAutoRunContext(...args),
}));

const mockUseAgentRunning = jest.fn();
const mockUseService = jest.fn();
const mockUseServices = jest.fn();
jest.mock('../../../../hooks', () => ({
  useAgentRunning: (...args: unknown[]) => mockUseAgentRunning(...args),
  useService: (...args: unknown[]) => mockUseService(...args),
  useServices: (...args: unknown[]) => mockUseServices(...args),
}));

jest.mock('../../../../config/agents', () => ({
  AGENT_CONFIG: {
    trader: { displayName: 'Omenstrat' },
    memeooorr: { displayName: 'Agents.fun' },
    modius: { displayName: 'Modius' },
    optimus: { displayName: 'Optimus' },
    pett_ai: { displayName: 'PettBro by Pett.ai' },
    polymarket_trader: { displayName: 'Polystrat' },
  },
}));

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

// Mock Popover to render its content inline for testability.
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    Popover: ({
      content,
      children,
    }: {
      content: ReactNode;
      children: ReactNode;
    }) => (
      <div data-testid="popover">
        {children}
        <div data-testid="popover-content">{content}</div>
      </div>
    ),
  };
});

// Suppress antd Image preview warnings
jest.mock('antd/es/image', () => {
  const actual = jest.requireActual('antd');
  return actual.Image;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SetupOptions = {
  enabled?: boolean;
  includedAgents?: IncludedAgent[];
  excludedAgents?: AgentType[];
  eligibilityByAgent?: Record<string, { canRun: boolean; reason?: string }>;
  isToggling?: boolean;
  runningAgentType?: AgentType | null;
  isServiceTransitioning?: boolean;
  selectedServiceConfigId?: string | undefined;
};

const defaultSetup = (overrides: SetupOptions = {}) => {
  const {
    enabled = true,
    includedAgents = [
      { agentType: AgentMap.PredictTrader, order: 0 },
      { agentType: AgentMap.Modius, order: 1 },
    ],
    excludedAgents = [AgentMap.AgentsFun],
    eligibilityByAgent = {},
    isToggling = false,
    runningAgentType = null,
    isServiceTransitioning = false,
    selectedServiceConfigId = 'sc-test-1234',
  } = overrides;

  mockUseAutoRunContext.mockReturnValue({
    enabled,
    includedAgents,
    excludedAgents,
    eligibilityByAgent,
    isToggling,
    setEnabled: mockSetEnabled,
    includeAgent: mockIncludeAgent,
    excludeAgent: mockExcludeAgent,
  });

  mockUseAgentRunning.mockReturnValue({
    runningAgentType,
    isAnotherAgentRunning: false,
    runningServiceConfigId: null,
  });

  mockUseServices.mockReturnValue({
    selectedService: selectedServiceConfigId
      ? { service_config_id: selectedServiceConfigId }
      : undefined,
  });

  mockUseService.mockReturnValue({
    isServiceTransitioning,
  });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AutoRunControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    defaultSetup();
  });

  // -----------------------------------------------------------------------
  // On / Off label
  // -----------------------------------------------------------------------

  describe('On/Off label', () => {
    it('shows "On" text when enabled is true', () => {
      defaultSetup({ enabled: true });
      render(<AutoRunControl />);
      expect(screen.getByText('On')).toBeInTheDocument();
    });

    it('shows "Off" text when enabled is false', () => {
      defaultSetup({ enabled: false });
      render(<AutoRunControl />);
      expect(screen.getByText('Off')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Switch toggle
  // -----------------------------------------------------------------------

  describe('Switch toggle', () => {
    it('calls setEnabled on change', () => {
      defaultSetup({ enabled: false });
      render(<AutoRunControl />);

      const switchEl = screen.getByRole('switch');
      fireEvent.click(switchEl);
      expect(mockSetEnabled).toHaveBeenCalledTimes(1);
      expect(mockSetEnabled.mock.calls[0][0]).toBe(true);
    });

    it('shows loading state when isToggling is true', () => {
      defaultSetup({ isToggling: true });
      render(<AutoRunControl />);

      const switchEl = screen.getByRole('switch');
      // antd Switch with loading renders an internal loading icon
      expect(switchEl.querySelector('.ant-switch-loading-icon')).toBeTruthy();
    });

    it('shows loading state when isServiceTransitioning is true', () => {
      defaultSetup({ isServiceTransitioning: true });
      render(<AutoRunControl />);

      const switchEl = screen.getByRole('switch');
      expect(switchEl.querySelector('.ant-switch-loading-icon')).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // Included agents section
  // -----------------------------------------------------------------------

  describe('Included agents section', () => {
    it('shows agent display names for each included agent', () => {
      defaultSetup({
        includedAgents: [
          { agentType: AgentMap.PredictTrader, order: 0 },
          { agentType: AgentMap.Modius, order: 1 },
        ],
      });
      render(<AutoRunControl />);

      expect(screen.getByText('Omenstrat')).toBeInTheDocument();
      expect(screen.getByText('Modius')).toBeInTheDocument();
    });

    it('shows "No agents enabled." when includedAgents is empty', () => {
      defaultSetup({ includedAgents: [], excludedAgents: [] });
      render(<AutoRunControl />);

      expect(screen.getByText('No agents enabled.')).toBeInTheDocument();
    });

    it('exclude button calls excludeAgent with agent type', () => {
      defaultSetup({
        includedAgents: [
          { agentType: AgentMap.PredictTrader, order: 0 },
          { agentType: AgentMap.Modius, order: 1 },
        ],
        excludedAgents: [],
      });
      render(<AutoRunControl />);

      const popoverContent = screen.getByTestId('popover-content');
      const dangerButtons = popoverContent.querySelectorAll(
        'button.ant-btn-dangerous',
      );
      expect(dangerButtons).toHaveLength(2);

      fireEvent.click(dangerButtons[0]);
      expect(mockExcludeAgent).toHaveBeenCalledWith(AgentMap.PredictTrader);

      fireEvent.click(dangerButtons[1]);
      expect(mockExcludeAgent).toHaveBeenCalledWith(AgentMap.Modius);
    });

    it('exclude button is disabled when agent is currently running', () => {
      defaultSetup({
        includedAgents: [
          { agentType: AgentMap.PredictTrader, order: 0 },
          { agentType: AgentMap.Modius, order: 1 },
        ],
        runningAgentType: AgentMap.PredictTrader,
      });
      render(<AutoRunControl />);

      const popoverContent = screen.getByTestId('popover-content');
      const dangerButtons = popoverContent.querySelectorAll(
        'button.ant-btn-dangerous',
      );

      // First button (PredictTrader) should be disabled because it's running
      expect(dangerButtons[0]).toBeDisabled();
      // Second button (Modius) should NOT be disabled
      expect(dangerButtons[1]).not.toBeDisabled();
    });

    it('exclude button is disabled when it is the last included agent', () => {
      defaultSetup({
        includedAgents: [{ agentType: AgentMap.PredictTrader, order: 0 }],
        excludedAgents: [AgentMap.Modius],
      });
      render(<AutoRunControl />);

      const popoverContent = screen.getByTestId('popover-content');
      const dangerButtons = popoverContent.querySelectorAll(
        'button.ant-btn-dangerous',
      );
      expect(dangerButtons).toHaveLength(1);
      expect(dangerButtons[0]).toBeDisabled();
    });
  });

  // -----------------------------------------------------------------------
  // Excluded agents section
  // -----------------------------------------------------------------------

  describe('Excluded agents section', () => {
    it('excluded section is not shown when excludedAgents is empty', () => {
      defaultSetup({ excludedAgents: [] });
      render(<AutoRunControl />);

      expect(
        screen.queryByText('Excluded from auto-run'),
      ).not.toBeInTheDocument();
    });

    it('shows excluded agents with "+" include button', () => {
      defaultSetup({
        excludedAgents: [AgentMap.AgentsFun],
        eligibilityByAgent: {
          [AgentMap.AgentsFun]: { canRun: true },
        },
      });
      render(<AutoRunControl />);

      expect(screen.getByText('Excluded from auto-run')).toBeInTheDocument();
      expect(screen.getByText('Agents.fun')).toBeInTheDocument();

      // The "+" include button is a non-danger button in the excluded section
      const popoverContent = screen.getByTestId('popover-content');
      const nonDangerButtons = Array.from(
        popoverContent.querySelectorAll('button.ant-btn'),
      ).filter((btn) => !btn.classList.contains('ant-btn-dangerous'));

      expect(nonDangerButtons.length).toBeGreaterThanOrEqual(1);
      expect(nonDangerButtons[0]).not.toBeDisabled();
    });

    it('"+" button is disabled when eligibilityByAgent[agentType].canRun is false', () => {
      defaultSetup({
        includedAgents: [{ agentType: AgentMap.PredictTrader, order: 0 }],
        excludedAgents: [AgentMap.AgentsFun],
        eligibilityByAgent: {
          [AgentMap.AgentsFun]: { canRun: false },
        },
      });
      render(<AutoRunControl />);

      const popoverContent = screen.getByTestId('popover-content');
      const allButtons = Array.from(
        popoverContent.querySelectorAll('button.ant-btn'),
      );

      // Exclude buttons are danger, include buttons are not
      const includeButtons = allButtons.filter(
        (btn) => !btn.classList.contains('ant-btn-dangerous'),
      );
      expect(includeButtons.length).toBeGreaterThanOrEqual(1);
      expect(includeButtons[0]).toBeDisabled();
    });
  });

  // -----------------------------------------------------------------------
  // Include / exclude callbacks
  // -----------------------------------------------------------------------

  describe('Include/exclude callbacks', () => {
    it('includeAgent is called with correct agent type', () => {
      defaultSetup({
        includedAgents: [{ agentType: AgentMap.PredictTrader, order: 0 }],
        excludedAgents: [AgentMap.Modius],
        eligibilityByAgent: {
          [AgentMap.Modius]: { canRun: true },
        },
      });
      render(<AutoRunControl />);

      const popoverContent = screen.getByTestId('popover-content');
      const allButtons = Array.from(
        popoverContent.querySelectorAll('button.ant-btn'),
      );

      // Include button is non-danger
      const includeButtons = allButtons.filter(
        (btn) => !btn.classList.contains('ant-btn-dangerous'),
      );
      expect(includeButtons.length).toBeGreaterThanOrEqual(1);

      fireEvent.click(includeButtons[0]);
      expect(mockIncludeAgent).toHaveBeenCalledWith(AgentMap.Modius);
    });

    it('excludeAgent is called with correct agent type', () => {
      defaultSetup({
        includedAgents: [
          { agentType: AgentMap.PredictTrader, order: 0 },
          { agentType: AgentMap.Optimus, order: 1 },
        ],
        excludedAgents: [],
      });
      render(<AutoRunControl />);

      const popoverContent = screen.getByTestId('popover-content');
      const dangerButtons = popoverContent.querySelectorAll(
        'button.ant-btn-dangerous',
      );
      expect(dangerButtons).toHaveLength(2);

      fireEvent.click(dangerButtons[1]);
      expect(mockExcludeAgent).toHaveBeenCalledWith(AgentMap.Optimus);
    });
  });

  // -----------------------------------------------------------------------
  // Section visibility when disabled
  // -----------------------------------------------------------------------

  describe('Section visibility when disabled', () => {
    it('agent lists are not shown when enabled is false', () => {
      defaultSetup({
        enabled: false,
        includedAgents: [
          { agentType: AgentMap.PredictTrader, order: 0 },
          { agentType: AgentMap.Modius, order: 1 },
        ],
        excludedAgents: [AgentMap.AgentsFun],
      });
      render(<AutoRunControl />);

      // Agent display names should not appear
      expect(screen.queryByText('Omenstrat')).not.toBeInTheDocument();
      expect(screen.queryByText('Modius')).not.toBeInTheDocument();
      expect(screen.queryByText('Agents.fun')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Excluded from auto-run'),
      ).not.toBeInTheDocument();
    });
  });
});
