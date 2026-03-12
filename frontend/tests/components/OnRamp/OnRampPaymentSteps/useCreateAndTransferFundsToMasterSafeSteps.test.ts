import { renderHook } from '@testing-library/react';

import { TokenSymbol, TokenSymbolMap } from '../../../../config/tokens';
import { EvmChainIdMap } from '../../../../constants/chains';
import { useMasterSafeCreationAndTransfer } from '../../../../hooks/useMasterSafeCreationAndTransfer';
import { useOnRampContext } from '../../../../hooks/useOnRampContext';
import { useMasterWalletContext } from '../../../../hooks/useWallet';
import { BridgingStepStatus } from '../../../../types/Bridge';
import {
  DEFAULT_SAFE_ADDRESS,
  MOCK_TX_HASH_1,
} from '../../../helpers/factories';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({}));
jest.mock('../../../../config/providers', () => ({ providers: [] }));

jest.mock('../../../../hooks/useMasterSafeCreationAndTransfer', () => ({
  useMasterSafeCreationAndTransfer: jest.fn(),
}));
jest.mock('../../../../hooks/useOnRampContext', () => ({
  useOnRampContext: jest.fn(),
}));
jest.mock('../../../../hooks/useWallet', () => ({
  useMasterWalletContext: jest.fn(),
}));
jest.mock('../../../../components/ui/FundsAreSafeMessage', () => ({
  FundsAreSafeMessage: () => null,
}));

// ---------------------------------------------------------------------------
// Typed mock accessors
// ---------------------------------------------------------------------------

const mockUseMasterSafeCreationAndTransfer =
  useMasterSafeCreationAndTransfer as jest.MockedFunction<
    typeof useMasterSafeCreationAndTransfer
  >;
const mockUseOnRampContext = useOnRampContext as jest.MockedFunction<
  typeof useOnRampContext
>;
const mockUseMasterWalletContext =
  useMasterWalletContext as jest.MockedFunction<typeof useMasterWalletContext>;

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  useCreateAndTransferFundsToMasterSafeSteps,
} = require('../../../../components/OnRamp/OnRampPaymentSteps/useCreateAndTransferFundsToMasterSafeSteps');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TransferStatus = {
  symbol: TokenSymbol;
  status: BridgingStepStatus;
  txnLink: string | null;
};

type CreationAndTransferDetails = {
  safeCreationDetails: {
    isSafeCreated: boolean;
    txnLink: string | null;
    status: 'finish' | 'error';
  };
  transferDetails: {
    isTransferComplete: boolean;
    transfers: TransferStatus[];
  };
};

const DEFAULT_CHAIN_ID = EvmChainIdMap.Gnosis;
const DEFAULT_TOKENS: TokenSymbol[] = [
  TokenSymbolMap.OLAS,
  TokenSymbolMap.XDAI,
];

const makeCreationAndTransferDetails = (
  overrides: Partial<{
    isSafeCreated: boolean;
    safeTxnLink: string | null;
    safeStatus: 'finish' | 'error';
    isTransferComplete: boolean;
    transfers: TransferStatus[];
  }> = {},
): CreationAndTransferDetails => ({
  safeCreationDetails: {
    isSafeCreated: overrides.isSafeCreated ?? false,
    txnLink: overrides.safeTxnLink ?? null,
    status: overrides.safeStatus ?? 'finish',
  },
  transferDetails: {
    isTransferComplete: overrides.isTransferComplete ?? false,
    transfers: overrides.transfers ?? [],
  },
});

const makeTransferStatus = (
  symbol: TokenSymbol,
  status: BridgingStepStatus,
  txnLink: string | null = null,
): TransferStatus => ({ symbol, status, txnLink });

type SetupOptions = {
  selectedChainId?: number | null;
  getMasterSafeOf?: jest.Mock;
  isMasterWalletFetched?: boolean;
  isPending?: boolean;
  isError?: boolean;
  data?: CreationAndTransferDetails | undefined;
  mutate?: jest.Mock;
};

const setupMocks = (overrides: SetupOptions = {}) => {
  const createMasterSafeFn = overrides.mutate ?? jest.fn();
  const getMasterSafeOfFn =
    overrides.getMasterSafeOf ?? jest.fn().mockReturnValue(undefined);

  mockUseOnRampContext.mockReturnValue({
    selectedChainId:
      'selectedChainId' in overrides
        ? overrides.selectedChainId
        : DEFAULT_CHAIN_ID,
  } as ReturnType<typeof useOnRampContext>);

  mockUseMasterWalletContext.mockReturnValue({
    getMasterSafeOf: getMasterSafeOfFn,
    isFetched: overrides.isMasterWalletFetched ?? true,
  } as unknown as ReturnType<typeof useMasterWalletContext>);

  mockUseMasterSafeCreationAndTransfer.mockReturnValue({
    isPending: overrides.isPending ?? false,
    isError: overrides.isError ?? false,
    data: overrides.data ?? undefined,
    mutate: createMasterSafeFn,
  } as unknown as ReturnType<typeof useMasterSafeCreationAndTransfer>);

  return { createMasterSafeFn, getMasterSafeOfFn };
};

const renderTestHook = (
  isSwapCompleted: boolean = false,
  tokensToBeTransferred: TokenSymbol[] = DEFAULT_TOKENS,
) =>
  renderHook(() =>
    useCreateAndTransferFundsToMasterSafeSteps(
      isSwapCompleted,
      tokensToBeTransferred,
    ),
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCreateAndTransferFundsToMasterSafeSteps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Error: selectedChainId is null
  // -------------------------------------------------------------------------

  describe('when selectedChainId is null', () => {
    it('throws an error', () => {
      setupMocks({ selectedChainId: null });
      // Suppress React error boundary console.error output
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      expect(() => renderTestHook()).toThrow(
        'Selected chain ID is not set in the on-ramp context',
      );
      errorSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Master safe already exists (shouldCreateMasterSafe = false)
  // -------------------------------------------------------------------------

  describe('when master safe already exists', () => {
    it('returns empty steps array and isMasterSafeCreatedAndFundsTransferred = false when swap not completed', () => {
      const getMasterSafeOfFn = jest
        .fn()
        .mockReturnValue({ address: DEFAULT_SAFE_ADDRESS });
      setupMocks({ getMasterSafeOf: getMasterSafeOfFn });

      const { result } = renderTestHook(false);
      expect(result.current.steps).toEqual([]);
      expect(result.current.isMasterSafeCreatedAndFundsTransferred).toBe(false);
    });

    it('returns empty steps array when swap is completed', () => {
      const getMasterSafeOfFn = jest
        .fn()
        .mockReturnValue({ address: DEFAULT_SAFE_ADDRESS });
      setupMocks({ getMasterSafeOf: getMasterSafeOfFn });

      const { result } = renderTestHook(true);
      expect(result.current.steps).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Should create master safe, swap NOT completed
  // -------------------------------------------------------------------------

  describe('when shouldCreateMasterSafe and swap not completed', () => {
    it('returns EMPTY_STATE_STEPS with wait statuses', () => {
      setupMocks();

      const { result } = renderTestHook(false);
      expect(result.current.steps).toHaveLength(2);
      expect(result.current.steps[0]).toEqual({
        status: 'wait',
        title: 'Create Pearl Wallet',
      });
      expect(result.current.steps[1]).toEqual({
        status: 'wait',
        title: 'Transfer funds to the Pearl Wallet',
      });
    });

    it('returns isMasterSafeCreatedAndFundsTransferred = false', () => {
      setupMocks();

      const { result } = renderTestHook(false);
      expect(result.current.isMasterSafeCreatedAndFundsTransferred).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // masterSafeCreationStep status derivation
  // -------------------------------------------------------------------------

  describe('masterSafeCreationStep status', () => {
    it('is "wait" when swap is not completed', () => {
      setupMocks();

      const { result } = renderTestHook(false);
      expect(result.current.steps[0].status).toBe('wait');
    });

    it('is "error" when isErrorMasterSafeCreation (mutation error)', () => {
      setupMocks({ isError: true });

      const { result } = renderTestHook(true);
      expect(result.current.steps[0].status).toBe('error');
    });

    it('is "error" when safeCreationDetails.status is "error"', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: false,
          safeStatus: 'error',
        }),
      });

      const { result } = renderTestHook(true);
      expect(result.current.steps[0].status).toBe('error');
    });

    it('is "process" when loading', () => {
      setupMocks({ isPending: true });

      const { result } = renderTestHook(true);
      expect(result.current.steps[0].status).toBe('process');
    });

    it('is "finish" when safe is created (via creationAndTransferDetails)', () => {
      setupMocks({
        isMasterWalletFetched: true,
        data: makeCreationAndTransferDetails({ isSafeCreated: true }),
      });

      const { result } = renderTestHook(true);
      expect(result.current.steps[0].status).toBe('finish');
    });

    it('is "wait" by default when swap completed but no other state', () => {
      setupMocks();

      const { result } = renderTestHook(true);
      expect(result.current.steps[0].status).toBe('wait');
    });
  });

  // -------------------------------------------------------------------------
  // masterSafeCreationStep description
  // -------------------------------------------------------------------------

  describe('masterSafeCreationStep description', () => {
    it('is "Sending Transaction..." when loading', () => {
      setupMocks({ isPending: true });

      const { result } = renderTestHook(true);
      const subSteps = result.current.steps[0].subSteps;
      expect(subSteps).toBeDefined();
      expect(subSteps[0].description).toBe('Sending Transaction...');
    });

    it('is "Transaction complete." when safe is created', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({ isSafeCreated: true }),
      });

      const { result } = renderTestHook(true);
      const subSteps = result.current.steps[0].subSteps;
      expect(subSteps[0].description).toBe('Transaction complete.');
    });

    it('is null by default', () => {
      setupMocks();

      const { result } = renderTestHook(true);
      const subSteps = result.current.steps[0].subSteps;
      expect(subSteps[0].description).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // masterSafeCreationStep txnLink
  // -------------------------------------------------------------------------

  describe('masterSafeCreationStep txnLink', () => {
    it('includes txnLink from safeCreationDetails', () => {
      const txnLink = `https://gnosisscan.io/tx/${MOCK_TX_HASH_1}`;
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          safeTxnLink: txnLink,
        }),
      });

      const { result } = renderTestHook(true);
      expect(result.current.steps[0].subSteps[0].txnLink).toBe(txnLink);
    });

    it('has undefined txnLink when no creation details', () => {
      setupMocks();

      const { result } = renderTestHook(true);
      expect(result.current.steps[0].subSteps[0].txnLink).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // masterSafeCreationStep failed
  // -------------------------------------------------------------------------

  describe('masterSafeCreationStep failed', () => {
    it('is null when no error', () => {
      setupMocks();

      const { result } = renderTestHook(true);
      expect(result.current.steps[0].subSteps[0].failed).toBeNull();
    });

    it('renders FundsAreSafeMessage when mutation error', () => {
      setupMocks({ isError: true });

      const { result } = renderTestHook(true);
      // FundsAreSafeMessage is mocked as () => null, so rendered element is null
      // but the failed field should not be null (it is a React element)
      expect(result.current.steps[0].subSteps[0].failed).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // masterSafeTransferFundStep status derivation
  // -------------------------------------------------------------------------

  describe('masterSafeTransferFundStep status', () => {
    it('is "wait" when swap not completed', () => {
      setupMocks();

      const { result } = renderTestHook(false);
      expect(result.current.steps[1].status).toBe('wait');
    });

    it('is "process" when loading master safe creation', () => {
      setupMocks({ isPending: true });

      const { result } = renderTestHook(true);
      expect(result.current.steps[1].status).toBe('process');
    });

    it('is "error" when any transfer has error status', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          transfers: [
            makeTransferStatus(TokenSymbolMap.OLAS, 'finish'),
            makeTransferStatus(TokenSymbolMap.XDAI, 'error'),
          ],
        }),
      });

      const { result } = renderTestHook(true);
      expect(result.current.steps[1].status).toBe('error');
    });

    it('is "process" when any transfer is in process', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          transfers: [
            makeTransferStatus(TokenSymbolMap.OLAS, 'finish'),
            makeTransferStatus(TokenSymbolMap.XDAI, 'process'),
          ],
        }),
      });

      const { result } = renderTestHook(true);
      expect(result.current.steps[1].status).toBe('process');
    });

    it('is "finish" when safe created and transfer complete', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          isTransferComplete: true,
          transfers: [
            makeTransferStatus(TokenSymbolMap.OLAS, 'finish'),
            makeTransferStatus(TokenSymbolMap.XDAI, 'finish'),
          ],
        }),
      });

      const { result } = renderTestHook(true);
      expect(result.current.steps[1].status).toBe('finish');
    });

    it('is "error" when safe created but transfer NOT complete', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          isTransferComplete: false,
          transfers: [
            makeTransferStatus(TokenSymbolMap.OLAS, 'finish'),
            makeTransferStatus(TokenSymbolMap.XDAI, 'finish'),
          ],
        }),
      });

      const { result } = renderTestHook(true);
      expect(result.current.steps[1].status).toBe('error');
    });

    it('is "wait" by default when swap completed but no transfer data', () => {
      setupMocks();

      const { result } = renderTestHook(true);
      expect(result.current.steps[1].status).toBe('wait');
    });
  });

  // -------------------------------------------------------------------------
  // Transfer sub-step descriptions
  // -------------------------------------------------------------------------

  describe('masterSafeTransferFundStep sub-step descriptions', () => {
    it('shows "Transfer SYMBOL complete." for finish status', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          isTransferComplete: true,
          transfers: [makeTransferStatus(TokenSymbolMap.OLAS, 'finish')],
        }),
      });

      const { result } = renderTestHook(true, [TokenSymbolMap.OLAS]);
      const subSteps = result.current.steps[1].subSteps;
      expect(subSteps[0].description).toBe(
        `Transfer ${TokenSymbolMap.OLAS} complete.`,
      );
    });

    it('shows "Transfer SYMBOL failed." for error status', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          transfers: [makeTransferStatus(TokenSymbolMap.XDAI, 'error')],
        }),
      });

      const { result } = renderTestHook(true, [TokenSymbolMap.XDAI]);
      const subSteps = result.current.steps[1].subSteps;
      expect(subSteps[0].description).toBe(
        `Transfer ${TokenSymbolMap.XDAI} failed.`,
      );
    });

    it('shows "Sending transaction..." for process status', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          transfers: [makeTransferStatus(TokenSymbolMap.OLAS, 'process')],
        }),
      });

      const { result } = renderTestHook(true, [TokenSymbolMap.OLAS]);
      const subSteps = result.current.steps[1].subSteps;
      expect(subSteps[0].description).toBe('Sending transaction...');
    });

    it('shows null for wait status', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          transfers: [makeTransferStatus(TokenSymbolMap.OLAS, 'wait')],
        }),
      });

      const { result } = renderTestHook(true, [TokenSymbolMap.OLAS]);
      const subSteps = result.current.steps[1].subSteps;
      expect(subSteps[0].description).toBeNull();
    });

    it('includes txnLink in transfer sub-steps', () => {
      const txnLink = `https://gnosisscan.io/tx/${MOCK_TX_HASH_1}`;
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          isTransferComplete: true,
          transfers: [
            makeTransferStatus(TokenSymbolMap.OLAS, 'finish', txnLink),
          ],
        }),
      });

      const { result } = renderTestHook(true, [TokenSymbolMap.OLAS]);
      expect(result.current.steps[1].subSteps[0].txnLink).toBe(txnLink);
    });

    it('renders FundsAreSafeMessage for error transfer status', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          transfers: [makeTransferStatus(TokenSymbolMap.OLAS, 'error')],
        }),
      });

      const { result } = renderTestHook(true, [TokenSymbolMap.OLAS]);
      expect(result.current.steps[1].subSteps[0].failed).not.toBeNull();
    });

    it('has null failed for non-error transfer status', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          isTransferComplete: true,
          transfers: [makeTransferStatus(TokenSymbolMap.OLAS, 'finish')],
        }),
      });

      const { result } = renderTestHook(true, [TokenSymbolMap.OLAS]);
      expect(result.current.steps[1].subSteps[0].failed).toBeNull();
    });

    it('returns empty subSteps when no transfer statuses', () => {
      setupMocks();

      const { result } = renderTestHook(true);
      expect(result.current.steps[1].subSteps).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // isMasterSafeCreatedAndFundsTransferred
  // -------------------------------------------------------------------------

  describe('isMasterSafeCreatedAndFundsTransferred', () => {
    it('is false when there is an error', () => {
      setupMocks({ isError: true });

      const { result } = renderTestHook(true);
      expect(result.current.isMasterSafeCreatedAndFundsTransferred).toBe(false);
    });

    it('is false when safe is not created', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({ isSafeCreated: false }),
      });

      const { result } = renderTestHook(true);
      expect(result.current.isMasterSafeCreatedAndFundsTransferred).toBe(false);
    });

    it('is false when transfer is not complete', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          isTransferComplete: false,
          transfers: [
            makeTransferStatus(TokenSymbolMap.OLAS, 'finish'),
            makeTransferStatus(TokenSymbolMap.XDAI, 'finish'),
          ],
        }),
      });

      const { result } = renderTestHook(true);
      expect(result.current.isMasterSafeCreatedAndFundsTransferred).toBe(false);
    });

    it('is false when tokensToBeTransferred is empty', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          isTransferComplete: true,
          transfers: [],
        }),
      });

      const { result } = renderTestHook(true, []);
      expect(result.current.isMasterSafeCreatedAndFundsTransferred).toBe(false);
    });

    it('is false and logs console.warn when transfer count does not match token count', () => {
      const warnSpy = jest
        .spyOn(window.console, 'warn')
        .mockImplementation(() => {});

      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          isTransferComplete: true,
          transfers: [makeTransferStatus(TokenSymbolMap.OLAS, 'finish')],
        }),
      });

      const { result } = renderTestHook(true, DEFAULT_TOKENS);
      expect(result.current.isMasterSafeCreatedAndFundsTransferred).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Expected 2 transfers, but got 1'),
      );
      warnSpy.mockRestore();
    });

    it('is false when any transfer does not have finish status', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          isTransferComplete: true,
          transfers: [
            makeTransferStatus(TokenSymbolMap.OLAS, 'finish'),
            makeTransferStatus(TokenSymbolMap.XDAI, 'error'),
          ],
        }),
      });

      const { result } = renderTestHook(true);
      expect(result.current.isMasterSafeCreatedAndFundsTransferred).toBe(false);
    });

    it('is true when all conditions are met', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          isTransferComplete: true,
          transfers: [
            makeTransferStatus(TokenSymbolMap.OLAS, 'finish'),
            makeTransferStatus(TokenSymbolMap.XDAI, 'finish'),
          ],
        }),
      });

      const { result } = renderTestHook(true);
      expect(result.current.isMasterSafeCreatedAndFundsTransferred).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // createMasterSafe effect
  // -------------------------------------------------------------------------

  describe('createMasterSafe effect', () => {
    it('calls createMasterSafe when all guards pass', () => {
      const { createMasterSafeFn } = setupMocks();

      renderTestHook(true);
      expect(createMasterSafeFn).toHaveBeenCalledTimes(1);
    });

    it('does not call createMasterSafe when shouldCreateMasterSafe is false', () => {
      const getMasterSafeOfFn = jest
        .fn()
        .mockReturnValue({ address: DEFAULT_SAFE_ADDRESS });
      const { createMasterSafeFn } = setupMocks({
        getMasterSafeOf: getMasterSafeOfFn,
      });

      renderTestHook(true);
      expect(createMasterSafeFn).not.toHaveBeenCalled();
    });

    it('does not call createMasterSafe when swap is not completed', () => {
      const { createMasterSafeFn } = setupMocks();

      renderTestHook(false);
      expect(createMasterSafeFn).not.toHaveBeenCalled();
    });

    it('does not call createMasterSafe when loading', () => {
      const { createMasterSafeFn } = setupMocks({ isPending: true });

      renderTestHook(true);
      expect(createMasterSafeFn).not.toHaveBeenCalled();
    });

    it('does not call createMasterSafe when there is an error', () => {
      const { createMasterSafeFn } = setupMocks({ isError: true });

      renderTestHook(true);
      expect(createMasterSafeFn).not.toHaveBeenCalled();
    });

    it('does not call createMasterSafe when safe is already created', () => {
      const { createMasterSafeFn } = setupMocks({
        data: makeCreationAndTransferDetails({ isSafeCreated: true }),
      });

      renderTestHook(true);
      expect(createMasterSafeFn).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // isSafeCreated derivation
  // -------------------------------------------------------------------------

  describe('isSafeCreated derivation', () => {
    it('is false when wallet is not fetched', () => {
      setupMocks({
        isMasterWalletFetched: false,
        data: makeCreationAndTransferDetails({ isSafeCreated: true }),
      });

      // When isMasterWalletFetched is false, isSafeCreated is false,
      // so the creation step should show 'wait' (default) not 'finish'
      const { result } = renderTestHook(true);
      expect(result.current.steps[0].status).toBe('wait');
    });

    it('is true when hasMasterSafe is true (wallet fetched)', () => {
      const getMasterSafeOfFn = jest
        .fn()
        .mockReturnValue({ address: DEFAULT_SAFE_ADDRESS });
      setupMocks({
        getMasterSafeOf: getMasterSafeOfFn,
        isMasterWalletFetched: true,
      });

      // When hasMasterSafe = true, shouldCreateMasterSafe = false → empty steps
      const { result } = renderTestHook(true);
      expect(result.current.steps).toEqual([]);
    });

    it('is true when creationAndTransferDetails.safeCreationDetails.isSafeCreated is true', () => {
      setupMocks({
        isMasterWalletFetched: true,
        data: makeCreationAndTransferDetails({ isSafeCreated: true }),
      });

      const { result } = renderTestHook(true);
      expect(result.current.steps[0].status).toBe('finish');
    });
  });

  // -------------------------------------------------------------------------
  // Title consistency
  // -------------------------------------------------------------------------

  describe('step titles', () => {
    it('creation step has title "Create Pearl Wallet"', () => {
      setupMocks();

      const { result } = renderTestHook(true);
      expect(result.current.steps[0].title).toBe('Create Pearl Wallet');
    });

    it('transfer step has title "Transfer funds to the Pearl Wallet"', () => {
      setupMocks();

      const { result } = renderTestHook(true);
      expect(result.current.steps[1].title).toBe(
        'Transfer funds to the Pearl Wallet',
      );
    });
  });

  // -------------------------------------------------------------------------
  // Multiple transfer sub-steps
  // -------------------------------------------------------------------------

  describe('multiple transfer sub-steps', () => {
    it('maps each transfer to a sub-step with correct description', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          isTransferComplete: true,
          transfers: [
            makeTransferStatus(TokenSymbolMap.OLAS, 'finish'),
            makeTransferStatus(TokenSymbolMap.XDAI, 'finish'),
          ],
        }),
      });

      const { result } = renderTestHook(true);
      const subSteps = result.current.steps[1].subSteps;
      expect(subSteps).toHaveLength(2);
      expect(subSteps[0].description).toBe(
        `Transfer ${TokenSymbolMap.OLAS} complete.`,
      );
      expect(subSteps[1].description).toBe(
        `Transfer ${TokenSymbolMap.XDAI} complete.`,
      );
    });

    it('handles mixed transfer statuses', () => {
      setupMocks({
        data: makeCreationAndTransferDetails({
          isSafeCreated: true,
          transfers: [
            makeTransferStatus(TokenSymbolMap.OLAS, 'finish'),
            makeTransferStatus(TokenSymbolMap.XDAI, 'process'),
          ],
        }),
      });

      const { result } = renderTestHook(true);
      const subSteps = result.current.steps[1].subSteps;
      expect(subSteps[0].description).toBe(
        `Transfer ${TokenSymbolMap.OLAS} complete.`,
      );
      expect(subSteps[1].description).toBe('Sending transaction...');
    });
  });
});
