import { act, renderHook } from '@testing-library/react';

import { useInsufficientGasModal } from '../../../components/ui/useInsufficientGasModal';
import { makeInsufficientGasError } from '../../helpers/factories';

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
});
