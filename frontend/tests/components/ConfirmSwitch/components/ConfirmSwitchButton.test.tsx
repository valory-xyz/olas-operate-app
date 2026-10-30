import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { ConfirmSwitchButton } from '../../../../components/ConfirmSwitch/components/ConfirmSwitchButton';
import { AgentMap } from '../../../../constants/agent';
import {
  useBalanceContext,
  useServices,
  useStakingProgram,
} from '../../../../hooks';
import {
  PrestartCheckFailedError,
  runPrestartCheck,
} from '../../../../hooks/useStartService';
import { ServicesService } from '../../../../service/Services';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  DEFAULT_STAKING_PROGRAM_ID,
  makeFailedPrestartCheck,
  makeService,
} from '../../../helpers/factories';

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(() => ({})),
}));
jest.mock('../../../../hooks', () => ({
  useBalanceContext: jest.fn(),
  useServices: jest.fn(),
  useStakingProgram: jest.fn(),
}));
jest.mock('../../../../hooks/useStartService', () => ({
  ...jest.requireActual('../../../../hooks/useStartService'),
  runPrestartCheck: jest.fn(),
}));
jest.mock('../../../../service/Services', () => ({
  ServicesService: { startService: jest.fn(), createService: jest.fn() },
}));
jest.mock('../../../../utils', () => ({
  ...jest.requireActual('../../../../utils'),
  updateServiceIfNeeded: jest.fn(),
}));
jest.mock(
  '../../../../components/ConfirmSwitch/components/SwitchingContractModal',
  () => ({
    SwitchingContractModal: ({ status }: { status: string }) => (
      <div>{`modal: ${status}`}</div>
    ),
  }),
);

const mockRunPrestartCheck = runPrestartCheck as jest.Mock;
const mockStartService = ServicesService.startService as jest.Mock;

const renderButton = () => {
  (useServices as jest.Mock).mockReturnValue({
    setPaused: jest.fn(),
    isFetched: true,
    selectedService: makeService(),
    selectedAgentType: AgentMap.PredictTrader,
    overrideSelectedServiceStatus: jest.fn(),
  });
  (useBalanceContext as jest.Mock).mockReturnValue({ setIsPaused: jest.fn() });
  (useStakingProgram as jest.Mock).mockReturnValue({
    stakingProgramIdToMigrateTo: DEFAULT_STAKING_PROGRAM_ID,
    setDefaultStakingProgramId: jest.fn(),
  });
  render(<ConfirmSwitchButton allowSwitch />);
  fireEvent.click(screen.getByText('Confirm Switch'));
};

describe('ConfirmSwitchButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRunPrestartCheck.mockResolvedValue(undefined);
    mockStartService.mockResolvedValue(undefined);
  });

  it('runs the prestart check before starting on the new contract', async () => {
    renderButton();

    await waitFor(() =>
      expect(screen.getByText('modal: COMPLETED')).toBeInTheDocument(),
    );
    expect(mockRunPrestartCheck).toHaveBeenCalledWith(
      {},
      DEFAULT_SERVICE_CONFIG_ID,
    );
    expect(mockStartService).toHaveBeenCalledWith(DEFAULT_SERVICE_CONFIG_ID);
  });

  it('does not start when the prestart check blocks it', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockRunPrestartCheck.mockRejectedValue(
      new PrestartCheckFailedError(makeFailedPrestartCheck()),
    );
    renderButton();

    await waitFor(() =>
      expect(screen.getByText('modal: ERROR')).toBeInTheDocument(),
    );
    expect(mockStartService).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
