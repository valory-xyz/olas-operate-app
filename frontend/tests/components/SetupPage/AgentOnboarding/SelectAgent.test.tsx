import { fireEvent, render, screen } from '@testing-library/react';

import { SelectAgent } from '../../../../components/SetupPage/AgentOnboarding/SelectAgent';

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

const mockUseServices = jest.fn();

jest.mock('../../../../hooks', () => ({
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
      onSelectInstance,
    }: {
      onSelectInstance: (id: string) => void;
    }) => (
      <div data-testid="archived-agents-list">
        <button onClick={() => onSelectInstance('sc-archived-1')}>
          Agents.fun (archived)
        </button>
      </div>
    ),
  }),
);

const defaultProps = {
  selectedAgent: undefined,
  selectedArchivedInstance: undefined,
  activeTab: 'new' as const,
  onSelectYourAgent: jest.fn(),
  onSelectArchivedInstance: jest.fn(),
};

describe('SelectAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServices.mockReturnValue({
      services: [{}],
      getInstancesOfAgentType: () => [],
    });
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

  it('calls onSelectArchivedInstance when an archived instance is selected', () => {
    const onSelectArchivedInstance = jest.fn();
    render(
      <SelectAgent
        {...defaultProps}
        activeTab="archived"
        onSelectArchivedInstance={onSelectArchivedInstance}
      />,
    );
    fireEvent.click(screen.getByText('Agents.fun (archived)'));
    expect(onSelectArchivedInstance).toHaveBeenCalledWith('sc-archived-1');
  });

  it('shows all agent types in the new agents list (no filtering by archive)', () => {
    mockUseServices.mockReturnValue({
      services: [],
      getInstancesOfAgentType: () => [],
    });
    render(<SelectAgent {...defaultProps} activeTab="new" />);
    expect(screen.getByText('Omenstrat')).toBeInTheDocument();
    expect(screen.getByText('Agents.fun')).toBeInTheDocument();
  });
});
