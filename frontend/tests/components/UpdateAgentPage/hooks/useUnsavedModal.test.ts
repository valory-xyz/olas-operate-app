import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { useUnsavedModal } from '../../../../components/UpdateAgentPage/hooks/useUnsavedModal';

describe('useUnsavedModal', () => {
  it('starts with open=false', () => {
    const { result } = renderHook(() =>
      useUnsavedModal({ confirmCallback: jest.fn() }),
    );
    expect(result.current.open).toBe(false);
  });

  it('confirm calls confirmCallback and closes modal', async () => {
    const confirmCallback = jest.fn();
    const { result } = renderHook(() => useUnsavedModal({ confirmCallback }));

    act(() => {
      result.current.openModal();
    });
    expect(result.current.open).toBe(true);

    await act(async () => {
      await result.current.confirm();
    });

    expect(confirmCallback).toHaveBeenCalledTimes(1);
    expect(result.current.open).toBe(false);
  });

  it('cancel closes modal without calling confirmCallback', async () => {
    const confirmCallback = jest.fn();
    const { result } = renderHook(() => useUnsavedModal({ confirmCallback }));

    act(() => {
      result.current.openModal();
    });

    await act(async () => {
      await result.current.cancel();
    });

    expect(confirmCallback).not.toHaveBeenCalled();
    expect(result.current.open).toBe(false);
  });
});
