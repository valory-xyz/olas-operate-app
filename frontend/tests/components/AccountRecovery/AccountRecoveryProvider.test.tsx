import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { PropsWithChildren } from 'react';

import {
  AccountRecoveryProvider,
  useAccountRecoveryContext,
} from '../../../components/AccountRecovery/AccountRecoveryProvider';
import { RESET_METHOD } from '../../../components/AccountRecovery/constants';
import { REACT_QUERY_KEYS } from '../../../constants/reactQueryKeys';
import { BACKUP_SIGNER_ADDRESS } from '../../helpers/factories';
import { createTestQueryClient } from '../../helpers/queryClient';

const mockBackupAddress = BACKUP_SIGNER_ADDRESS;
let mockIsWeb3AuthEnabled = true;
let mockIsWeb3AuthStatusLoading = false;

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
    isLoading: mockIsWeb3AuthStatusLoading,
  }),
}));

jest.mock('../../../context/OnlineStatusProvider', () => ({
  useOnlineStatus: () => ({ isOnline: true }),
}));

jest.mock('../../../service/Recovery', () => ({
  RecoveryService: {
    getExtendedWallet: jest.fn(() => Promise.resolve([{ safes: {} }])),
    getRecoveryFundingRequirements: jest.fn(() => Promise.resolve({})),
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
    backupWalletAddress,
    selectResetMethodAndProceed,
  } = useAccountRecoveryContext();
  if (isLoading) return <div>loading</div>;
  return (
    <div>
      <span data-testid="available">{String(isRecoveryAvailable)}</span>
      <span data-testid="address">{backupWalletAddress ?? 'none'}</span>
      <button
        onClick={() => selectResetMethodAndProceed(RESET_METHOD.BackupWallet)}
      >
        pick backup wallet
      </button>
      <button onClick={() => selectResetMethodAndProceed(RESET_METHOD.SRP)}>
        pick recovery phrase
      </button>
    </div>
  );
};

const renderProvider = () => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const utils = render(
    <AccountRecoveryProvider>
      <Consumer />
    </AccountRecoveryProvider>,
    { wrapper: Wrapper },
  );
  return { ...utils, queryClient };
};

describe('AccountRecoveryProvider', () => {
  beforeEach(() => {
    mockIsWeb3AuthEnabled = true;
    mockIsWeb3AuthStatusLoading = false;
  });

  it('offers backup-wallet recovery when Web3Auth is enabled', async () => {
    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('available')).toHaveTextContent('true'),
    );
    expect(screen.getByTestId('address')).toHaveTextContent(mockBackupAddress);
  });

  it('does not offer backup-wallet recovery when Web3Auth is disabled', async () => {
    mockIsWeb3AuthEnabled = false;
    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('available')).toHaveTextContent('false'),
    );
    expect(screen.getByTestId('address')).toHaveTextContent('none');
  });

  it('does not wait for the Web3Auth status, so recovery-phrase reset works offline', async () => {
    mockIsWeb3AuthEnabled = false;
    mockIsWeb3AuthStatusLoading = true;
    const { queryClient } = renderProvider();

    await waitFor(() =>
      expect(
        queryClient.getQueryState(REACT_QUERY_KEYS.EXTENDED_WALLET_KEY)?.status,
      ).toBe('success'),
    );
    expect(screen.queryByText('loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('available')).toBeInTheDocument();
  });

  it('keeps a chosen backup-wallet recovery available if the status later turns disabled', async () => {
    const { rerender } = renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId('available')).toHaveTextContent('true'),
    );

    act(() => {
      fireEvent.click(screen.getByText('pick backup wallet'));
    });
    mockIsWeb3AuthEnabled = false;
    rerender(
      <AccountRecoveryProvider>
        <Consumer />
      </AccountRecoveryProvider>,
    );

    expect(screen.getByTestId('available')).toHaveTextContent('true');
  });

  it('does not latch backup-wallet recovery for a recovery-phrase pick', async () => {
    const { rerender } = renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId('available')).toHaveTextContent('true'),
    );

    act(() => {
      fireEvent.click(screen.getByText('pick recovery phrase'));
    });
    mockIsWeb3AuthEnabled = false;
    rerender(
      <AccountRecoveryProvider>
        <Consumer />
      </AccountRecoveryProvider>,
    );

    expect(screen.getByTestId('available')).toHaveTextContent('false');
  });
});
