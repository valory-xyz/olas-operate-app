import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { STEPS } from '../../../../../../components/AgentWallet/types';
import { AgentDeprecationAlert } from '../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDeprecationAlert';
import { PAGES } from '../../../../../../constants';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('../../../../../../components/ui', () => ({
  Alert: ({ message }: { message: React.ReactNode }) => (
    <div data-testid="alert">{message}</div>
  ),
}));

const mockGoto = jest.fn();
jest.mock('../../../../../../hooks', () => ({
  usePageState: () => ({ goto: mockGoto }),
}));

describe('AgentDeprecationAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the shutdown message with the provided date and agent name', () => {
    render(
      <AgentDeprecationAlert
        agentName="PettBro by Pett.ai"
        shutdownDate="June 15, 2026"
      />,
    );
    expect(
      screen.getByText(
        /PettBro by Pett.ai is being phased out and will be disabled on June 15, 2026/,
      ),
    ).toBeInTheDocument();
  });

  it('renders the Withdraw button', () => {
    render(
      <AgentDeprecationAlert
        agentName="PettBro by Pett.ai"
        shutdownDate="June 15, 2026"
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Withdraw' }),
    ).toBeInTheDocument();
  });

  it('navigates to AgentWallet page with withdraw step when Withdraw is clicked', () => {
    render(
      <AgentDeprecationAlert
        agentName="PettBro by Pett.ai"
        shutdownDate="June 15, 2026"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
    expect(mockGoto).toHaveBeenCalledWith(PAGES.AgentWallet, {
      initialStep: STEPS.WITHDRAW_FROM_AGENT_WALLET,
    });
  });
});
