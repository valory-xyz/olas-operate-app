import { fireEvent, render, screen } from '@testing-library/react';

import { ArchivedAgentsList } from '../../../../components/SetupPage/AgentOnboarding/ArchivedAgentsList';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({}));

// Mock next/image
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
      'memeooorr',
      {
        displayName: 'Agents.fun',
        servicePublicId: 'valory/memeooorr_pearl:0.1.0',
        middlewareHomeChainId: 8453,
        evmHomeChainId: 8453,
        isUnderConstruction: false,
      },
    ],
    [
      'modius',
      {
        displayName: 'Modius',
        servicePublicId: 'valory/modius_pearl:0.1.0',
        middlewareHomeChainId: 1,
        evmHomeChainId: 1,
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
        isUnderConstruction: false,
      },
    ],
  ],
}));

jest.mock('../../../../utils', () => ({
  isServiceOfAgent: (
    service: { service_public_id: string; home_chain: number },
    config: { servicePublicId: string; middlewareHomeChainId: number },
  ) =>
    service.service_public_id === config.servicePublicId &&
    service.home_chain === config.middlewareHomeChainId,
  getServiceInstanceName: (_service: unknown, displayName: string) =>
    `My ${displayName}`,
}));

const services = [
  {
    service_config_id: 'sc-1',
    service_public_id: 'valory/memeooorr_pearl:0.1.0',
    home_chain: 8453,
  },
  {
    service_config_id: 'sc-2',
    service_public_id: 'valory/modius_pearl:0.1.0',
    home_chain: 1,
  },
  {
    service_config_id: 'sc-3',
    service_public_id: 'valory/trader_pearl:0.1.0',
    home_chain: 100,
  },
];

describe('ArchivedAgentsList', () => {
  const defaultProps = {
    selectedInstance: undefined,
    onSelectInstance: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServices.mockReturnValue({ services });
  });

  it('shows empty state message when there are no archived instances', () => {
    mockUseArchivedAgents.mockReturnValue({ archivedInstances: [] });
    render(<ArchivedAgentsList {...defaultProps} />);
    expect(screen.getByText(/No archived agents/i)).toBeInTheDocument();
  });

  it('renders each archived instance', () => {
    mockUseArchivedAgents.mockReturnValue({
      archivedInstances: ['sc-1', 'sc-2'],
    });
    render(<ArchivedAgentsList {...defaultProps} />);
    expect(screen.getByText('My Agents.fun')).toBeInTheDocument();
    expect(screen.getByText('My Modius')).toBeInTheDocument();
  });

  it('calls onSelectInstance with the service config id when an instance is clicked', () => {
    const onSelectInstance = jest.fn();
    mockUseArchivedAgents.mockReturnValue({
      archivedInstances: ['sc-1'],
    });
    render(
      <ArchivedAgentsList
        {...defaultProps}
        onSelectInstance={onSelectInstance}
      />,
    );
    fireEvent.click(screen.getByText('My Agents.fun'));
    expect(onSelectInstance).toHaveBeenCalledWith('sc-1');
  });

  it('renders agent icons with correct alt text', () => {
    mockUseArchivedAgents.mockReturnValue({
      archivedInstances: ['sc-1'],
    });
    render(<ArchivedAgentsList {...defaultProps} />);
    expect(screen.getByAltText('My Agents.fun icon')).toBeInTheDocument();
  });

  it('does not render instances whose service is not found', () => {
    mockUseArchivedAgents.mockReturnValue({
      archivedInstances: ['sc-unknown'],
    });
    render(<ArchivedAgentsList {...defaultProps} />);
    // Falls through to empty state since the unknown instance is filtered out
    expect(screen.getByText(/No archived agents/i)).toBeInTheDocument();
  });

  it('renders multiple archived instances in order', () => {
    mockUseArchivedAgents.mockReturnValue({
      archivedInstances: ['sc-3', 'sc-1', 'sc-2'],
    });
    render(<ArchivedAgentsList {...defaultProps} />);
    const names = screen
      .getAllByRole('img')
      .map((img) => img.getAttribute('alt'));
    expect(names).toEqual([
      'My Omenstrat icon',
      'My Agents.fun icon',
      'My Modius icon',
    ]);
  });
});
