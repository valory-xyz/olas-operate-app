import { render, screen } from '@testing-library/react';
import React from 'react';

import { ConfigureActivityRewards } from '../../../../components/SelectStakingPage/components/ConfigureActivityRewards';
import { useServices } from '../../../../hooks';

jest.mock('../../../../hooks', () => ({ useServices: jest.fn() }));
jest.mock('../../../../components/StakingContractCard', () => ({
  StakingContractCard: ({ stakingProgramId }: { stakingProgramId: string }) => (
    <div>card:{stakingProgramId}</div>
  ),
}));
jest.mock(
  '../../../../components/SelectStakingPage/components/SelectStakingButton',
  () => ({ SelectStakingButton: () => null }),
);

const renderWithDefault = (defaultStakingProgramId: string) => {
  (useServices as jest.Mock).mockReturnValue({
    selectedAgentConfig: { defaultStakingProgramId },
  });
  render(<ConfigureActivityRewards onChangeConfiguration={jest.fn()} />);
};

describe('ConfigureActivityRewards', () => {
  it('offers Unstaked as the default configuration of an agent that stakes optionally', () => {
    renderWithDefault('no_staking');

    expect(screen.getByText('Default configuration')).toBeInTheDocument();
    expect(screen.getByText('card:no_staking')).toBeInTheDocument();
  });

  it('keeps recommending the default contract of a staking agent', () => {
    renderWithDefault('omenstrat_i');

    expect(screen.getByText('Recommended configuration')).toBeInTheDocument();
  });
});
