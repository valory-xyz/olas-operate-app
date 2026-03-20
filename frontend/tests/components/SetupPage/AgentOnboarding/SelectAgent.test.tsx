import { fireEvent, render, screen } from '@testing-library/react';

import { SelectAgent } from '../../../../components/SetupPage/AgentOnboarding/SelectAgent';
import { AgentMap } from '../../../../constants/agent';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const mockUseArchivedAgents = jest.fn();
const mockUseServices = jest.fn();

jest.mock('../../../../hooks', () => ({
  useArchivedAgents: (...args: unknown[]) => mockUseArchivedAgents(...args),
  useServices: (...args: unknown[]) => mockUseServices(...args),
}));

jest.mock('../../../../config/agents', () => ({
  ACTIVE_AGENTS: [
    [
      'trader',
      {
        displayName: 'Omenstrat',
        servicePublicId: 'sp-1',
        middlewareHomeChainId: 100,
        isUnderConstruction: false,
      },
    ],
    [
      'memeooorr',
      {
        displayName: 'Agents.fun',
        servicePublicId: 'sp-2',
        middlewareHomeChainId: 8453,
        isUnderConstruction: false,
      },
    ],
  ],
}));

// Mock ArchivedAgentsList to keep this test focused on SelectAgent
jest.mock(
  '../../../../components/SetupPage/AgentOnboarding/ArchivedAgentsList',
  () => ({
    ArchivedAgentsList: ({
      onSelectAgent,
    }: {
      onSelectAgent: (t: string) => void;
    }) => (
      <div data-testid="archived-agents-list">
        <button onClick={() => onSelectAgent(AgentMap.AgentsFun)}>
          Agents.fun (archived)
        </button>
      </div>
    ),
  }),
);

const defaultProps = {
  selectedAgent: undefined,
  activeTab: 'new' as const,
  onSelectYourAgent: jest.fn(),
  onSelectArchivedAgent: jest.fn(),
};

describe('SelectAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServices.mockReturnValue({
      services: [{}],
      getInstancesOfAgentType: () => [],
    });
    mockUseArchivedAgents.mockReturnValue({ archivedAgents: [] });
  });

  it('shows new agents list when activeTab is "new"', () => {
    mockUseServices.mockReturnValue({
      services: [],
      getInstancesOfAgentType: () => [],
    });
    render(<SelectAgent {...defaultProps} activeTab="new" />);
    expect(screen.getByText('Omenstrat')).toBeInTheDocument();
    expect(
      screen.queryByTestId('archived-agents-list'),
    ).not.toBeInTheDocument();
  });

  it('shows archived agents list when activeTab is "archived"', () => {
    render(<SelectAgent {...defaultProps} activeTab="archived" />);
    expect(screen.getByTestId('archived-agents-list')).toBeInTheDocument();
  });

  it('calls onSelectArchivedAgent when an archived agent is selected', () => {
    const onSelectArchivedAgent = jest.fn();
    render(
      <SelectAgent
        {...defaultProps}
        activeTab="archived"
        onSelectArchivedAgent={onSelectArchivedAgent}
      />,
    );
    fireEvent.click(screen.getByText('Agents.fun (archived)'));
    expect(onSelectArchivedAgent).toHaveBeenCalledWith(AgentMap.AgentsFun);
  });

  it('filters archived agents from the new agents list', () => {
    mockUseArchivedAgents.mockReturnValue({
      archivedAgents: [AgentMap.AgentsFun],
    });
    mockUseServices.mockReturnValue({
      services: [],
      getInstancesOfAgentType: () => [],
    });
    render(<SelectAgent {...defaultProps} activeTab="new" />);
    expect(screen.getByText('Omenstrat')).toBeInTheDocument();
    expect(screen.queryByText('Agents.fun')).not.toBeInTheDocument();
  });
});
