import { act, renderHook } from '@testing-library/react';

import { useInsufficientGasModal } from '../../hooks/useInsufficientGasModal';
import { makeInsufficientGasError } from '../helpers/factories';

describe('useInsufficientGasModal', () => {
  it('returns null when isError is false', () => {
    const { result } = renderHook(() =>
      useInsufficientGasModal({
        isError: false,
        error: makeInsufficientGasError(),
        caseType: 'agent-withdraw',
        onFund: jest.fn(),
        onClose: jest.fn(),
      }),
    );
    expect(result.current).toBeNull();
  });

  it('returns null when error is not an INSUFFICIENT_SIGNER_GAS body', () => {
    const { result } = renderHook(() =>
      useInsufficientGasModal({
        isError: true,
        error: new Error('Network timeout'),
        caseType: 'agent-withdraw',
        onFund: jest.fn(),
        onClose: jest.fn(),
      }),
    );
    expect(result.current).toBeNull();
  });

  it('returns modal props when the error is INSUFFICIENT_SIGNER_GAS', () => {
    const errorBody = makeInsufficientGasError({ chain: 'optimism' });
    const { result } = renderHook(() =>
      useInsufficientGasModal({
        isError: true,
        error: errorBody,
        caseType: 'pearl-withdraw',
        onFund: jest.fn(),
        onClose: jest.fn(),
      }),
    );
    expect(result.current).toMatchObject({
      caseType: 'pearl-withdraw',
      chain: 'optimism',
      prefillAmountWei: errorBody.prefill_amount_wei,
    });
  });

  it('calls onClose then onFund with the narrowed error body when Fund is invoked', () => {
    const errorBody = makeInsufficientGasError();
    const onFund = jest.fn();
    const onClose = jest.fn();
    const { result } = renderHook(() =>
      useInsufficientGasModal({
        isError: true,
        error: errorBody,
        caseType: 'fund-agent',
        onFund,
        onClose,
      }),
    );

    act(() => {
      result.current?.onFund();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onFund).toHaveBeenCalledTimes(1);
    expect(onFund).toHaveBeenCalledWith(errorBody);
    // Order check: onClose fires before onFund so the host modal is dismissed
    // before any navigation or state change runs.
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(
      onFund.mock.invocationCallOrder[0],
    );
  });

  it('exposes onClose directly for the modal dismiss button', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() =>
      useInsufficientGasModal({
        isError: true,
        error: makeInsufficientGasError(),
        caseType: 'agent-withdraw',
        onFund: jest.fn(),
        onClose,
      }),
    );

    act(() => {
      result.current?.onClose();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('flips to null when mutation retries (isError resets to false)', () => {
    const initialProps: { isError: boolean; error: unknown } = {
      isError: true,
      error: makeInsufficientGasError(),
    };
    const { result, rerender } = renderHook(
      ({ isError, error }: { isError: boolean; error: unknown }) =>
        useInsufficientGasModal({
          isError,
          error,
          caseType: 'agent-withdraw',
          onFund: jest.fn(),
          onClose: jest.fn(),
        }),
      { initialProps },
    );
    expect(result.current).not.toBeNull();

    // Simulate mutation retry: state machine resets to pending
    rerender({ isError: false, error: undefined });
    expect(result.current).toBeNull();
  });

  it('returns null when error_code is a typo (e.g. lowercase)', () => {
    const { result } = renderHook(() =>
      useInsufficientGasModal({
        isError: true,
        error: { error_code: 'insufficient_signer_gas', chain: 'gnosis' },
        caseType: 'agent-withdraw',
        onFund: jest.fn(),
        onClose: jest.fn(),
      }),
    );
    expect(result.current).toBeNull();
  });

  it('returns null for an empty-object rejection (malformed backend body)', () => {
    const { result } = renderHook(() =>
      useInsufficientGasModal({
        isError: true,
        error: {},
        caseType: 'agent-withdraw',
        onFund: jest.fn(),
        onClose: jest.fn(),
      }),
    );
    expect(result.current).toBeNull();
  });

  it('returns null when the backend chain is unknown (host falls back to generic modal)', () => {
    const { result } = renderHook(() =>
      useInsufficientGasModal({
        isError: true,
        error: makeInsufficientGasError({ chain: 'neptune' }),
        caseType: 'agent-withdraw',
        onFund: jest.fn(),
        onClose: jest.fn(),
      }),
    );
    expect(result.current).toBeNull();
  });

  it('returns null when prefill_amount_wei arrives as a JSON number (precision rejected)', () => {
    const { result } = renderHook(() =>
      useInsufficientGasModal({
        isError: true,
        // Backend contract requires string; a number rejection means precision
        // was already lost at JSON.parse time.
        error: {
          ...makeInsufficientGasError(),
          prefill_amount_wei: 750_000_000_000_000_000 as unknown as string,
        },
        caseType: 'agent-withdraw',
        onFund: jest.fn(),
        onClose: jest.fn(),
      }),
    );
    expect(result.current).toBeNull();
  });

  it('calls resetMutation on dismiss so the next attempt starts clean', () => {
    const onClose = jest.fn();
    const resetMutation = jest.fn();
    const { result } = renderHook(() =>
      useInsufficientGasModal({
        isError: true,
        error: makeInsufficientGasError(),
        caseType: 'pearl-withdraw',
        onFund: jest.fn(),
        onClose,
        resetMutation,
      }),
    );

    act(() => {
      result.current?.onClose();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(resetMutation).toHaveBeenCalledTimes(1);
  });

  it('also calls resetMutation when the Fund CTA is clicked', () => {
    const onFund = jest.fn();
    const resetMutation = jest.fn();
    const { result } = renderHook(() =>
      useInsufficientGasModal({
        isError: true,
        error: makeInsufficientGasError(),
        caseType: 'pearl-withdraw',
        onFund,
        onClose: jest.fn(),
        resetMutation,
      }),
    );

    act(() => {
      result.current?.onFund();
    });

    expect(resetMutation).toHaveBeenCalledTimes(1);
    expect(onFund).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when resetMutation is omitted (backwards-compat)', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() =>
      useInsufficientGasModal({
        isError: true,
        error: makeInsufficientGasError(),
        caseType: 'agent-withdraw',
        onFund: jest.fn(),
        onClose,
      }),
    );

    act(() => {
      result.current?.onClose();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
