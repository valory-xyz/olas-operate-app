import { render, screen } from '@testing-library/react';
import React from 'react';

import { StakingContractCard } from '../../components/StakingContractCard';
import { EvmChainIdMap } from '../../constants/chains';
import { useServices } from '../../hooks';
import { useStakingContractContext } from '../../hooks/useStakingContractDetails';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({ PROVIDERS: {} }));
jest.mock('../../config/stakingPrograms', () => ({
  STAKING_PROGRAMS: { 100: { connect_i: { name: 'Connect I', id: '0x1' } } },
}));
jest.mock('../../hooks', () => ({ useServices: jest.fn() }));
jest.mock('../../hooks/useStakingContractDetails', () => ({
  useStakingContractContext: jest.fn(),
}));
jest.mock('../../components/SelectStakingPage/hooks/useStakingDetails', () => ({
  useEachStakingDetails: () => ({ slotsLeft: 40, totalSlots: 44 }),
}));

beforeEach(() => {
  (useServices as jest.Mock).mockReturnValue({
    selectedAgentConfig: { evmHomeChainId: EvmChainIdMap.Gnosis },
  });
  (useStakingContractContext as jest.Mock).mockReturnValue({
    allStakingContractDetailsRecord: {
      connect_i: {
        apy: 12,
        rewardsPerWorkPeriod: 0.68,
        olasStakeRequired: 5000,
      },
    },
  });
});

describe('StakingContractCard', () => {
  it('shows the Unstaked option as 0 OLAS reward and 0 OLAS deposit, with no APR', () => {
    render(
      <StakingContractCard
        stakingProgramId="no_staking"
        renderAction={() => <button>Select</button>}
      />,
    );

    expect(screen.getByText('Unstaked')).toBeInTheDocument();
    expect(screen.getByText('0 OLAS – activity reward')).toBeInTheDocument();
    expect(screen.getByText('0 OLAS – required deposit')).toBeInTheDocument();
    expect(screen.queryByText('APR')).toBeNull();
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
  });

  it('shows a contract with its APR, reward and deposit', () => {
    render(<StakingContractCard stakingProgramId="connect_i" />);

    expect(screen.getByText('12%')).toBeInTheDocument();
    expect(screen.getByText('APR')).toBeInTheDocument();
    expect(
      screen.getByText('~0.68 OLAS – activity reward'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('5000 OLAS – required deposit'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Unstaked')).toBeNull();
  });
});
