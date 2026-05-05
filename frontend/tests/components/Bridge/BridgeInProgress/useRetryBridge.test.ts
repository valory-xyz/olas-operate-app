import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { useBalanceAndRefillRequirementsContext } from '../../../../hooks/useBalanceAndRefillRequirementsContext';

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

jest.mock('../../../../hooks/useBalanceAndRefillRequirementsContext', () => ({
  useBalanceAndRefillRequirementsContext: jest.fn(),
}));

const mockMessage = { open: jest.fn() };
jest.mock('antd', () => ({
  message: mockMessage,
}));

// ---------------------------------------------------------------------------
// Typed mock accessors
// ---------------------------------------------------------------------------

const mockUseBalanceAndRefillRequirementsContext =
  useBalanceAndRefillRequirementsContext as jest.MockedFunction<
    typeof useBalanceAndRefillRequirementsContext
  >;

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  useRetryBridge,
} = require('../../../../components/Bridge/BridgeInProgress/useRetryBridge');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useRetryBridge', () => {
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
      refetchForSelectedAgent: mockRefetch,
    } as unknown as ReturnType<typeof useBalanceAndRefillRequirementsContext>);
  });

  it('returns a callback function', () => {
    const { result } = renderHook(() => useRetryBridge());
    expect(typeof result.current).toBe('function');
  });

  it('calls onRetryOutcome with NEED_REFILL when refill is required', async () => {
    mockRefetch.mockResolvedValue({
      data: { is_refill_required: true },
    });

    const { result } = renderHook(() => useRetryBridge());
    const onRetryOutcome = jest.fn();

    await act(async () => {
      await result.current(onRetryOutcome);
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(onRetryOutcome).toHaveBeenCalledWith('NEED_REFILL');
    expect(mockMessage.open).not.toHaveBeenCalled();
  });

  it('shows toast message when refill is not required', async () => {
    mockRefetch.mockResolvedValue({
      data: { is_refill_required: false },
    });

    const { result } = renderHook(() => useRetryBridge());
    const onRetryOutcome = jest.fn();

    await act(async () => {
      await result.current(onRetryOutcome);
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(onRetryOutcome).not.toHaveBeenCalled();
    expect(mockMessage.open).toHaveBeenCalledWith({
      icon: null,
      content:
        "Bridging complete! Please restart the app if you're not redirected automatically.",
    });
  });

  it('returns early when refetch returns no data', async () => {
    mockRefetch.mockResolvedValue({ data: undefined });

    const { result } = renderHook(() => useRetryBridge());
    const onRetryOutcome = jest.fn();

    await act(async () => {
      await result.current(onRetryOutcome);
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(onRetryOutcome).not.toHaveBeenCalled();
    expect(mockMessage.open).not.toHaveBeenCalled();
  });

  it('returns early when refetch returns null data', async () => {
    mockRefetch.mockResolvedValue({ data: null });

    const { result } = renderHook(() => useRetryBridge());
    const onRetryOutcome = jest.fn();

    await act(async () => {
      await result.current(onRetryOutcome);
    });

    expect(onRetryOutcome).not.toHaveBeenCalled();
    expect(mockMessage.open).not.toHaveBeenCalled();
  });
});
