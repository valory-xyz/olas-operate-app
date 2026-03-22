import { fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';

import { AutoRunControl } from '../../../../components/MainPage/Sidebar/AutoRunControl';
import { IncludedAgentInstance } from '../../../../context/AutoRunProvider/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetEnabled = jest.fn();
const mockIncludeInstance = jest.fn();
const mockExcludeInstance = jest.fn();

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
  ACTIVE_AGENTS: [
    [
      'trader',
      {
        displayName: 'Omenstrat',
        servicePublicId: 'valory/trader',
        evmHomeChainId: 100,
      },
    ],
    [
      'modius',
      {
        displayName: 'Modius',
        servicePublicId: 'valory/modius',
        evmHomeChainId: 8453,
      },
    ],
    [
      'memeooorr',
      {
        displayName: 'Agents.fun',
        servicePublicId: 'valory/memeooorr',
        evmHomeChainId: 8453,
      },
    ],
  ],
}));

jest.mock('../../../../utils', () => ({
  isServiceOfAgent: jest.fn(
    (
      service: { service_public_id: string },
      config: { servicePublicId: string },
    ) => service.service_public_id === config.servicePublicId,
  ),
  getServiceInstanceName: jest.fn(
    (service: { service_config_id: string }) => service.service_config_id,
  ),
}));

jest.mock('../../../../constants', () => ({
  ...jest.requireActual('../../../../constants/agent'),
  COLOR: { PURPLE_LIGHT_3: '#f0e6ff', GRAY_4: '#d9d9d9' },
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

// Mock next/image
jest.mock('next/image', () => {
  const MockImage = (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  );
  MockImage.displayName = 'MockImage';
  return MockImage;
});

// Mock AgentTree components to avoid deep import chain (constants/parseEther)
jest.mock('../../../../components/ui/AgentTree', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  return {
    AgentGroup: ({
      agentType,
      instances,
      renderInstanceTrailing,
    }: {
      agentType: string;
      instances: Array<{ serviceConfigId: string; name: string }>;
      renderInstanceTrailing?: (id: string) => React.ReactNode;
    }) => (
      <div data-testid={`agent-group-${agentType}`}>
        <span>
          {/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
          {require('../../../../config/agents').AGENT_CONFIG[agentType]
            ?.displayName ?? agentType}
        </span>
        {instances.map((inst: { serviceConfigId: string; name: string }) => (
          <div
            key={inst.serviceConfigId}
            data-testid={`instance-${inst.serviceConfigId}`}
          >
            <span>{inst.name}</span>
            {renderInstanceTrailing?.(inst.serviceConfigId)}
          </div>
        ))}
      </div>
    ),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SetupOptions = {
  enabled?: boolean;
  includedInstances?: IncludedAgentInstance[];
  excludedInstances?: string[];
  eligibilityByInstance?: Record<string, { canRun: boolean; reason?: string }>;
  isToggling?: boolean;
  runningServiceConfigId?: string | null;
  isServiceTransitioning?: boolean;
  selectedServiceConfigId?: string | undefined;
  services?: Array<{ service_config_id: string; service_public_id: string }>;
};

const defaultSetup = (overrides: SetupOptions = {}) => {
  const {
    enabled = true,
    includedInstances = [
      { serviceConfigId: 'sc-trader-1', order: 0 },
      { serviceConfigId: 'sc-modius-1', order: 1 },
    ],
    excludedInstances = ['sc-memeooorr-1'],
    eligibilityByInstance = {},
    isToggling = false,
    runningServiceConfigId = null,
    isServiceTransitioning = false,
    selectedServiceConfigId = 'sc-trader-1',
    services = [
      { service_config_id: 'sc-trader-1', service_public_id: 'valory/trader' },
      { service_config_id: 'sc-modius-1', service_public_id: 'valory/modius' },
      {
        service_config_id: 'sc-memeooorr-1',
        service_public_id: 'valory/memeooorr',
      },
    ],
  } = overrides;

  mockUseAutoRunContext.mockReturnValue({
    enabled,
    includedInstances,
    excludedInstances,
    eligibilityByInstance,
    isToggling,
    setEnabled: mockSetEnabled,
    includeInstance: mockIncludeInstance,
    excludeInstance: mockExcludeInstance,
  });

  mockUseAgentRunning.mockReturnValue({
    runningAgentType: null,
    isAnotherAgentRunning: false,
    runningServiceConfigId,
  });

  mockUseServices.mockReturnValue({
    services,
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
  // Included instances section
  // -----------------------------------------------------------------------

  describe('Included instances section', () => {
    it('shows agent display names for each included group', () => {
      defaultSetup();
      render(<AutoRunControl />);

      expect(screen.getByText('Omenstrat')).toBeInTheDocument();
      expect(screen.getByText('Modius')).toBeInTheDocument();
    });

    it('shows "No agents enabled." when includedInstances is empty', () => {
      defaultSetup({ includedInstances: [], excludedInstances: [] });
      render(<AutoRunControl />);

      expect(screen.getByText('No agents enabled.')).toBeInTheDocument();
    });

    it('exclude button calls excludeInstance with service config id', () => {
      defaultSetup({
        includedInstances: [
          { serviceConfigId: 'sc-trader-1', order: 0 },
          { serviceConfigId: 'sc-modius-1', order: 1 },
        ],
        excludedInstances: [],
      });
      render(<AutoRunControl />);

      const popoverContent = screen.getByTestId('popover-content');
      const dangerButtons = popoverContent.querySelectorAll(
        'button.ant-btn-dangerous',
      );
      expect(dangerButtons.length).toBeGreaterThanOrEqual(2);

      fireEvent.click(dangerButtons[0]);
      expect(mockExcludeInstance).toHaveBeenCalledWith('sc-trader-1');

      fireEvent.click(dangerButtons[1]);
      expect(mockExcludeInstance).toHaveBeenCalledWith('sc-modius-1');
    });
  });

  // -----------------------------------------------------------------------
  // Excluded instances section
  // -----------------------------------------------------------------------

  describe('Excluded instances section', () => {
    it('excluded section is not shown when excludedInstances is empty', () => {
      defaultSetup({ excludedInstances: [] });
      render(<AutoRunControl />);

      expect(
        screen.queryByText('Excluded from auto-run'),
      ).not.toBeInTheDocument();
    });

    it('shows excluded section when excludedInstances has entries', () => {
      defaultSetup({
        excludedInstances: ['sc-memeooorr-1'],
        eligibilityByInstance: {
          'sc-memeooorr-1': { canRun: true },
        },
      });
      render(<AutoRunControl />);

      expect(screen.getByText('Excluded from auto-run')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Section visibility when disabled
  // -----------------------------------------------------------------------

  describe('Section visibility when disabled', () => {
    it('agent lists are not shown when enabled is false', () => {
      defaultSetup({
        enabled: false,
        includedInstances: [
          { serviceConfigId: 'sc-trader-1', order: 0 },
          { serviceConfigId: 'sc-modius-1', order: 1 },
        ],
        excludedInstances: ['sc-memeooorr-1'],
      });
      render(<AutoRunControl />);

      expect(screen.queryByText('Omenstrat')).not.toBeInTheDocument();
      expect(screen.queryByText('Modius')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Excluded from auto-run'),
      ).not.toBeInTheDocument();
    });
  });
});
