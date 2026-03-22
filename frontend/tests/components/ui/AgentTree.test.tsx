import { render, screen } from '@testing-library/react';

// Import after mocks
import {
  AgentGroup,
  AgentGroupHeader,
  AgentTreeInstance,
  InstanceList,
} from '../../../components/ui/AgentTree';
import { AgentMap } from '../../../constants/agent';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  MOCK_SERVICE_CONFIG_ID_2,
} from '../../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
jest.mock(
  'styled-components',
  () => require('../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../constants/providers', () => ({}));
jest.mock('../../../config/providers', () => ({}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <img {...props} alt={props.alt as string} />
  ),
}));

describe('AgentGroupHeader', () => {
  it('renders agent icon image', () => {
    render(<AgentGroupHeader agentType={AgentMap.PredictTrader} />);
    const img = screen.getByAltText('Omenstrat');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      'src',
      `/agent-${AgentMap.PredictTrader}-icon.png`,
    );
  });

  it('renders display name from agent config', () => {
    render(<AgentGroupHeader agentType={AgentMap.PredictTrader} />);
    expect(screen.getByText('Omenstrat')).toBeInTheDocument();
  });

  it('renders different agent type correctly', () => {
    render(<AgentGroupHeader agentType={AgentMap.Optimus} />);
    expect(screen.getByText('Optimus')).toBeInTheDocument();
    expect(screen.getByAltText('Optimus')).toBeInTheDocument();
  });

  it('renders children after the display name', () => {
    render(
      <AgentGroupHeader agentType={AgentMap.PredictTrader}>
        <span data-testid="trailing">trailing content</span>
      </AgentGroupHeader>,
    );
    expect(screen.getByTestId('trailing')).toBeInTheDocument();
    expect(screen.getByText('trailing content')).toBeInTheDocument();
  });

  it('renders without children', () => {
    render(<AgentGroupHeader agentType={AgentMap.PredictTrader} />);
    expect(screen.getByText('Omenstrat')).toBeInTheDocument();
  });
});

describe('InstanceList', () => {
  const instances: AgentTreeInstance[] = [
    { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID, name: 'Instance Alpha' },
    { serviceConfigId: MOCK_SERVICE_CONFIG_ID_2, name: 'Instance Beta' },
  ];

  it('renders all instance names', () => {
    render(<InstanceList instances={instances} />);
    expect(screen.getByText('Instance Alpha')).toBeInTheDocument();
    expect(screen.getByText('Instance Beta')).toBeInTheDocument();
  });

  it('renders trailing content for each instance', () => {
    const renderTrailing = (serviceConfigId: string) => (
      <span data-testid={`trailing-${serviceConfigId}`}>trailing</span>
    );
    render(
      <InstanceList instances={instances} renderTrailing={renderTrailing} />,
    );
    expect(
      screen.getByTestId(`trailing-${DEFAULT_SERVICE_CONFIG_ID}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`trailing-${MOCK_SERVICE_CONFIG_ID_2}`),
    ).toBeInTheDocument();
  });

  it('renders without trailing when renderTrailing is not provided', () => {
    const { container } = render(<InstanceList instances={instances} />);
    expect(
      container.querySelectorAll('[data-testid^="trailing-"]'),
    ).toHaveLength(0);
  });

  it('renders empty list when no instances', () => {
    render(<InstanceList instances={[]} />);
    expect(screen.queryByText('Instance Alpha')).not.toBeInTheDocument();
  });
});

describe('AgentGroup', () => {
  const instances: AgentTreeInstance[] = [
    { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID, name: 'Omenstrat #1' },
    { serviceConfigId: MOCK_SERVICE_CONFIG_ID_2, name: 'Omenstrat #2' },
  ];

  it('renders group header with agent name', () => {
    render(
      <AgentGroup agentType={AgentMap.PredictTrader} instances={instances} />,
    );
    expect(screen.getByText('Omenstrat')).toBeInTheDocument();
  });

  it('renders all instances', () => {
    render(
      <AgentGroup agentType={AgentMap.PredictTrader} instances={instances} />,
    );
    expect(screen.getByText('Omenstrat #1')).toBeInTheDocument();
    expect(screen.getByText('Omenstrat #2')).toBeInTheDocument();
  });

  it('renders headerTrailing content', () => {
    render(
      <AgentGroup
        agentType={AgentMap.PredictTrader}
        instances={instances}
        headerTrailing={<span data-testid="header-badge">badge</span>}
      />,
    );
    expect(screen.getByTestId('header-badge')).toBeInTheDocument();
  });

  it('renders renderInstanceTrailing for each instance', () => {
    render(
      <AgentGroup
        agentType={AgentMap.PredictTrader}
        instances={instances}
        renderInstanceTrailing={(id) => (
          <span data-testid={`action-${id}`}>action</span>
        )}
      />,
    );
    expect(
      screen.getByTestId(`action-${DEFAULT_SERVICE_CONFIG_ID}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`action-${MOCK_SERVICE_CONFIG_ID_2}`),
    ).toBeInTheDocument();
  });

  it('renders agent icon', () => {
    render(
      <AgentGroup agentType={AgentMap.PredictTrader} instances={instances} />,
    );
    expect(screen.getByAltText('Omenstrat')).toBeInTheDocument();
  });
});
