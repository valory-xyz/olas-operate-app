import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { NotStaked } from '../../../../../../components/MainPage/Home/Overview/Staking/NotStaked';
import { useCanManageStaking } from '../../../../../../components/MainPage/Home/Overview/Staking/Staking';
import { PAGES } from '../../../../../../constants/pages';
import { usePageState } from '../../../../../../hooks';

jest.mock('../../../../../../components/ui', () => ({
  CardFlex: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
jest.mock('../../../../../../hooks', () => ({ usePageState: jest.fn() }));
jest.mock(
  '../../../../../../components/MainPage/Home/Overview/Staking/Staking',
  () => ({ useCanManageStaking: jest.fn() }),
);

const mockGoto = jest.fn();

const setup = (canManageStaking = true) => {
  (usePageState as jest.Mock).mockReturnValue({ goto: mockGoto });
  (useCanManageStaking as jest.Mock).mockReturnValue(canManageStaking);
  render(<NotStaked />);
};

describe('NotStaked', () => {
  beforeEach(() => jest.clearAllMocks());

  it('says the agent is not staked and how to become eligible', () => {
    setup();

    expect(screen.getByText("This agent isn't staked.")).toBeInTheDocument();
    expect(
      screen.getByText(
        'Select a staking contract to become eligible for OLAS activity rewards.',
      ),
    ).toBeInTheDocument();
  });

  it('opens the contract list from Manage Staking', () => {
    setup();

    fireEvent.click(screen.getByRole('button', { name: 'Manage Staking' }));

    expect(mockGoto).toHaveBeenCalledWith(PAGES.SelectStaking);
  });

  it('hides Manage Staking until the service is registered on-chain', () => {
    setup(false);

    expect(screen.queryByRole('button', { name: 'Manage Staking' })).toBeNull();
  });
});
