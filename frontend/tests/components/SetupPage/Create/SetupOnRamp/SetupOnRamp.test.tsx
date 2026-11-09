import { render, screen } from '@testing-library/react';

import { SetupOnRamp } from '../../../../../components/SetupPage/Create/SetupOnRamp/SetupOnRamp';
import { EvmChainIdMap } from '../../../../../constants/chains';

jest.mock('../../../../../constants/providers', () => ({ PROVIDERS: {} }));

const mockLatchedSigner = {
  state: 'ready',
  backupSignerAddress: '0x2222222222222222222222222222222222222222',
};
let mockIsBackupSignerReady = true;
let mockIsBackupSignerError = false;
let mockSeenLatchedSigner: unknown;

jest.mock('../../../../../hooks', () => ({
  useBackupSignerGuard: () => ({
    latchedSigner: mockIsBackupSignerReady ? mockLatchedSigner : null,
    isBackupSignerError: mockIsBackupSignerError,
  }),
  useGetBridgeRequirementsParams: () => jest.fn(),
  useServices: () => ({
    selectedAgentConfig: { evmHomeChainId: EvmChainIdMap.Gnosis },
  }),
  useSetup: () => ({ goto: jest.fn(), prevState: undefined }),
}));

jest.mock('../../../../../components/OnRamp', () => ({
  OnRamp: () => {
    /* eslint-disable @typescript-eslint/no-var-requires */
    mockSeenLatchedSigner =
      require('../../../../../context/LatchedBackupSignerContext').useLatchedBackupSigner();
    /* eslint-enable @typescript-eslint/no-var-requires */
    return <div data-testid="on-ramp" />;
  },
}));

describe('SetupOnRamp', () => {
  afterEach(() => {
    mockIsBackupSignerReady = true;
    mockIsBackupSignerError = false;
  });

  it('opens the on-ramp once the backup signer is settled, sharing the latched signer', () => {
    render(<SetupOnRamp />);
    expect(screen.getByTestId('on-ramp')).toBeInTheDocument();
    // The on-ramp's Safe creation reads the same latched signer.
    expect(mockSeenLatchedSigner).toBe(mockLatchedSigner);
  });

  it('waits for the backup signer before the on-ramp can create the Pearl Safe', () => {
    mockIsBackupSignerReady = false;
    render(<SetupOnRamp />);
    expect(screen.queryByTestId('on-ramp')).not.toBeInTheDocument();
  });

  it('shows a retrying error when the backup signer is unreadable', () => {
    mockIsBackupSignerReady = false;
    mockIsBackupSignerError = true;
    render(<SetupOnRamp />);
    expect(screen.queryByTestId('on-ramp')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Couldn.t check your backup wallet/),
    ).toBeInTheDocument();
  });
});
