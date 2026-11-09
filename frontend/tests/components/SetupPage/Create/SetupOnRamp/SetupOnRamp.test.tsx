import { render, screen } from '@testing-library/react';

import { SetupOnRamp } from '../../../../../components/SetupPage/Create/SetupOnRamp/SetupOnRamp';
import { EvmChainIdMap } from '../../../../../constants/chains';

jest.mock('../../../../../constants/providers', () => ({ PROVIDERS: {} }));

let mockIsBackupSignerReady = true;
let mockIsBackupSignerError = false;

jest.mock('../../../../../hooks', () => ({
  useBackupSignerGuard: () => ({
    isBackupSignerReady: mockIsBackupSignerReady,
    isBackupSignerError: mockIsBackupSignerError,
  }),
  useGetBridgeRequirementsParams: () => jest.fn(),
  useServices: () => ({
    selectedAgentConfig: { evmHomeChainId: EvmChainIdMap.Gnosis },
  }),
  useSetup: () => ({ goto: jest.fn(), prevState: undefined }),
}));

jest.mock('../../../../../components/OnRamp', () => ({
  OnRamp: () => <div data-testid="on-ramp" />,
}));

describe('SetupOnRamp', () => {
  afterEach(() => {
    mockIsBackupSignerReady = true;
    mockIsBackupSignerError = false;
  });

  it('opens the on-ramp once the backup signer is settled', () => {
    render(<SetupOnRamp />);
    expect(screen.getByTestId('on-ramp')).toBeInTheDocument();
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
