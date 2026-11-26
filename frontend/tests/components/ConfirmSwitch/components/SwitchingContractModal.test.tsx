import { render, screen } from '@testing-library/react';
import React from 'react';

import { SwitchingContractModal } from '../../../../components/ConfirmSwitch/components/SwitchingContractModal';
import { EvmChainIdMap } from '../../../../constants/chains';
import { usePageState, useServices } from '../../../../hooks';

jest.mock('../../../../components/ui', () => ({
  Modal: ({
    title,
    description,
  }: {
    title: string;
    description: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));
jest.mock('../../../../components/custom-icons', () => ({
  LoadingOutlined: () => null,
  SuccessOutlined: () => null,
  WarningOutlined: () => null,
}));
jest.mock('../../../../config/stakingPrograms', () => ({
  STAKING_PROGRAMS: { 100: { connect_i: { name: 'Connect I' } } },
}));
jest.mock('../../../../context/SupportModalProvider', () => ({
  useSupportModal: () => ({ toggleSupportModal: jest.fn() }),
}));
jest.mock('../../../../hooks', () => ({
  usePageState: jest.fn(),
  useServices: jest.fn(),
}));

beforeEach(() => {
  (usePageState as jest.Mock).mockReturnValue({ goto: jest.fn() });
  (useServices as jest.Mock).mockReturnValue({
    selectedAgentConfig: {
      evmHomeChainId: EvmChainIdMap.Gnosis,
      displayName: 'Connect',
    },
    selectedAgentName: 'fafon-norlo48',
  });
});

const renderModal = (
  status: 'IN_PROGRESS' | 'COMPLETED',
  stakingProgramIdToMigrateTo: string,
) =>
  render(
    <SwitchingContractModal
      status={status}
      onClose={jest.fn()}
      stakingProgramIdToMigrateTo={stakingProgramIdToMigrateTo}
    />,
  );

describe('SwitchingContractModal', () => {
  it('says the agent is being unstaked while switching to Unstaked', () => {
    renderModal('IN_PROGRESS', 'no_staking');

    expect(screen.getByText('Unstaking in Progress')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your agent is being unstaked. It usually takes up to 5 min. Please keep the app open until the process is complete.',
      ),
    ).toBeInTheDocument();
  });

  it('says the OLAS is back in the Pearl Wallet once unstaked', () => {
    renderModal('COMPLETED', 'no_staking');

    expect(
      screen.getByText('Contract Switched Successfully!'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your Connect agent fafon-norlo48 is no longer staked. The OLAS you staked is back in your Pearl Wallet.',
      ),
    ).toBeInTheDocument();
  });

  it('keeps the switching copy for a contract', () => {
    renderModal('IN_PROGRESS', 'connect_i');
    expect(screen.getByText('Switching in Progress')).toBeInTheDocument();
  });

  it('names the new contract once staked on it', () => {
    renderModal('COMPLETED', 'connect_i');
    expect(
      screen.getByText(
        'Your Connect agent fafon-norlo48 is now staked on Connect I staking contract.',
      ),
    ).toBeInTheDocument();
  });
});
