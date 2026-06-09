import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { STEPS } from '../../../../../../components/AgentWallet/types';
import { AgentDecommissionedAlert } from '../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDecommissionedAlert';
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

describe('AgentDecommissionedAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the phased-out message', () => {
    render(<AgentDecommissionedAlert />);
    expect(
      screen.getByText(
        /PettBro agent has been phased out and is no longer supported\. You can still withdraw funds from your Agent Wallet\./,
      ),
    ).toBeInTheDocument();
  });

  it('renders the Withdraw button', () => {
    render(<AgentDecommissionedAlert />);
    expect(
      screen.getByRole('button', { name: 'Withdraw' }),
    ).toBeInTheDocument();
  });

  it('navigates to AgentWallet with WITHDRAW_FROM_AGENT_WALLET step on click', () => {
    render(<AgentDecommissionedAlert />);
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
    expect(mockGoto).toHaveBeenCalledWith(PAGES.AgentWallet, {
      initialStep: STEPS.WITHDRAW_FROM_AGENT_WALLET,
    });
  });
});
