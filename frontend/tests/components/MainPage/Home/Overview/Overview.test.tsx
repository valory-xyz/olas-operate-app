import { render, screen } from '@testing-library/react';
import React from 'react';

import { Overview } from '../../../../../components/MainPage/Home/Overview/Overview';
import { EvmChainIdMap } from '../../../../../constants/chains';
import { useServices } from '../../../../../hooks';

jest.mock('../../../../../hooks', () => ({
  useServices: jest.fn(),
}));

jest.mock('../../../../../components/ui', () => ({
  MainContentContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('../../../../../components/MainPage/Home/Overview/AgentChat', () => ({
  AgentChat: () => <div>AgentChat</div>,
}));
jest.mock('../../../../../components/MainPage/Home/Overview/AgentInfo', () => ({
  AgentInfo: () => <div>AgentInfo</div>,
}));
jest.mock(
  '../../../../../components/MainPage/Home/Overview/Performance',
  () => ({ Performance: () => <div>Performance</div> }),
);
jest.mock(
  '../../../../../components/MainPage/Home/Overview/Staking/Staking',
  () => ({ Staking: () => <div>Staking</div> }),
);
jest.mock(
  '../../../../../components/MainPage/Home/Overview/Staking/NotStaked',
  () => ({ NotStaked: () => <div>NotStaked</div> }),
);
jest.mock('../../../../../components/MainPage/Home/Overview/Wallet', () => ({
  Wallet: () => <div>Wallet</div>,
}));

const mockUseServices = useServices as jest.Mock;

const serviceStakedIn = (stakingProgramId?: string | null) =>
  stakingProgramId === undefined
    ? undefined
    : {
        home_chain: 'gnosis',
        chain_configs: {
          gnosis: {
            chain_data: {
              user_params: { staking_program_id: stakingProgramId },
            },
          },
        },
      };

const mockServices = (
  agentConfig: Record<string, unknown>,
  serviceStakingProgramId?: string | null,
) =>
  mockUseServices.mockReturnValue({
    selectedServiceConfigId: 'sc-1',
    selectedService: serviceStakedIn(serviceStakingProgramId),
    selectedAgentConfig: agentConfig,
  });

/** `serviceStakingProgramId` is the selected service's own stored program. */
const renderOverview = (
  agentConfig: Record<string, unknown>,
  serviceStakingProgramId: string | null = 'pearl_beta',
) => {
  mockServices(agentConfig, serviceStakingProgramId);
  return render(<Overview openProfile={jest.fn()} />);
};

const TODAYS_SECTIONS = ['AgentInfo', 'Performance', 'Staking', 'Wallet'];

describe('Overview', () => {
  it('renders the agent chat instead of the sections for agents with a chat', () => {
    renderOverview({
      hasAgentChat: true,
      hasStaking: true,
      hasPerformance: true,
    });

    expect(screen.getByText('AgentChat')).toBeInTheDocument();
    TODAYS_SECTIONS.forEach((section) =>
      expect(screen.queryByText(section)).toBeNull(),
    );
  });

  it("renders today's sections for agents without a chat", () => {
    renderOverview({ hasStaking: true, hasPerformance: true });

    expect(screen.queryByText('AgentChat')).toBeNull();
    TODAYS_SECTIONS.forEach((section) =>
      expect(screen.getByText(section)).toBeInTheDocument(),
    );
  });

  it("keeps Connect's Overview as today: info and wallet only", () => {
    renderOverview({ hasStaking: false, hasPerformance: false });

    expect(screen.queryByText('AgentChat')).toBeNull();
    expect(screen.getByText('AgentInfo')).toBeInTheDocument();
    expect(screen.getByText('Wallet')).toBeInTheDocument();
    expect(screen.queryByText('Performance')).toBeNull();
    expect(screen.queryByText('Staking')).toBeNull();
  });

  describe('Connect, whose staking is optional and per chain', () => {
    const connectOn = (evmHomeChainId: number) => ({
      hasStaking: false,
      hasPerformance: false,
      defaultStakingProgramId: 'no_staking',
      stakingChains: [EvmChainIdMap.Gnosis, EvmChainIdMap.Robinhood],
      evmHomeChainId,
    });

    it.each([EvmChainIdMap.Gnosis, EvmChainIdMap.Robinhood])(
      'shows the not-staked card while an instance on %s is unstaked',
      (chainId) => {
        renderOverview(connectOn(chainId), 'no_staking');

        expect(screen.getByText('NotStaked')).toBeInTheDocument();
        expect(screen.queryByText('Staking')).toBeNull();
      },
    );

    it('shows the staking section once the instance is staked', () => {
      renderOverview(connectOn(EvmChainIdMap.Gnosis), 'connect_i');

      expect(screen.getByText('Staking')).toBeInTheDocument();
      expect(screen.queryByText('NotStaked')).toBeNull();
      expect(screen.queryByText('Performance')).toBeNull();
    });

    it('shows the not-staked card as soon as the service is unstaked', () => {
      // the subgraph's cached contract (selectedStakingProgramId) can outlive
      // an unstake by a day; the service's own program is what the card follows
      const { rerender } = renderOverview(
        connectOn(EvmChainIdMap.Gnosis),
        'connect_i',
      );
      expect(screen.getByText('Staking')).toBeInTheDocument();

      mockServices(connectOn(EvmChainIdMap.Gnosis), 'no_staking');
      rerender(<Overview openProfile={jest.fn()} />);

      expect(screen.getByText('NotStaked')).toBeInTheDocument();
      expect(screen.queryByText('Staking')).toBeNull();
    });

    it.each([undefined, null])(
      'shows neither staking section while the program is unknown (%s)',
      (serviceStakingProgramId) => {
        mockServices(connectOn(EvmChainIdMap.Gnosis), serviceStakingProgramId);
        render(<Overview openProfile={jest.fn()} />);

        expect(screen.queryByText('Staking')).toBeNull();
        expect(screen.queryByText('NotStaked')).toBeNull();
        expect(screen.getByText('Wallet')).toBeInTheDocument();
      },
    );

    it('shows no staking at all on Polygon', () => {
      renderOverview(connectOn(EvmChainIdMap.Polygon), 'no_staking');

      expect(screen.queryByText('Staking')).toBeNull();
      expect(screen.queryByText('NotStaked')).toBeNull();
    });
  });
});
