import { fireEvent, render, screen } from '@testing-library/react';

import { ArchivedAgentsList } from '../../../../components/SetupPage/AgentOnboarding/ArchivedAgentsList';
import { AgentMap } from '../../../../constants/agent';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const mockUseArchivedAgents = jest.fn();
jest.mock('../../../../hooks', () => ({
  useArchivedAgents: (...args: unknown[]) => mockUseArchivedAgents(...args),
}));

jest.mock('../../../../config/agents', () => ({
  AGENT_CONFIG: {
    memeooorr: {
      displayName: 'Agents.fun',
      isUnderConstruction: false,
    },
    modius: {
      displayName: 'Modius',
      isUnderConstruction: false,
    },
    trader: {
      displayName: 'Omenstrat',
      isUnderConstruction: false,
    },
  },
}));

describe('ArchivedAgentsList', () => {
  const defaultProps = {
    selectedAgent: undefined,
    onSelectAgent: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows empty state message when there are no archived agents', () => {
    mockUseArchivedAgents.mockReturnValue({ archivedAgents: [] });
    render(<ArchivedAgentsList {...defaultProps} />);
    expect(screen.getByText(/No archived agents/i)).toBeInTheDocument();
  });

  it('renders each archived agent', () => {
    mockUseArchivedAgents.mockReturnValue({
      archivedAgents: [AgentMap.AgentsFun, AgentMap.Modius],
    });
    render(<ArchivedAgentsList {...defaultProps} />);
    expect(screen.getByText('Agents.fun')).toBeInTheDocument();
    expect(screen.getByText('Modius')).toBeInTheDocument();
  });

  it('calls onSelectAgent with the agent type when an agent is clicked', () => {
    const onSelectAgent = jest.fn();
    mockUseArchivedAgents.mockReturnValue({
      archivedAgents: [AgentMap.AgentsFun],
    });
    render(
      <ArchivedAgentsList {...defaultProps} onSelectAgent={onSelectAgent} />,
    );
    fireEvent.click(screen.getByText('Agents.fun'));
    expect(onSelectAgent).toHaveBeenCalledWith(AgentMap.AgentsFun);
  });

  it('renders agent icons with correct alt text', () => {
    mockUseArchivedAgents.mockReturnValue({
      archivedAgents: [AgentMap.AgentsFun],
    });
    render(<ArchivedAgentsList {...defaultProps} />);
    expect(screen.getByAltText('Agents.fun icon')).toBeInTheDocument();
  });

  it('does not render agents with unknown agentTypes', () => {
    mockUseArchivedAgents.mockReturnValue({
      archivedAgents: ['unknown_agent' as typeof AgentMap.AgentsFun],
    });
    render(<ArchivedAgentsList {...defaultProps} />);
    // Only the empty check for unknown; no crash
    expect(screen.queryByText('undefined')).not.toBeInTheDocument();
  });

  it('renders multiple archived agents in order', () => {
    mockUseArchivedAgents.mockReturnValue({
      archivedAgents: [
        AgentMap.PredictTrader,
        AgentMap.AgentsFun,
        AgentMap.Modius,
      ],
    });
    render(<ArchivedAgentsList {...defaultProps} />);
    const names = screen
      .getAllByRole('img')
      .map((img) => img.getAttribute('alt'));
    expect(names).toEqual(['Omenstrat icon', 'Agents.fun icon', 'Modius icon']);
  });
});
