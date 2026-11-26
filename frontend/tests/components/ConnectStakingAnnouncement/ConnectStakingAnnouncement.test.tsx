import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ConnectStakingAnnouncement } from '../../../components/ConnectStakingAnnouncement';
import { useConnectStakingAnnouncement } from '../../../hooks/useConnectStakingAnnouncement';

jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../hooks/useConnectStakingAnnouncement', () => ({
  useConnectStakingAnnouncement: jest.fn(),
}));
jest.mock('../../../components/ui', () => ({
  Modal: ({
    title,
    description,
    action,
  }: {
    title: string;
    description: string;
    action: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {action}
    </div>
  ),
}));

const mockStake = jest.fn();
const mockDismiss = jest.fn();

const setup = (isOpen: boolean) => {
  (useConnectStakingAnnouncement as jest.Mock).mockReturnValue({
    isOpen,
    stake: mockStake,
    dismiss: mockDismiss,
  });
  return render(<ConnectStakingAnnouncement />);
};

describe('ConnectStakingAnnouncement', () => {
  beforeEach(() => jest.clearAllMocks());

  it('announces Connect staking with its two answers', () => {
    setup(true);

    expect(screen.getByText('Staking for Connect agents')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Connect agents on Gnosis and Robinhood Chain can now be staked to become eligible for OLAS activity rewards. Staking is optional.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Stake your Connect Agent' }),
    );
    expect(mockStake).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Not Now' }));
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders nothing once answered', () => {
    const { container } = setup(false);
    expect(container).toBeEmptyDOMElement();
  });
});
