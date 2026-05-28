import { fireEvent, render, screen } from '@testing-library/react';

import { AgentWalletOverflowMenu } from '../../../../components/AgentWallet/BalancesAndAssets/AgentWalletOverflowMenu';

jest.mock('../../../../hooks', () => ({
  useStakingContractCountdown: () => ({
    countdownDisplay: '1 day 17 hours 55 minutes 29 seconds',
    secondsUntilReady: 100000,
  }),
}));

describe('AgentWalletOverflowMenu', () => {
  const renderMenu = (props: {
    onDecommission?: () => void;
    isStaked?: boolean;
  }) =>
    render(
      <AgentWalletOverflowMenu
        onDecommission={props.onDecommission ?? jest.fn()}
        isServiceStakedForMinimumDuration={props.isStaked ?? true}
        selectedStakingContractDetails={null}
      />,
    );

  it('renders the "Decommission Agent" menu item on click', async () => {
    renderMenu({});
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    expect(await screen.findByText('Decommission Agent')).toBeInTheDocument();
  });

  it('calls onDecommission when staking minimum is met', async () => {
    const onDecommission = jest.fn();
    renderMenu({ onDecommission, isStaked: true });

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(await screen.findByText('Decommission Agent'));

    expect(onDecommission).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText('Decommissioning Unavailable'),
    ).not.toBeInTheDocument();
  });

  it('shows DecommissioningUnavailableModal (and does NOT call onDecommission) when staking minimum is not met', async () => {
    const onDecommission = jest.fn();
    renderMenu({ onDecommission, isStaked: false });

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(await screen.findByText('Decommission Agent'));

    expect(onDecommission).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Decommissioning Unavailable'),
    ).toBeInTheDocument();
  });
});
