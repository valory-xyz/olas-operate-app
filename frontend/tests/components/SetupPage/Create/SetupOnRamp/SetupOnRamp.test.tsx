import { fireEvent, render, screen } from '@testing-library/react';

import { SetupOnRamp } from '../../../../../components/SetupPage/Create/SetupOnRamp/SetupOnRamp';
import { EvmChainIdMap } from '../../../../../constants/chains';
import { SETUP_SCREEN } from '../../../../../constants/setupScreen';
import {
  backupSignerGateState,
  resetBackupSignerGateState,
} from '../../../../helpers/backupSignerGateMock';

jest.mock('../../../../../constants/providers', () => ({ PROVIDERS: {} }));

const mockGotoSetup = jest.fn();

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock('../../../../../components/SetupPage/BackupSignerGate', () => ({
  BackupSignerGate: require('../../../../helpers/backupSignerGateMock')
    .backupSignerGateMock,
}));
/* eslint-enable @typescript-eslint/no-var-requires */

jest.mock('../../../../../hooks', () => ({
  useGetBridgeRequirementsParams: () => jest.fn(),
  useServices: () => ({
    selectedAgentConfig: { evmHomeChainId: EvmChainIdMap.Gnosis },
  }),
  useSetup: () => ({ goto: mockGotoSetup, prevState: undefined }),
}));

jest.mock('../../../../../components/OnRamp', () => ({
  OnRamp: () => <div data-testid="on-ramp" />,
}));

describe('SetupOnRamp', () => {
  afterEach(() => {
    resetBackupSignerGateState();
  });

  it('renders the on-ramp inside the backup signer gate', () => {
    render(<SetupOnRamp />);
    expect(screen.getByTestId('on-ramp')).toBeInTheDocument();
  });

  it('does not open the on-ramp (which creates the Pearl Safe) until the gate opens', () => {
    backupSignerGateState.isOpen = false;
    render(<SetupOnRamp />);
    expect(screen.queryByTestId('on-ramp')).not.toBeInTheDocument();
    expect(screen.getByTestId('gate-waiting')).toBeInTheDocument();
  });

  it("wires the screen's own Back into the gate", () => {
    backupSignerGateState.isOpen = false;
    render(<SetupOnRamp />);
    fireEvent.click(screen.getByTestId('gate-waiting'));
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.FundYourAgent);
  });
});
