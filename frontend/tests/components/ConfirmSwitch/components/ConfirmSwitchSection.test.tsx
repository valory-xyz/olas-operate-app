import { render, screen } from '@testing-library/react';
import React from 'react';

import { ConfirmSwitchSection } from '../../../../components/ConfirmSwitch/components/ConfirmSwitchSection';
import { useShouldAllowStakingContractSwitch } from '../../../../components/ConfirmSwitch/hooks/useShouldAllowStakingContractSwitch';
import { EvmChainIdMap } from '../../../../constants/chains';
import { useServices, useStakingProgram } from '../../../../hooks';

jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../../components/ui', () => ({
  CardFlex: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
jest.mock('../../../../hooks', () => ({
  useServices: jest.fn(),
  useStakingProgram: jest.fn(),
}));
jest.mock(
  '../../../../components/ConfirmSwitch/hooks/useShouldAllowStakingContractSwitch',
  () => ({ useShouldAllowStakingContractSwitch: jest.fn() }),
);
jest.mock(
  '../../../../components/ConfirmSwitch/components/ConfirmSwitchButton',
  () => ({
    ConfirmSwitchButton: ({ allowSwitch }: { allowSwitch: boolean }) => (
      <button disabled={!allowSwitch}>Confirm Switch</button>
    ),
  }),
);
jest.mock(
  '../../../../components/ConfirmSwitch/components/InsufficientBalanceAlert',
  () => ({ InsufficientBalanceAlert: () => <div>insufficient</div> }),
);

const setup = (
  stakingProgramIdToMigrateTo: string,
  shouldAllowSwitch = true,
) => {
  (useServices as jest.Mock).mockReturnValue({
    selectedAgentConfig: { evmHomeChainId: EvmChainIdMap.Gnosis },
  });
  (useStakingProgram as jest.Mock).mockReturnValue({
    stakingProgramIdToMigrateTo,
  });
  (useShouldAllowStakingContractSwitch as jest.Mock).mockReturnValue({
    shouldAllowSwitch,
    olasRequiredToMigrate: 5000,
    totalOlas: 0,
  });
  render(<ConfirmSwitchSection />);
};

describe('ConfirmSwitchSection', () => {
  it('shows only what unstaking does, with Confirm Switch enabled', () => {
    setup('no_staking', false);

    expect(
      screen.getByText(/Unstaking usually takes up to 5 min\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Agent will be restarted during switching\./),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Confirm Switch' }),
    ).toBeEnabled();
    expect(screen.queryByText('Your OLAS balance')).toBeNull();
    expect(screen.queryByText('insufficient')).toBeNull();
  });

  it('keeps the OLAS balance and the shortfall for a contract', () => {
    setup('connect_i', false);

    expect(screen.getByText('Your OLAS balance')).toBeInTheDocument();
    expect(screen.getByText('insufficient')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Confirm Switch' }),
    ).toBeDisabled();
  });
});
