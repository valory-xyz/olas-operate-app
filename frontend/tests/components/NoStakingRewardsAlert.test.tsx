import { fireEvent, render, screen } from '@testing-library/react';

import { NoStakingRewardsAlert } from '@/components/NoStakingRewardsAlert';

describe('NoStakingRewardsAlert', () => {
  it('renders the empty-reward-pool warning message', () => {
    render(<NoStakingRewardsAlert />);
    expect(
      screen.getByText('No staking rewards available'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/reward pool is currently empty/),
    ).toBeInTheDocument();
  });

  it('does not render a switch button when onSwitch is omitted', () => {
    render(<NoStakingRewardsAlert />);
    expect(
      screen.queryByRole('button', { name: 'Switch Staking Contract' }),
    ).not.toBeInTheDocument();
  });

  it('renders and fires the switch button when onSwitch is provided', () => {
    const onSwitch = jest.fn();
    render(<NoStakingRewardsAlert onSwitch={onSwitch} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Switch Staking Contract' }),
    );
    expect(onSwitch).toHaveBeenCalledTimes(1);
  });
});
