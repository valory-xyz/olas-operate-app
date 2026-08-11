import { fireEvent, render, screen } from '@testing-library/react';

import { AgentOnboarding } from '../../../../components/SetupPage/AgentOnboarding/AgentOnboarding';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

const mockUseSetup = jest.fn();
const mockUsePageState = jest.fn();
const mockUseServices = jest.fn();
const mockUseArchivedAgents = jest.fn();
const mockUseIsAgentGeoRestricted = jest.fn();
const mockCreateConnectService = jest.fn();

jest.mock('../../../../hooks', () => ({
  useSetup: (...args: unknown[]) => mockUseSetup(...args),
  usePageState: (...args: unknown[]) => mockUsePageState(...args),
  useServices: (...args: unknown[]) => mockUseServices(...args),
  useArchivedAgents: (...args: unknown[]) => mockUseArchivedAgents(...args),
  useIsAgentGeoRestricted: (...args: unknown[]) =>
    mockUseIsAgentGeoRestricted(...args),
  useCreateConnectService: () => mockCreateConnectService,
}));

jest.mock('../../../../config/agents', () => ({
  AGENT_CONFIG: {
    trader: {
      isComingSoon: false,
      requiresSetup: true,
      isX402Enabled: false,
      isUnderConstruction: false,
      isGeoLocationRestricted: false,
      isAddingNewBlocked: false,
    },
    connect: {
      displayName: 'Connect',
      servicePublicId: 'valory/connect:0.1.0',
      supportedChains: [137, 8453, 100],
      evmHomeChainId: 100,
      middlewareHomeChainId: 'gnosis',
    },
  },
}));

jest.mock('../../../../components/AgentIntroduction', () => ({
  AgentIntroduction: ({
    renderFundingRequirements,
    renderAgentSelection,
  }: {
    renderFundingRequirements?: (desc: string) => React.ReactNode;
    renderAgentSelection?: () => React.ReactNode;
  }) => (
    <div data-testid="agent-introduction">
      {renderFundingRequirements?.('')}
      {renderAgentSelection?.()}
    </div>
  ),
}));

jest.mock('../../../../components/ui', () => ({
  Segmented: ({ value }: { value: string }) => (
    <div data-testid="segmented-value">{value}</div>
  ),
}));

jest.mock('../../../../components/ui/BackButton', () => ({
  BackButton: () => <div data-testid="back-button" />,
}));

jest.mock(
  '../../../../components/SetupPage/AgentOnboarding/FundingRequirementStep',
  () => ({
    FundingRequirementStep: ({
      onAcceptRisksChange,
    }: {
      onAcceptRisksChange?: (checked: boolean) => void;
    }) => (
      <div data-testid="funding-requirement-step">
        {onAcceptRisksChange && (
          <button
            data-testid="mock-accept-connect-risks"
            onClick={() => onAcceptRisksChange(true)}
          >
            Mock Accept Risks
          </button>
        )}
      </div>
    ),
  }),
);

jest.mock(
  '../../../../components/SetupPage/AgentOnboarding/RestrictedRegion',
  () => ({
    RestrictedRegion: () => <div data-testid="restricted-region" />,
  }),
);

jest.mock(
  '../../../../components/SetupPage/AgentOnboarding/SelectAgent',
  () => ({
    AGENT_TAB: {
      New: 'new',
      Archived: 'archived',
    },
    SelectAgent: ({
      activeTab,
      onSelectYourAgent,
    }: {
      activeTab: string;
      onSelectYourAgent?: (agentType: string) => void;
    }) => (
      <div>
        <div data-testid="select-agent-active-tab">{activeTab}</div>
        {onSelectYourAgent && (
          <>
            <button
              data-testid="mock-select-trader"
              onClick={() => onSelectYourAgent('trader')}
            >
              Mock Select Trader
            </button>
            <button
              data-testid="mock-select-connect"
              onClick={() => onSelectYourAgent('connect')}
            >
              Mock Select Connect
            </button>
          </>
        )}
      </div>
    ),
  }),
);

describe('AgentOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSetup.mockReturnValue({ goto: jest.fn() });
    mockUsePageState.mockReturnValue({ goto: jest.fn() });
    mockUseServices.mockReturnValue({
      services: [
        {
          service_config_id: 'archived-1',
          service_public_id: 'valory/trader_pearl:0.1.0',
          home_chain: 100,
        },
      ],
      selectAgentTypeForSetup: jest.fn(),
      updateSelectedServiceConfigId: jest.fn(),
      getAgentTypeFromService: jest.fn(),
    });
    mockUseArchivedAgents.mockReturnValue({
      archivedInstances: ['archived-1'],
      unarchiveInstance: jest.fn(),
    });
    mockUseIsAgentGeoRestricted.mockReturnValue({
      isAgentGeoRestricted: false,
      isGeoLoading: false,
      isGeoError: false,
    });
  });

  it('keeps the new agents tab selected by default when archived instances exist', () => {
    render(<AgentOnboarding />);

    expect(screen.getByTestId('segmented-value')).toHaveTextContent('new');
    expect(screen.getByTestId('select-agent-active-tab')).toHaveTextContent(
      'new',
    );
  });

  it('hides "Select Agent" button when selected agent has isAddingNewBlocked true', () => {
    const { AGENT_CONFIG } = jest.requireMock('../../../../config/agents');
    AGENT_CONFIG.trader.isAddingNewBlocked = true;

    render(<AgentOnboarding />);
    fireEvent.click(screen.getByTestId('mock-select-trader'));

    expect(
      screen.queryByRole('button', { name: 'Select Agent' }),
    ).not.toBeInTheDocument();

    AGENT_CONFIG.trader.isAddingNewBlocked = false;
  });

  describe('Connect — connectAllChainsOccupied', () => {
    const connectService = (homeChain: string) => ({
      service_config_id: `sc-connect-${homeChain}`,
      service_public_id: 'valory/connect:0.1.0',
      home_chain: homeChain,
    });

    it('hides "Select Agent" button when every supported chain has a Connect instance', () => {
      // Connect supportedChains: [137 (polygon), 8453 (base), 100 (gnosis)].
      mockUseServices.mockReturnValue({
        services: [
          connectService('polygon'),
          connectService('base'),
          connectService('gnosis'),
        ],
        selectAgentTypeForSetup: jest.fn(),
        updateSelectedServiceConfigId: jest.fn(),
        getAgentTypeFromService: jest.fn(),
      });

      render(<AgentOnboarding />);
      fireEvent.click(screen.getByTestId('mock-select-connect'));

      expect(
        screen.queryByRole('button', { name: 'Select Agent' }),
      ).not.toBeInTheDocument();
    });

    it('shows "Select Agent" button when at least one supported chain is free', () => {
      mockUseServices.mockReturnValue({
        services: [connectService('polygon'), connectService('base')],
        selectAgentTypeForSetup: jest.fn(),
        updateSelectedServiceConfigId: jest.fn(),
        getAgentTypeFromService: jest.fn(),
      });

      render(<AgentOnboarding />);
      fireEvent.click(screen.getByTestId('mock-select-connect'));

      expect(
        screen.getByRole('button', { name: 'Select Agent' }),
      ).toBeInTheDocument();
    });
  });

  describe('Connect — risk acknowledgement gating', () => {
    beforeEach(() => {
      mockUseServices.mockReturnValue({
        services: [],
        selectAgentTypeForSetup: jest.fn(),
        updateSelectedServiceConfigId: jest.fn(),
        getAgentTypeFromService: jest.fn(),
      });
      mockUseArchivedAgents.mockReturnValue({
        archivedInstances: [],
        unarchiveInstance: jest.fn(),
      });
    });

    it('disables "Select Agent" until the Connect risks are acknowledged', () => {
      render(<AgentOnboarding />);
      fireEvent.click(screen.getByTestId('mock-select-connect'));

      expect(
        screen.getByRole('button', { name: 'Select Agent' }),
      ).toBeDisabled();

      fireEvent.click(screen.getByTestId('mock-accept-connect-risks'));

      expect(
        screen.getByRole('button', { name: 'Select Agent' }),
      ).toBeEnabled();
    });

    it('resets the acknowledgement when a different agent is selected', () => {
      render(<AgentOnboarding />);
      fireEvent.click(screen.getByTestId('mock-select-connect'));
      fireEvent.click(screen.getByTestId('mock-accept-connect-risks'));
      expect(
        screen.getByRole('button', { name: 'Select Agent' }),
      ).toBeEnabled();

      // Switch away and back — the acknowledgement must not carry over.
      fireEvent.click(screen.getByTestId('mock-select-trader'));
      fireEvent.click(screen.getByTestId('mock-select-connect'));

      expect(
        screen.getByRole('button', { name: 'Select Agent' }),
      ).toBeDisabled();
    });

    it('does not create the Connect service while unacknowledged', () => {
      render(<AgentOnboarding />);
      fireEvent.click(screen.getByTestId('mock-select-connect'));
      fireEvent.click(screen.getByRole('button', { name: 'Select Agent' }));

      expect(mockCreateConnectService).not.toHaveBeenCalled();
    });
  });
});
