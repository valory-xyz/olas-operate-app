import { fireEvent, render, screen } from '@testing-library/react';

import { SetupBridgeOnboarding } from '../../../../../components/SetupPage/Create/SetupBridgeOnboarding/SetupBridgeOnboarding';
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
    selectedAgentConfig: {
      middlewareHomeChainId: 'gnosis',
      evmHomeChainId: EvmChainIdMap.Gnosis,
    },
    selectedAgentType: 'trader',
  }),
  useSetup: () => ({ goto: mockGotoSetup, prevState: undefined }),
}));

jest.mock('../../../../../components/Bridge', () => ({
  Bridge: () => <div data-testid="bridge" />,
}));

jest.mock('../../../../../components/ui', () => ({
  AgentSetupCompleteModal: () => null,
}));

describe('SetupBridgeOnboarding', () => {
  afterEach(() => {
    resetBackupSignerGateState();
  });

  it('renders the bridge inside the backup signer gate', () => {
    render(<SetupBridgeOnboarding />);
    expect(screen.getByTestId('bridge')).toBeInTheDocument();
  });

  it('does not open the bridge (which creates the Pearl Safe) until the gate opens', () => {
    backupSignerGateState.isOpen = false;
    render(<SetupBridgeOnboarding />);
    expect(screen.queryByTestId('bridge')).not.toBeInTheDocument();
    expect(screen.getByTestId('gate-waiting')).toBeInTheDocument();
  });

  it("wires the screen's own Back into the gate", () => {
    backupSignerGateState.isOpen = false;
    render(<SetupBridgeOnboarding />);
    fireEvent.click(screen.getByTestId('gate-waiting'));
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.FundYourAgent);
  });
});
