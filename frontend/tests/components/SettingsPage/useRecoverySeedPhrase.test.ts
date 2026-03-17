import { renderHook } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../constants/providers', () => ({}));
jest.mock('../../../config/providers', () => ({ providers: [] }));

const mockGetRecoverySeedPhrase = jest.fn();
jest.mock('../../../service/Wallet', () => ({
  WalletService: {
    getRecoverySeedPhrase: (...args: unknown[]) =>
      mockGetRecoverySeedPhrase(...args),
  },
}));

const mockGetErrorMessage = jest.fn();
jest.mock('../../../utils', () => ({
  getErrorMessage: (...args: unknown[]) => mockGetErrorMessage(...args),
}));

// Capture useMutation config
type MutationConfig = {
  mutationFn: (password: string) => Promise<unknown>;
};

let capturedMutationConfig: MutationConfig | null = null;
let mockMutationState = {
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null as Error | null,
};
const mockMutateAsync = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useMutation: (config: MutationConfig) => {
    capturedMutationConfig = config;
    return {
      ...mockMutationState,
      mutateAsync: mockMutateAsync,
    };
  },
}));

// ---------------------------------------------------------------------------
// Import hook after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
const {
  useRecoverySeedPhrase,
} = require('../../../components/SettingsPage/useRecoverySeedPhrase');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useRecoverySeedPhrase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedMutationConfig = null;
    mockMutationState = {
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    };
    mockMutateAsync.mockReset();
    mockGetErrorMessage.mockReset();
  });

  // -------------------------------------------------------------------------
  // useMutation configuration
  // -------------------------------------------------------------------------

  describe('useMutation configuration', () => {
    it('passes mutationFn that calls WalletService.getRecoverySeedPhrase', async () => {
      const mockResponse = { mnemonic: ['word1', 'word2'] };
      mockGetRecoverySeedPhrase.mockResolvedValue(mockResponse);

      renderHook(() => useRecoverySeedPhrase());

      const result = await capturedMutationConfig!.mutationFn('test-password');

      expect(mockGetRecoverySeedPhrase).toHaveBeenCalledTimes(1);
      expect(mockGetRecoverySeedPhrase).toHaveBeenCalledWith('test-password');
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors from WalletService.getRecoverySeedPhrase', async () => {
      const error = new Error('Failed to login');
      mockGetRecoverySeedPhrase.mockRejectedValue(error);

      renderHook(() => useRecoverySeedPhrase());

      await expect(
        capturedMutationConfig!.mutationFn('bad-password'),
      ).rejects.toThrow('Failed to login');
    });
  });

  // -------------------------------------------------------------------------
  // Return shape — initial state
  // -------------------------------------------------------------------------

  describe('initial return shape', () => {
    it('returns isLoading as false when not pending', () => {
      const { result } = renderHook(() => useRecoverySeedPhrase());
      expect(result.current.isLoading).toBe(false);
    });

    it('returns isLoading as true when pending', () => {
      mockMutationState = {
        ...mockMutationState,
        isPending: true,
      };
      const { result } = renderHook(() => useRecoverySeedPhrase());
      expect(result.current.isLoading).toBe(true);
    });

    it('returns isSuccess from mutation state', () => {
      mockMutationState = { ...mockMutationState, isSuccess: true };
      const { result } = renderHook(() => useRecoverySeedPhrase());
      expect(result.current.isSuccess).toBe(true);
    });

    it('returns isError from mutation state', () => {
      mockMutationState = {
        ...mockMutationState,
        isError: true,
        error: new Error('test'),
      };
      const { result } = renderHook(() => useRecoverySeedPhrase());
      expect(result.current.isError).toBe(true);
    });

    it('exposes getRecoverySeedPhrase as a function', () => {
      const { result } = renderHook(() => useRecoverySeedPhrase());
      expect(typeof result.current.getRecoverySeedPhrase).toBe('function');
    });
  });

  // -------------------------------------------------------------------------
  // getRecoverySeedPhrase wrapper
  // -------------------------------------------------------------------------

  describe('getRecoverySeedPhrase', () => {
    it('delegates to mutateAsync with the password', async () => {
      const mockMnemonic = { mnemonic: ['alpha', 'bravo'] };
      mockMutateAsync.mockResolvedValue(mockMnemonic);

      const { result } = renderHook(() => useRecoverySeedPhrase());
      const response = await result.current.getRecoverySeedPhrase('my-pass');

      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockMutateAsync).toHaveBeenCalledWith('my-pass');
      expect(response).toEqual(mockMnemonic);
    });
  });

  // -------------------------------------------------------------------------
  // errorMessage
  // -------------------------------------------------------------------------

  describe('errorMessage', () => {
    it('returns null when isError is false', () => {
      mockMutationState = { ...mockMutationState, isError: false };
      const { result } = renderHook(() => useRecoverySeedPhrase());
      expect(result.current.errorMessage).toBeNull();
    });

    it('calls getErrorMessage with error and default message when isError is true', () => {
      const error = new Error('Wrong password');
      mockMutationState = { ...mockMutationState, isError: true, error };
      mockGetErrorMessage.mockReturnValue('Wrong password');

      const { result } = renderHook(() => useRecoverySeedPhrase());

      expect(mockGetErrorMessage).toHaveBeenCalledTimes(1);
      expect(mockGetErrorMessage).toHaveBeenCalledWith(
        error,
        'Failed to retrieve recovery phrase. Please try again later.',
      );
      expect(result.current.errorMessage).toBe('Wrong password');
    });

    it('returns the fallback message via getErrorMessage for non-Error objects', () => {
      const error = 'string error';
      mockMutationState = {
        ...mockMutationState,
        isError: true,
        error: error as unknown as Error,
      };
      mockGetErrorMessage.mockReturnValue(
        'Failed to retrieve recovery phrase. Please try again later.',
      );

      const { result } = renderHook(() => useRecoverySeedPhrase());

      expect(mockGetErrorMessage).toHaveBeenCalledWith(
        error,
        'Failed to retrieve recovery phrase. Please try again later.',
      );
      expect(result.current.errorMessage).toBe(
        'Failed to retrieve recovery phrase. Please try again later.',
      );
    });
  });
});
