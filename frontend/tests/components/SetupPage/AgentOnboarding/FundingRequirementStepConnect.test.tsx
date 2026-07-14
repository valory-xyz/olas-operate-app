import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { FundingRequirementStep } from '../../../../components/SetupPage/AgentOnboarding/FundingRequirementStep';
import { AgentMap, EvmChainIdMap } from '../../../../constants';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
// Avoid loading config/chains (needs the real parseEther) via the constants
// barrel, since '@/utils' is mocked below.
jest.mock('../../../../constants/providers', () => ({ PROVIDERS: {} }));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

jest.mock('../../../../components/AgentIntroduction', () => ({
  IntroductionAnimatedContainer: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div>{children}</div>,
}));

jest.mock('../../../../components/ui', () => ({
  Alert: ({ message }: { message: React.ReactNode }) => (
    <div data-testid="alert">{message}</div>
  ),
}));

const mockUseServices = jest.fn();

jest.mock('../../../../hooks', () => ({
  useServices: (...args: unknown[]) => mockUseServices(...args),
  useInitialFundingRequirements: (_agentType: string, chainId: number) => ({
    [chainId]: { OLAS: 0, POL: 15, USDC: 5 },
  }),
}));

jest.mock('../../../../config/agents', () => ({
  AGENT_CONFIG: {
    connect: {
      displayName: 'Connect',
      servicePublicId: 'valory/connect:0.1.0',
      supportedChains: [137, 8453, 100],
      evmHomeChainId: 100,
      middlewareHomeChainId: 'gnosis',
    },
  },
}));

const CHAIN_ID_BY_MIDDLEWARE: Record<string, number> = {
  gnosis: 100,
  base: 8453,
  polygon: 137,
};

jest.mock('../../../../utils', () => ({
  asEvmChainDetails: () => ({ name: 'gnosis', displayName: 'Gnosis' }),
  asEvmChainId: (chain: string) => CHAIN_ID_BY_MIDDLEWARE[chain],
  matchesAgentConfig: (
    service: { service_public_id: string; home_chain: string },
    config: { servicePublicId: string; supportedChains: number[] },
  ) =>
    service.service_public_id === config.servicePublicId &&
    config.supportedChains.includes(CHAIN_ID_BY_MIDDLEWARE[service.home_chain]),
}));

const getOptions = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.ant-select-item-option'));

const findOption = (label: string) =>
  getOptions().find((el) => el.textContent?.includes(label));

const openDropdown = () => fireEvent.mouseDown(screen.getByRole('combobox'));

describe('FundingRequirementStep — Connect chain select', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServices.mockReturnValue({ services: [] });
  });

  it('renders the chain-select placeholder and no funding before a chain is chosen', () => {
    render(<FundingRequirementStep agentType={AgentMap.Connect} />);
    expect(screen.getByText('Select a chain')).toBeInTheDocument();
    expect(
      screen.queryByText(/minimum funding requirements/i),
    ).not.toBeInTheDocument();
  });

  it('lists the chains in order: Polygon, Base, Gnosis', () => {
    render(<FundingRequirementStep agentType={AgentMap.Connect} />);
    openDropdown();
    expect(getOptions().map((el) => el.textContent?.trim())).toEqual([
      'Polygon',
      'Base',
      'Gnosis',
    ]);
  });

  it('disables a chain that already has a Connect instance', () => {
    mockUseServices.mockReturnValue({
      services: [
        { service_public_id: 'valory/connect:0.1.0', home_chain: 'base' },
      ],
    });
    render(<FundingRequirementStep agentType={AgentMap.Connect} />);
    openDropdown();

    expect(findOption('Base')).toHaveClass('ant-select-item-option-disabled');
    expect(findOption('Polygon')).not.toHaveClass(
      'ant-select-item-option-disabled',
    );
    expect(screen.getByText('Already added')).toBeInTheDocument();
  });

  it('calls onSelectChain when an enabled chain is picked', () => {
    const onSelectChain = jest.fn();
    render(
      <FundingRequirementStep
        agentType={AgentMap.Connect}
        onSelectChain={onSelectChain}
      />,
    );
    openDropdown();
    fireEvent.click(findOption('Polygon')!);
    expect(onSelectChain).toHaveBeenCalledWith(EvmChainIdMap.Polygon);
  });

  it('shows funding requirements for the selected chain', () => {
    render(
      <FundingRequirementStep
        agentType={AgentMap.Connect}
        selectedChain={EvmChainIdMap.Polygon}
      />,
    );
    expect(
      screen.getByText(/minimum funding requirements/i),
    ).toBeInTheDocument();
    expect(screen.getByText('15 POL')).toBeInTheDocument();
    expect(screen.getByText('5 USDC')).toBeInTheDocument();
  });
});
