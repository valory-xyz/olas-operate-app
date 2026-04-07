import { fireEvent, render, screen } from '@testing-library/react';

import { FundRecovery } from '../../../../components/SetupPage/FundRecovery';
import { SETUP_SCREEN } from '../../../../constants';
import {
  FundRecoveryExecuteResponse,
  FundRecoveryScanResponse,
} from '../../../../types/FundRecovery';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

const mockGoto = jest.fn();
jest.mock('../../../../hooks', () => ({
  useSetup: () => ({ goto: mockGoto }),
  useFundRecoveryScan: jest.fn(),
  useFundRecoveryExecute: jest.fn(),
}));

// Import mocked hooks for control
import { useFundRecoveryExecute, useFundRecoveryScan } from '../../../../hooks';

const mockUseFundRecoveryScan = useFundRecoveryScan as jest.Mock;
const mockUseFundRecoveryExecute = useFundRecoveryExecute as jest.Mock;

jest.mock('../../../../components/ui', () => ({
  Alert: ({
    message,
    type,
  }: {
    message?: string;
    type?: string;
  }) => (
    <div data-testid="alert" data-type={type}>
      {message && <span>{message}</span>}
    </div>
  ),
}));

jest.mock(
  '../../../../components/SetupPage/FundRecovery/FundRecoverySeedPhrase',
  () => ({
    FundRecoverySeedPhrase: ({
      onScan,
      onWordsChange,
      scanError,
    }: {
      onScan: () => void;
      onWordsChange: (words: string[]) => void;
      scanError?: boolean;
    }) => (
      <div data-testid="seed-phrase">
        {scanError && <span data-testid="scan-error">scan error</span>}
        <button
          data-testid="scan-btn"
          onClick={onScan}
        >
          Scan
        </button>
        <button
          data-testid="change-words-btn"
          onClick={() =>
            onWordsChange(Array.from({ length: 12 }, () => 'word'))
          }
        >
          Fill words
        </button>
      </div>
    ),
  }),
);

jest.mock(
  '../../../../components/SetupPage/FundRecovery/FundRecoveryScanResults',
  () => ({
    FundRecoveryScanResults: ({
      onRecover,
    }: {
      onRecover: () => void;
    }) => (
      <div data-testid="scan-results">
        <button data-testid="recover-btn" onClick={onRecover}>
          Recover
        </button>
      </div>
    ),
  }),
);

jest.mock(
  '../../../../components/SetupPage/FundRecovery/FundRecoveryResultModal',
  () => ({
    FundRecoveryResultModal: ({
      open,
      onTryAgain,
    }: {
      open: boolean;
      onTryAgain: () => void;
    }) =>
      open ? (
        <div data-testid="result-modal">
          <button data-testid="try-again-btn" onClick={onTryAgain}>
            Try Again
          </button>
        </div>
      ) : null,
  }),
);

jest.mock('../../../../components/ui/BackButton', () => ({
  BackButton: ({ onPrev }: { onPrev: () => void }) => (
    <button data-testid="back-btn" onClick={onPrev}>
      Back
    </button>
  ),
}));

const SAMPLE_SCAN_RESPONSE: FundRecoveryScanResponse = {
  master_eoa_address: '0x1234567890AbcdEF1234567890aBcdef12345678',
  balances: {},
  services: [],
  gas_warning: {},
};

const SAMPLE_EXECUTE_RESPONSE: FundRecoveryExecuteResponse = {
  success: true,
  partial_failure: false,
  total_funds_moved: {},
  errors: [],
};

const createDefaultHookMocks = () => {
  const mockMutateScan = jest.fn();
  const mockMutateExecute = jest.fn();
  const mockResetScan = jest.fn();
  const mockResetExecute = jest.fn();

  mockUseFundRecoveryScan.mockReturnValue({
    mutate: mockMutateScan,
    isPending: false,
    reset: mockResetScan,
  });

  mockUseFundRecoveryExecute.mockReturnValue({
    mutate: mockMutateExecute,
    isPending: false,
    data: undefined,
    error: null,
    reset: mockResetExecute,
  });

  return {
    mockMutateScan,
    mockMutateExecute,
    mockResetScan,
    mockResetExecute,
  };
};

describe('FundRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createDefaultHookMocks();
  });

  describe('initial rendering (seedPhrase step)', () => {
    it('renders the seed phrase component on initial load', () => {
      render(<FundRecovery />);
      expect(screen.getByTestId('seed-phrase')).toBeInTheDocument();
      expect(screen.queryByTestId('scan-results')).not.toBeInTheDocument();
    });

    it('renders the back button', () => {
      render(<FundRecovery />);
      expect(screen.getByTestId('back-btn')).toBeInTheDocument();
    });
  });

  describe('back navigation', () => {
    it('navigates to MigrateOperateFolder when Back is clicked from seed phrase step', () => {
      render(<FundRecovery />);
      fireEvent.click(screen.getByTestId('back-btn'));
      expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.MigrateOperateFolder);
    });
  });

  describe('scan flow', () => {
    it('calls runScan mutation when scan is triggered', () => {
      const { mockMutateScan } = createDefaultHookMocks();
      render(<FundRecovery />);

      fireEvent.click(screen.getByTestId('scan-btn'));
      expect(mockMutateScan).toHaveBeenCalledTimes(1);
    });

    it('transitions to chain balances step after successful scan', () => {
      const { mockMutateScan } = createDefaultHookMocks();
      render(<FundRecovery />);

      // Simulate successful scan via onSuccess callback
      mockMutateScan.mockImplementation((_req: unknown, callbacks: { onSuccess: (data: FundRecoveryScanResponse) => void }) => {
        callbacks.onSuccess(SAMPLE_SCAN_RESPONSE);
      });

      fireEvent.click(screen.getByTestId('scan-btn'));

      expect(screen.getByTestId('scan-results')).toBeInTheDocument();
      expect(screen.queryByTestId('seed-phrase')).not.toBeInTheDocument();
    });

    it('shows scan error when scan fails', () => {
      const { mockMutateScan } = createDefaultHookMocks();
      render(<FundRecovery />);

      mockMutateScan.mockImplementation((_req: unknown, callbacks: { onError: () => void }) => {
        callbacks.onError();
      });

      fireEvent.click(screen.getByTestId('scan-btn'));

      expect(screen.getByTestId('scan-error')).toBeInTheDocument();
    });
  });

  describe('execute flow', () => {
    let mockMutateScanForExecute: jest.Mock;
    let mockMutateExecuteForExecute: jest.Mock;

    beforeEach(() => {
      const mocks = createDefaultHookMocks();
      mockMutateScanForExecute = mocks.mockMutateScan;
      mockMutateExecuteForExecute = mocks.mockMutateExecute;
      mockMutateScanForExecute.mockImplementation((_req: unknown, callbacks: { onSuccess: (data: FundRecoveryScanResponse) => void }) => {
        callbacks.onSuccess(SAMPLE_SCAN_RESPONSE);
      });
    });

    it('opens the result modal when recover is triggered', () => {
      render(<FundRecovery />);
      fireEvent.click(screen.getByTestId('scan-btn'));
      fireEvent.click(screen.getByTestId('recover-btn'));

      expect(screen.getByTestId('result-modal')).toBeInTheDocument();
    });

    it('calls runExecute mutation when recover is triggered', () => {
      render(<FundRecovery />);
      fireEvent.click(screen.getByTestId('scan-btn'));
      fireEvent.click(screen.getByTestId('recover-btn'));

      expect(mockMutateExecuteForExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('step navigation', () => {
    it('returns to seed phrase step when back is clicked from scan results', () => {
      const { mockMutateScan } = createDefaultHookMocks();
      mockMutateScan.mockImplementation((_req: unknown, callbacks: { onSuccess: (data: FundRecoveryScanResponse) => void }) => {
        callbacks.onSuccess(SAMPLE_SCAN_RESPONSE);
      });

      render(<FundRecovery />);
      fireEvent.click(screen.getByTestId('scan-btn'));

      expect(screen.getByTestId('scan-results')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('back-btn'));
      expect(screen.getByTestId('seed-phrase')).toBeInTheDocument();
      expect(screen.queryByTestId('scan-results')).not.toBeInTheDocument();
    });
  });
});
