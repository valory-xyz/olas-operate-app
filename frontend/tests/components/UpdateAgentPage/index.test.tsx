import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------
import { UpdateAgentPage } from '../../../components/UpdateAgentPage/index';
import { AgentMap, AgentType } from '../../../constants/agent';
import { AgentConfig } from '../../../types/Agent';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockUseServices = jest.fn();
jest.mock('../../../hooks/useServices', () => ({
  useServices: () => mockUseServices(),
}));

const mockDisplayForm = jest.fn();
jest.mock(
  '../../../components/SetupPage/SetupYourAgent/useDisplayAgentForm',
  () => ({
    useDisplayAgentForm: () => mockDisplayForm,
    AgentFormContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="agent-form-container">{children}</div>
    ),
  }),
);

jest.mock(
  '../../../components/UpdateAgentPage/context/UpdateAgentProvider',
  () => ({
    UpdateAgentProvider: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="update-agent-provider">{children}</div>
    ),
  }),
);

jest.mock(
  '../../../components/UpdateAgentPage/components/PredictUpdateForm',
  () => ({
    PredictUpdatePage: ({ renderForm }: { renderForm: unknown }) => (
      <div
        data-testid="predict-update"
        data-has-render-form={String(!!renderForm)}
      />
    ),
  }),
);

jest.mock(
  '../../../components/UpdateAgentPage/components/AgentsFunUpdateForm',
  () => ({
    AgentsFunUpdateForm: ({ renderForm }: { renderForm: unknown }) => (
      <div
        data-testid="agentsfun-update"
        data-has-render-form={String(!!renderForm)}
      />
    ),
  }),
);

jest.mock(
  '../../../components/UpdateAgentPage/components/ModiusUpdateForm',
  () => ({
    ModiusUpdatePage: ({ renderForm }: { renderForm: unknown }) => (
      <div
        data-testid="modius-update"
        data-has-render-form={String(!!renderForm)}
      />
    ),
  }),
);

jest.mock(
  '../../../components/UpdateAgentPage/components/OptimusUpdateForm',
  () => ({
    OptimusUpdatePage: ({ renderForm }: { renderForm: unknown }) => (
      <div
        data-testid="optimus-update"
        data-has-render-form={String(!!renderForm)}
      />
    ),
  }),
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeAgentConfig = (overrides: Partial<AgentConfig> = {}) =>
  ({
    isX402Enabled: false,
    displayName: 'Test Agent',
    ...overrides,
  }) as AgentConfig;

const setupMock = (
  agentType: AgentType,
  configOverrides: Partial<AgentConfig> = {},
) => {
  mockUseServices.mockReturnValue({
    selectedAgentType: agentType,
    selectedAgentConfig: makeAgentConfig(configOverrides),
  });
};

// ---------------------------------------------------------------------------
// Error boundary helper for testing thrown errors in render
// ---------------------------------------------------------------------------

class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <div data-testid="error-message">{this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UpdateAgentPage', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('x402 guard', () => {
    it('throws when isX402Enabled is true', () => {
      setupMock(AgentMap.PredictTrader, { isX402Enabled: true });

      render(
        <TestErrorBoundary>
          <UpdateAgentPage />
        </TestErrorBoundary>,
      );

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Updating agent feature is not supported for the selected agent.',
      );
    });

    it('does not throw when isX402Enabled is false', () => {
      setupMock(AgentMap.PredictTrader, { isX402Enabled: false });

      render(
        <TestErrorBoundary>
          <UpdateAgentPage />
        </TestErrorBoundary>,
      );

      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      expect(screen.getByTestId('agent-form-container')).toBeInTheDocument();
    });
  });

  describe('agent type routing', () => {
    it.each([
      {
        agentType: AgentMap.PredictTrader,
        testId: 'predict-update',
        label: 'PredictUpdatePage',
      },
      {
        agentType: AgentMap.AgentsFun,
        testId: 'agentsfun-update',
        label: 'AgentsFunUpdateForm',
      },
      {
        agentType: AgentMap.Modius,
        testId: 'modius-update',
        label: 'ModiusUpdatePage',
      },
      {
        agentType: AgentMap.Optimus,
        testId: 'optimus-update',
        label: 'OptimusUpdatePage',
      },
    ])(
      'renders $label when selectedAgentType is $agentType',
      ({ agentType, testId }) => {
        setupMock(agentType);
        render(<UpdateAgentPage />);

        expect(screen.getByTestId(testId)).toBeInTheDocument();
      },
    );

    it.each([
      {
        agentType: AgentMap.PredictTrader,
        excludedTestIds: [
          'agentsfun-update',
          'modius-update',
          'optimus-update',
        ],
      },
      {
        agentType: AgentMap.AgentsFun,
        excludedTestIds: ['predict-update', 'modius-update', 'optimus-update'],
      },
      {
        agentType: AgentMap.Modius,
        excludedTestIds: [
          'predict-update',
          'agentsfun-update',
          'optimus-update',
        ],
      },
      {
        agentType: AgentMap.Optimus,
        excludedTestIds: [
          'predict-update',
          'agentsfun-update',
          'modius-update',
        ],
      },
    ])(
      'does not render other forms when selectedAgentType is $agentType',
      ({ agentType, excludedTestIds }) => {
        setupMock(agentType);
        render(<UpdateAgentPage />);

        for (const testId of excludedTestIds) {
          expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
        }
      },
    );
  });

  describe('unknown agent type', () => {
    it('renders no form component for unsupported agent types (e.g., PettAi)', () => {
      setupMock(AgentMap.PettAi);
      render(<UpdateAgentPage />);

      expect(screen.getByTestId('update-agent-provider')).toBeInTheDocument();
      expect(screen.queryByTestId('predict-update')).not.toBeInTheDocument();
      expect(screen.queryByTestId('agentsfun-update')).not.toBeInTheDocument();
      expect(screen.queryByTestId('modius-update')).not.toBeInTheDocument();
      expect(screen.queryByTestId('optimus-update')).not.toBeInTheDocument();
    });
  });

  describe('structure', () => {
    it('always wraps content in AgentFormContainer', () => {
      setupMock(AgentMap.PredictTrader);
      render(<UpdateAgentPage />);

      expect(screen.getByTestId('agent-form-container')).toBeInTheDocument();
    });

    it('always wraps content in UpdateAgentProvider', () => {
      setupMock(AgentMap.PredictTrader);
      render(<UpdateAgentPage />);

      expect(screen.getByTestId('update-agent-provider')).toBeInTheDocument();
    });

    it('nests UpdateAgentProvider inside AgentFormContainer', () => {
      setupMock(AgentMap.PredictTrader);
      render(<UpdateAgentPage />);

      const container = screen.getByTestId('agent-form-container');
      const provider = screen.getByTestId('update-agent-provider');
      expect(container).toContainElement(provider);
    });

    it('passes displayForm as renderForm prop to the form component', () => {
      setupMock(AgentMap.PredictTrader);
      render(<UpdateAgentPage />);

      const formComponent = screen.getByTestId('predict-update');
      expect(formComponent).toHaveAttribute('data-has-render-form', 'true');
    });
  });
});
