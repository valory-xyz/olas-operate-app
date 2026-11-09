import { render, screen, waitFor } from '@testing-library/react';

import {
  AccountRecoveryProvider,
  useAccountRecoveryContext,
} from '../../../components/AccountRecovery/AccountRecoveryProvider';
import { createQueryClientWrapper } from '../../helpers/queryClient';

const mockBackupAddress = '0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f';
let mockIsWeb3AuthEnabled = true;

jest.mock('../../../hooks', () => ({
  useMasterWalletContext: () => ({ masterSafes: [], isLoading: false }),
  useSetup: () => ({ goto: jest.fn() }),
  useStore: () => ({
    storeState: {
      lastProvidedBackupWallet: {
        address: mockBackupAddress,
        type: 'web3auth',
      },
    },
  }),
  useWeb3AuthStatus: () => ({
    isWeb3AuthEnabled: mockIsWeb3AuthEnabled,
    isLoading: false,
  }),
}));

jest.mock('../../../context/OnlineStatusProvider', () => ({
  useOnlineStatus: () => ({ isOnline: true }),
}));

jest.mock('../../../service/Recovery', () => ({
  RecoveryService: {
    getExtendedWallet: jest.fn(() => Promise.resolve([{ safes: {} }])),
    getRecoveryFundingRequirements: jest.fn(),
  },
}));

// A Web3Auth backup that is the same on every chain: recovery is possible
// unless the provider gates it.
jest.mock('../../../components/AccountRecovery/utils', () => ({
  getBackupWalletStatus: () => ({
    areAllBackupOwnersSame: true,
    hasBackupWalletsAcrossEveryChain: true,
    backupAddress: mockBackupAddress,
  }),
  parseRecoveryFundingRequirements: () => [],
}));

const Consumer = () => {
  const {
    isLoading,
    isRecoveryAvailable,
    isWeb3AuthEnabled,
    backupWalletAddress,
  } = useAccountRecoveryContext();
  if (isLoading) return <div>loading</div>;
  return (
    <div>
      <span data-testid="available">{String(isRecoveryAvailable)}</span>
      <span data-testid="enabled">{String(isWeb3AuthEnabled)}</span>
      <span data-testid="address">{backupWalletAddress ?? 'none'}</span>
    </div>
  );
};

const renderProvider = () =>
  render(
    <AccountRecoveryProvider>
      <Consumer />
    </AccountRecoveryProvider>,
    { wrapper: createQueryClientWrapper() },
  );

describe('AccountRecoveryProvider', () => {
  it('offers backup-wallet recovery when Web3Auth is enabled', async () => {
    mockIsWeb3AuthEnabled = true;
    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('available')).toHaveTextContent('true'),
    );
    expect(screen.getByTestId('enabled')).toHaveTextContent('true');
    expect(screen.getByTestId('address')).toHaveTextContent(mockBackupAddress);
  });

  it('does not offer backup-wallet recovery when Web3Auth is disabled', async () => {
    mockIsWeb3AuthEnabled = false;
    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('available')).toHaveTextContent('false'),
    );
    expect(screen.getByTestId('enabled')).toHaveTextContent('false');
    expect(screen.getByTestId('address')).toHaveTextContent('none');
  });
});
