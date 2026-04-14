import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { useMnemonicExists } from '../../hooks/useMnemonicExists';

describe('useMnemonicExists', () => {
  it('returns undefined for mnemonicExists on initial render', () => {
    const { result } = renderHook(() => useMnemonicExists());
    expect(result.current.mnemonicExists).toBeUndefined();
  });

  it('updates mnemonicExists to true when setMnemonicExists(true) is called', () => {
    const { result } = renderHook(() => useMnemonicExists());

    act(() => {
      result.current.setMnemonicExists(true);
    });

    expect(result.current.mnemonicExists).toBe(true);
  });

  it('updates mnemonicExists to false when setMnemonicExists(false) is called', () => {
    const { result } = renderHook(() => useMnemonicExists());

    act(() => {
      result.current.setMnemonicExists(false);
    });

    expect(result.current.mnemonicExists).toBe(false);
  });

  it('transitions from true to false when setMnemonicExists is called again', () => {
    const { result } = renderHook(() => useMnemonicExists());

    act(() => {
      result.current.setMnemonicExists(true);
    });
    expect(result.current.mnemonicExists).toBe(true);

    act(() => {
      result.current.setMnemonicExists(false);
    });
    expect(result.current.mnemonicExists).toBe(false);
  });

  it('is not backed by any store — value resets on re-mount', () => {
    const { result: result1 } = renderHook(() => useMnemonicExists());
    act(() => {
      result1.current.setMnemonicExists(true);
    });
    expect(result1.current.mnemonicExists).toBe(true);

    // Fresh mount simulates app restart: state is not persisted
    const { result: result2 } = renderHook(() => useMnemonicExists());
    expect(result2.current.mnemonicExists).toBeUndefined();
  });
});
