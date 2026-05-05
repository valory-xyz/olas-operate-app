import { renderHook } from '@testing-library/react';
import { act } from 'react';

import {
  defaultModalProps,
  useModal,
} from '../../../../components/UpdateAgentPage/hooks/useModal';

describe('defaultModalProps', () => {
  it('has open=false and noop functions', () => {
    expect(defaultModalProps.open).toBe(false);
    expect(defaultModalProps.openModal).toBeInstanceOf(Function);
    expect(defaultModalProps.closeModal).toBeInstanceOf(Function);
    expect(defaultModalProps.cancel).toBeInstanceOf(Function);
    expect(defaultModalProps.confirm).toBeInstanceOf(Function);
    // noop functions should not throw
    defaultModalProps.openModal();
    defaultModalProps.closeModal();
    defaultModalProps.cancel();
    defaultModalProps.confirm();
  });
});

describe('useModal', () => {
  it('starts with open=false', () => {
    const { result } = renderHook(() => useModal());
    expect(result.current.open).toBe(false);
  });

  it('openModal sets open to true', () => {
    const { result } = renderHook(() => useModal());
    act(() => {
      result.current.openModal();
    });
    expect(result.current.open).toBe(true);
  });

  it('closeModal sets open to false', () => {
    const { result } = renderHook(() => useModal());
    act(() => {
      result.current.openModal();
    });
    expect(result.current.open).toBe(true);

    act(() => {
      result.current.closeModal();
    });
    expect(result.current.open).toBe(false);
  });

  it('cancel closes the modal', async () => {
    const { result } = renderHook(() => useModal());
    act(() => {
      result.current.openModal();
    });

    await act(async () => {
      await result.current.cancel();
    });
    expect(result.current.open).toBe(false);
  });

  it('confirm closes the modal', async () => {
    const { result } = renderHook(() => useModal());
    act(() => {
      result.current.openModal();
    });

    await act(async () => {
      await result.current.confirm();
    });
    expect(result.current.open).toBe(false);
  });
});
