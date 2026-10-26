import { render, screen } from '@testing-library/react';
import React from 'react';

import { Overview } from '../../../../../components/MainPage/Home/Overview/Overview';
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
jest.mock('../../../../../components/MainPage/Home/Overview/Wallet', () => ({
  Wallet: () => <div>Wallet</div>,
}));

const mockUseServices = useServices as jest.Mock;

const renderOverview = (agentConfig: Record<string, unknown>) => {
  mockUseServices.mockReturnValue({
    selectedServiceConfigId: 'sc-1',
    selectedAgentConfig: agentConfig,
  });
  render(<Overview openProfile={jest.fn()} />);
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
});
