import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { STEPS } from '../../../../../../../components/AgentWallet/types';
import { AgentPhasedOutAlert } from '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/AgentPhasedOutAlert';
import { PAGES } from '../../../../../../../constants';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('../../../../../../../components/ui', () => ({
  Alert: ({ message }: { message: React.ReactNode }) => (
    <div data-testid="alert">{message}</div>
  ),
}));

const mockGoto = jest.fn();
jest.mock('../../../../../../../hooks', () => ({
  usePageState: () => ({ goto: mockGoto }),
}));

describe('AgentPhasedOutAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the phased-out message with the provided agent name', () => {
    render(<AgentPhasedOutAlert agentName="Agents.fun" />);
    expect(
      screen.getByText(
        /Agents.fun has been phased out and is no longer supported\. You can still withdraw funds from your Agent Wallet\./,
      ),
    ).toBeInTheDocument();
  });

  it('renders the Withdraw button', () => {
    render(<AgentPhasedOutAlert agentName="Agents.fun" />);
    expect(
      screen.getByRole('button', { name: 'Withdraw' }),
    ).toBeInTheDocument();
  });

  it('navigates to AgentWallet page with withdraw step when Withdraw is clicked', () => {
    render(<AgentPhasedOutAlert agentName="Agents.fun" />);
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
    expect(mockGoto).toHaveBeenCalledWith(PAGES.AgentWallet, {
      initialStep: STEPS.WITHDRAW_FROM_AGENT_WALLET,
    });
  });
});
