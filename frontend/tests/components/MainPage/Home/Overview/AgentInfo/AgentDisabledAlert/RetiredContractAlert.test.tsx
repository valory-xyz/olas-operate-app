import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { RetiredContractAlert } from '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/RetiredContractAlert';
import { PAGES } from '../../../../../../../constants';

jest.mock('../../../../../../../components/ui', () => ({
  Alert: ({ message }: { message: React.ReactNode }) => (
    <div data-testid="alert">{message}</div>
  ),
}));

const mockGoto = jest.fn();
jest.mock('../../../../../../../hooks', () => ({
  usePageState: () => ({ goto: mockGoto }),
}));
jest.mock('../../../../../../../utils/time', () => ({
  formatToShortDateTime: (ms: number) => `formatted:${ms}`,
}));

const alertText = () => screen.getByTestId('alert').textContent;

describe('RetiredContractAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('asks the user to switch, as in Figma screen 1', () => {
    render(
      <RetiredContractAlert
        stakingProgramName="Polystrat IV"
        state={{ kind: 'switch' }}
      />,
    );

    expect(alertText()).toBe(
      'Polystrat IV contract is deprecatedSwitch to one of the available contracts to run your agent. Pearl no longer supports deprecated contracts.Switch Staking Contract',
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Switch Staking Contract' }),
    );
    expect(mockGoto).toHaveBeenCalledWith(PAGES.SelectStaking);
  });

  it('shows the cooldown end in UTC and no button, as in Figma screen 2', () => {
    render(
      <RetiredContractAlert
        stakingProgramName="Polystrat IV"
        state={{ kind: 'cooldown', endsAt: 1_800_000_000 }}
      />,
    );

    expect(alertText()).toBe(
      'Polystrat IV contract is deprecatedPearl no longer supports deprecated contracts. Your agent is in a cooldown period until formatted:1800000000000 (UTC). After that, switch to one of the available contracts to run your agent again.',
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers no button while the switch would be refused', () => {
    render(
      <RetiredContractAlert
        stakingProgramName="Polystrat III"
        state={{ kind: 'awaitingUnstake' }}
      />,
    );

    expect(alertText()).toBe(
      'Polystrat III contract is deprecatedSwitch to one of the available contracts to run your agent. Pearl no longer supports deprecated contracts.',
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it("offers a retry, not the switch copy, when the Safe type couldn't be read", () => {
    const onRetry = jest.fn();
    render(
      <RetiredContractAlert
        stakingProgramName="Polystrat III"
        state={{ kind: 'safeTypeUnknown', onRetry, isRetrying: false }}
      />,
    );

    expect(alertText()).toBe(
      "Polystrat III contract is deprecatedPearl couldn't load this agent's staking details. Try again in a few minutes.Retry",
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(mockGoto).not.toHaveBeenCalled();
  });

  it('offers only Withdraw to a PolySafe agent, as in Figma frame 5', () => {
    render(
      <RetiredContractAlert
        stakingProgramName="Polystrat III"
        state={{ kind: 'withdrawalOnly' }}
      />,
    );

    expect(alertText()).toBe(
      'Polystrat III contract is deprecatedThis agent can no longer trade because it cannot switch to a new staking contract. To keep using Polystrat, add a new agent. To get your funds back, start your agent and sell its positions on the Profile tab. Then withdraw from your Agent Wallet.Withdraw',
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
    expect(mockGoto).toHaveBeenCalledWith(PAGES.AgentWallet);
  });

  it('offers a retry of the staking details when they could not be read', () => {
    const onRetry = jest.fn();
    render(
      <RetiredContractAlert
        stakingProgramName="Omenstrat III"
        state={{ kind: 'stakingDetailsUnknown', onRetry, isRetrying: false }}
      />,
    );

    expect(alertText()).toBe(
      "Omenstrat III contract is deprecatedPearl couldn't load this agent's staking details. Try again in a few minutes.Retry",
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it.each(['safeTypeUnknown', 'stakingDetailsUnknown'] as const)(
    'shows the %s retry as loading while it re-reads',
    (kind) => {
      render(
        <RetiredContractAlert
          stakingProgramName="Omenstrat III"
          state={{ kind, onRetry: jest.fn(), isRetrying: true }}
        />,
      );

      expect(screen.getByRole('button', { name: /Retry/ })).toHaveClass(
        'ant-btn-loading',
      );
    },
  );

  it('shows the title only while loading', () => {
    render(
      <RetiredContractAlert
        stakingProgramName="Polystrat III"
        state={{ kind: 'safeTypeLoading' }}
      />,
    );

    expect(alertText()).toBe('Polystrat III contract is deprecated');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('falls back to a generic title once the program can no longer be named', () => {
    render(<RetiredContractAlert state={{ kind: 'withdrawalOnly' }} />);

    expect(alertText()).toMatch(/^Staking contract is deprecatedThis agent/);
  });
});
