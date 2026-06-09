import { render, screen } from '@testing-library/react';
import React from 'react';

// Import after mocks are set up (Jest hoists jest.mock calls)
import { FundingRequirementStep } from '../../../../components/SetupPage/AgentOnboarding/FundingRequirementStep';
import { AgentType } from '../../../../constants/agent';

// ---------------------------------------------------------------------------
// Mocks — must be declared before the import that triggers the module graph
// ---------------------------------------------------------------------------
jest.mock('../../../../components/AgentIntroduction', () => ({
  IntroductionAnimatedContainer: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div data-testid="animated-container">{children}</div>,
}));

jest.mock('../../../../components/ui', () => ({
  Alert: ({
    message,
  }: {
    message: React.ReactNode;
    type?: string;
    showIcon?: boolean;
    fullWidth?: boolean;
    className?: string;
  }) => <div data-testid="alert">{message}</div>,
}));

jest.mock('../../../../hooks', () => ({
  useInitialFundingRequirements: () => ({}),
}));

jest.mock('../../../../utils', () => ({
  asEvmChainDetails: () => ({ name: 'base', displayName: 'Base' }),
}));

jest.mock('../../../../constants', () => ({
  AgentMap: { PettAi: 'pett_ai', Polystrat: 'polystrat' },
  COLOR: { GRAY_3: '#ccc', TEXT_NEUTRAL_TERTIARY: '#999' },
  POLYMARKET_DEPOSIT_WALLET_MIGRATION_URL: 'https://example.com',
  UNICODE_SYMBOLS: { EXTERNAL_LINK: '↗' },
  X_DEVELOPER_CONSOLE_URL: 'https://developer.x.com',
}));

jest.mock('../../../../config/tokens', () => ({
  TokenSymbolMap: { OLAS: 'OLAS' },
  TokenSymbolConfigMap: {},
}));

jest.mock('../../../../config/agents', () => ({
  AGENT_CONFIG: {
    pett_ai: {
      displayName: 'PettBro by Pett.ai',
      middlewareHomeChainId: 'base',
      category: undefined,
      isUnderConstruction: false,
      isAddingNewBlocked: true,
      isDecommissioned: false,
      evmHomeChainId: 8453,
    },
  },
}));

describe('FundingRequirementStep — MaintenanceAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows "Existing agents continue to run as usual." when agent is not decommissioned', () => {
    const { AGENT_CONFIG } = jest.requireMock('../../../../config/agents');
    AGENT_CONFIG.pett_ai.isDecommissioned = false;

    render(<FundingRequirementStep agentType={'pett_ai' as AgentType} />);

    expect(
      screen.getByText(/Existing agents continue to run as usual/),
    ).toBeInTheDocument();
  });

  it('omits "Existing agents continue to run as usual." when agent is decommissioned', () => {
    const { AGENT_CONFIG } = jest.requireMock('../../../../config/agents');
    AGENT_CONFIG.pett_ai.isDecommissioned = true;

    render(<FundingRequirementStep agentType={'pett_ai' as AgentType} />);

    expect(
      screen.queryByText(/Existing agents continue to run as usual/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/cannot be created at this time/),
    ).toBeInTheDocument();
  });
});
