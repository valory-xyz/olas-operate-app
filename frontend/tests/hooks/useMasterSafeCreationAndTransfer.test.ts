import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { act, createElement, PropsWithChildren } from 'react';

import { GNOSIS_TOKEN_CONFIG, TokenSymbolMap } from '../../config/tokens';
import { AddressZero } from '../../constants/address';
import {
  BACKUP_SIGNER_CHECKING_MESSAGE,
  BACKUP_SIGNER_NOT_SET_MESSAGE,
  BACKUP_SIGNER_UNAVAILABLE_MESSAGE,
} from '../../constants/backupWallet';
import { MiddlewareChainMap } from '../../constants/chains';
import { PAGES } from '../../constants/pages';
import { SETUP_SCREEN } from '../../constants/setupScreen';
import { LatchedBackupSignerContext } from '../../context/LatchedBackupSignerContext';
import { useBackupSignerState } from '../../hooks/useBackupSigner';
import { useMasterSafeCreationAndTransfer } from '../../hooks/useMasterSafeCreationAndTransfer';
import { useServices } from '../../hooks/useServices';
import { WalletService } from '../../service/Wallet';
import { SafeCreationResponse } from '../../types/Wallet';
import {
  BACKUP_SIGNER_ADDRESS,
  MOCK_TX_HASH_1,
  MOCK_TX_HASH_2,
  MOCK_TX_HASH_3,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({ PROVIDERS: {} }));

jest.mock('../../service/Wallet', () => ({
  WalletService: { createSafe: jest.fn() },
}));

jest.mock('../../hooks/useBackupSigner', () => ({
  useBackupSignerState: jest.fn(),
}));

const mockLogEvent = jest.fn();
jest.mock('../../hooks/useElectronApi', () => ({
  useElectronApi: () => ({ logEvent: mockLogEvent }),
}));

const mockGotoSetup = jest.fn();
jest.mock('../../hooks/useSetup', () => ({
  useSetup: () => ({ goto: mockGotoSetup }),
}));

const mockGotoPage = jest.fn();
jest.mock('../../hooks/usePageState', () => ({
  usePageState: () => ({ goto: mockGotoPage }),
}));

jest.mock('../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));

const mockRefetch = jest.fn();
jest.mock('../../hooks', () => ({
  useBalanceAndRefillRequirementsContext: jest.fn(() => ({
    refetch: mockRefetch,
  })),
}));

const mockMessageError = jest.fn();
jest.mock('../../context/MessageProvider', () => ({
  useMessageApi: () => ({ error: mockMessageError }),
}));

const mockUseBackupSignerState = useBackupSignerState as jest.Mock;
const mockUseServices = useServices as jest.Mock;
const mockCreateSafe = WalletService.createSafe as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
    },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

const makeSafeCreationResponse = (
  overrides: Partial<SafeCreationResponse> = {},
): SafeCreationResponse => ({
  safe: AddressZero,
  create_tx: MOCK_TX_HASH_1,
  transfer_txs: {},
  transfer_errors: {},
  message: 'OK',
  status: 'SAFE_CREATED_TRANSFER_COMPLETED',
  ...overrides,
});

describe('useMasterSafeCreationAndTransfer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBackupSignerState.mockReturnValue({
      state: 'ready',
      backupSignerAddress: BACKUP_SIGNER_ADDRESS,
    });
    mockUseServices.mockReturnValue({
      selectedAgentConfig: {
        middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
      },
    });
  });

  it('calls WalletService.createSafe with chain and backup signer', async () => {
    mockCreateSafe.mockResolvedValue(makeSafeCreationResponse());

    const { result } = renderHook(
      () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockCreateSafe).toHaveBeenCalledWith(
      MiddlewareChainMap.GNOSIS,
      BACKUP_SIGNER_ADDRESS,
    );
    // Safe-creation mode: routing mode would not wait for the owners.
    expect(mockUseBackupSignerState).toHaveBeenCalledWith({
      forSafeCreation: true,
    });
  });

  it.each([
    ['pending', 'SIGNER_PENDING', BACKUP_SIGNER_CHECKING_MESSAGE],
    ['error', 'SIGNER_UNAVAILABLE', BACKUP_SIGNER_UNAVAILABLE_MESSAGE],
    [
      'needsNewBackup',
      'SIGNER_NEEDS_NEW_BACKUP',
      BACKUP_SIGNER_NOT_SET_MESSAGE,
    ],
  ])(
    'refuses to create the Safe while the backup signer is %s, saying why',
    async (signerState, expectedCode, expectedMessage) => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockUseBackupSignerState.mockReturnValue({ state: signerState });

      const { result } = renderHook(
        () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await expect(result.current.mutateAsync()).rejects.toMatchObject({
          code: expectedCode,
          message: expectedMessage,
        });
      });
      expect(mockCreateSafe).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(mockMessageError).toHaveBeenCalledWith(expectedMessage),
      );
      expect(mockMessageError).not.toHaveBeenCalledWith(
        'Failed to create master safe.',
      );
      consoleSpy.mockRestore();
    },
  );

  it("logs why an unavailable backup signer was refused to Pearl's logs", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockUseBackupSignerState.mockReturnValue({
      state: 'error',
      reason: 'Failed to read Safe owners on chain 100: rpc down',
    });

    const { result } = renderHook(
      () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
      { wrapper: createWrapper() },
    );
    await act(async () => {
      await result.current.mutateAsync().catch(() => undefined);
    });

    expect(mockLogEvent).toHaveBeenCalledWith(
      'Safe creation refused, backup signer unavailable: Failed to read Safe owners on chain 100: rpc down',
    );
    consoleSpy.mockRestore();
  });

  it.each(['pending', 'error'])(
    'does not send a %s backup signer to the backup step',
    async (signerState) => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockUseBackupSignerState.mockReturnValue({ state: signerState });

      const { result } = renderHook(
        () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
        { wrapper: createWrapper() },
      );
      await act(async () => {
        await result.current.mutateAsync().catch(() => undefined);
      });

      await waitFor(() => expect(mockMessageError).toHaveBeenCalled());
      expect(mockGotoSetup).not.toHaveBeenCalled();
      expect(mockGotoPage).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    },
  );

  it('sends the user to the backup step when a new backup wallet is needed', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockUseBackupSignerState.mockReturnValue({ state: 'needsNewBackup' });

    const { result } = renderHook(
      () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
      { wrapper: createWrapper() },
    );
    await act(async () => {
      await result.current.mutateAsync().catch(() => undefined);
    });

    await waitFor(() =>
      expect(mockGotoSetup).toHaveBeenCalledWith(
        SETUP_SCREEN.SetupBackupSigner,
      ),
    );
    // Also from the Main page (Complete Agent Setup): switch to the Setup page too.
    expect(mockGotoPage).toHaveBeenCalledWith(PAGES.Setup);
    consoleSpy.mockRestore();
  });

  it("uses a guarded screen's latched signer over the live state", async () => {
    mockCreateSafe.mockResolvedValue(makeSafeCreationResponse());
    mockUseBackupSignerState.mockReturnValue({ state: 'needsNewBackup' });
    const QueryWrapper = createWrapper();
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(
        QueryWrapper,
        null,
        createElement(
          LatchedBackupSignerContext.Provider,
          {
            value: {
              state: 'ready',
              backupSignerAddress: BACKUP_SIGNER_ADDRESS,
            },
          },
          children,
        ),
      );

    const { result } = renderHook(
      () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
      { wrapper },
    );
    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockCreateSafe).toHaveBeenCalledWith(
      MiddlewareChainMap.GNOSIS,
      BACKUP_SIGNER_ADDRESS,
    );
  });

  it('returns isSafeCreated=true when status is not SAFE_CREATION_FAILED', async () => {
    mockCreateSafe.mockResolvedValue(
      makeSafeCreationResponse({ status: 'SAFE_CREATED_TRANSFER_COMPLETED' }),
    );

    const { result } = renderHook(
      () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
      { wrapper: createWrapper() },
    );

    let response: Awaited<ReturnType<typeof result.current.mutateAsync>>;
    await act(async () => {
      response = await result.current.mutateAsync();
    });

    expect(response!.safeCreationDetails.isSafeCreated).toBe(true);
    expect(response!.safeCreationDetails.status).toBe('finish');
  });

  it('returns isSafeCreated=false when status is SAFE_CREATION_FAILED', async () => {
    mockCreateSafe.mockResolvedValue(
      makeSafeCreationResponse({ status: 'SAFE_CREATION_FAILED' }),
    );

    const { result } = renderHook(
      () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
      { wrapper: createWrapper() },
    );

    let response: Awaited<ReturnType<typeof result.current.mutateAsync>>;
    await act(async () => {
      response = await result.current.mutateAsync();
    });

    expect(response!.safeCreationDetails.isSafeCreated).toBe(false);
    expect(response!.safeCreationDetails.status).toBe('error');
  });

  it('builds txnLink for safe creation from create_tx', async () => {
    mockCreateSafe.mockResolvedValue(
      makeSafeCreationResponse({ create_tx: MOCK_TX_HASH_2 }),
    );

    const { result } = renderHook(
      () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
      { wrapper: createWrapper() },
    );

    let response: Awaited<ReturnType<typeof result.current.mutateAsync>>;
    await act(async () => {
      response = await result.current.mutateAsync();
    });

    expect(response!.safeCreationDetails.txnLink).toContain(
      `/tx/${MOCK_TX_HASH_2}`,
    );
  });

  it('returns null txnLink when create_tx is empty', async () => {
    mockCreateSafe.mockResolvedValue(
      makeSafeCreationResponse({ create_tx: '' }),
    );

    const { result } = renderHook(
      () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
      { wrapper: createWrapper() },
    );

    let response: Awaited<ReturnType<typeof result.current.mutateAsync>>;
    await act(async () => {
      response = await result.current.mutateAsync();
    });

    expect(response!.safeCreationDetails.txnLink).toBeNull();
  });

  it('returns isTransferComplete=true for SAFE_CREATED_TRANSFER_COMPLETED', async () => {
    mockCreateSafe.mockResolvedValue(
      makeSafeCreationResponse({ status: 'SAFE_CREATED_TRANSFER_COMPLETED' }),
    );

    const { result } = renderHook(
      () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
      { wrapper: createWrapper() },
    );

    let response: Awaited<ReturnType<typeof result.current.mutateAsync>>;
    await act(async () => {
      response = await result.current.mutateAsync();
    });

    expect(response!.transferDetails.isTransferComplete).toBe(true);
  });

  it('returns isTransferComplete=true for SAFE_EXISTS_ALREADY_FUNDED', async () => {
    mockCreateSafe.mockResolvedValue(
      makeSafeCreationResponse({ status: 'SAFE_EXISTS_ALREADY_FUNDED' }),
    );

    const { result } = renderHook(
      () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
      { wrapper: createWrapper() },
    );

    let response: Awaited<ReturnType<typeof result.current.mutateAsync>>;
    await act(async () => {
      response = await result.current.mutateAsync();
    });

    expect(response!.transferDetails.isTransferComplete).toBe(true);
  });

  it('returns isTransferComplete=true for SAFE_EXISTS_TRANSFER_COMPLETED', async () => {
    mockCreateSafe.mockResolvedValue(
      makeSafeCreationResponse({ status: 'SAFE_EXISTS_TRANSFER_COMPLETED' }),
    );

    const { result } = renderHook(
      () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
      { wrapper: createWrapper() },
    );

    let response: Awaited<ReturnType<typeof result.current.mutateAsync>>;
    await act(async () => {
      response = await result.current.mutateAsync();
    });

    expect(response!.transferDetails.isTransferComplete).toBe(true);
  });

  it('returns isTransferComplete=false for transfer-failed statuses', async () => {
    mockCreateSafe.mockResolvedValue(
      makeSafeCreationResponse({ status: 'SAFE_CREATED_TRANSFER_FAILED' }),
    );

    const { result } = renderHook(
      () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
      { wrapper: createWrapper() },
    );

    let response: Awaited<ReturnType<typeof result.current.mutateAsync>>;
    await act(async () => {
      response = await result.current.mutateAsync();
    });

    expect(response!.transferDetails.isTransferComplete).toBe(false);
  });

  it('uses AddressZero for NativeGas tokens in transfer lookup', async () => {
    // XDAI is NativeGas on Gnosis → should use AddressZero as key
    mockCreateSafe.mockResolvedValue(
      makeSafeCreationResponse({
        transfer_txs: { [AddressZero]: MOCK_TX_HASH_1 },
      }),
    );

    const { result } = renderHook(
      () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
      { wrapper: createWrapper() },
    );

    let response: Awaited<ReturnType<typeof result.current.mutateAsync>>;
    await act(async () => {
      response = await result.current.mutateAsync();
    });

    const xdaiTransfer = response!.transferDetails.transfers[0];
    expect(xdaiTransfer.symbol).toBe(TokenSymbolMap.XDAI);
    expect(xdaiTransfer.status).toBe('finish');
    expect(xdaiTransfer.txnLink).toContain(MOCK_TX_HASH_1);
  });

  it('uses token address for ERC20 tokens in transfer lookup', async () => {
    const olasAddress = GNOSIS_TOKEN_CONFIG.OLAS!.address!;
    mockCreateSafe.mockResolvedValue(
      makeSafeCreationResponse({
        transfer_txs: { [olasAddress]: MOCK_TX_HASH_2 },
      }),
    );

    const { result } = renderHook(
      () => useMasterSafeCreationAndTransfer([TokenSymbolMap.OLAS]),
      { wrapper: createWrapper() },
    );

    let response: Awaited<ReturnType<typeof result.current.mutateAsync>>;
    await act(async () => {
      response = await result.current.mutateAsync();
    });

    const olasTransfer = response!.transferDetails.transfers[0];
    expect(olasTransfer.symbol).toBe(TokenSymbolMap.OLAS);
    expect(olasTransfer.status).toBe('finish');
    expect(olasTransfer.txnLink).toContain(MOCK_TX_HASH_2);
  });

  it('marks transfer as error when transfer_errors has an entry', async () => {
    mockCreateSafe.mockResolvedValue(
      makeSafeCreationResponse({
        transfer_errors: { [AddressZero]: MOCK_TX_HASH_3 },
        transfer_txs: {},
        status: 'SAFE_CREATED_TRANSFER_FAILED',
      }),
    );

    const { result } = renderHook(
      () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
      { wrapper: createWrapper() },
    );

    let response: Awaited<ReturnType<typeof result.current.mutateAsync>>;
    await act(async () => {
      response = await result.current.mutateAsync();
    });

    const xdaiTransfer = response!.transferDetails.transfers[0];
    expect(xdaiTransfer.status).toBe('error');
    expect(xdaiTransfer.txnLink).toContain(MOCK_TX_HASH_3);
  });

  it('marks transfer as wait when no txn hash exists', async () => {
    mockCreateSafe.mockResolvedValue(
      makeSafeCreationResponse({
        transfer_txs: {},
        transfer_errors: {},
        status: 'SAFE_CREATED_TRANSFER_FAILED',
      }),
    );

    const { result } = renderHook(
      () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
      { wrapper: createWrapper() },
    );

    let response: Awaited<ReturnType<typeof result.current.mutateAsync>>;
    await act(async () => {
      response = await result.current.mutateAsync();
    });

    const xdaiTransfer = response!.transferDetails.transfers[0];
    expect(xdaiTransfer.status).toBe('wait');
    expect(xdaiTransfer.txnLink).toBeNull();
  });

  it('calls refetch on success', async () => {
    mockCreateSafe.mockResolvedValue(makeSafeCreationResponse());

    const { result } = renderHook(
      () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.mutateAsync();
    });

    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('shows error message on mutation failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockCreateSafe.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useMasterSafeCreationAndTransfer([TokenSymbolMap.XDAI]),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      try {
        await result.current.mutateAsync();
      } catch {
        // expected
      }
    });

    await waitFor(() => {
      expect(mockMessageError).toHaveBeenCalledWith(
        'Failed to create master safe.',
      );
    });

    consoleSpy.mockRestore();
  });

  it('throws when token config is not found for the given symbol on chain', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockCreateSafe.mockResolvedValue(makeSafeCreationResponse());

    const { result } = renderHook(
      () =>
        useMasterSafeCreationAndTransfer([
          'NONEXISTENT_TOKEN' as typeof TokenSymbolMap.XDAI,
        ]),
      { wrapper: createWrapper() },
    );

    let caught: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync();
      } catch (error) {
        caught = error;
      }
    });
    expect((caught as Error).message).toContain('Token config not found');

    consoleSpy.mockRestore();
  });
});
