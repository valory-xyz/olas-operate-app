import { renderHook } from '@testing-library/react';
import { act, createElement, PropsWithChildren } from 'react';

import { SharedContext } from '../../context/SharedProvider/SharedProvider';
import { useMnemonicExists } from '../../hooks/useMnemonicExists';

// Minimal SharedContext wrapper that provides real useState-backed mnemonicExists
// so multiple hook instances share the same value through the same context provider.
const makeWrapper = () => {
  const Wrapper = ({ children }: PropsWithChildren) => {
    // Use the default context values from SharedContext for baseline;
    // callers can override by wrapping with a custom Provider value.
    return createElement(
      SharedContext.Provider,
      {
        value: {
          isAgentsFunFieldUpdateRequired: false,
          mnemonicExists: undefined,
          setMnemonicExists: () => {},
        },
      },
      children,
    );
  };
  return Wrapper;
};

describe('useMnemonicExists', () => {
  it('returns undefined for mnemonicExists when context provides undefined', () => {
    const { result } = renderHook(() => useMnemonicExists(), {
      wrapper: makeWrapper(),
    });
    expect(result.current.mnemonicExists).toBeUndefined();
  });

  it('reflects mnemonicExists value provided by SharedContext', () => {
    const { result } = renderHook(() => useMnemonicExists(), {
      wrapper: ({ children }: PropsWithChildren) =>
        createElement(
          SharedContext.Provider,
          {
            value: {
              isAgentsFunFieldUpdateRequired: false,
              mnemonicExists: true,
              setMnemonicExists: () => {},
            },
          },
          children,
        ),
    });

    expect(result.current.mnemonicExists).toBe(true);
  });

  it('calls setMnemonicExists from context when invoked', () => {
    const mockSetMnemonicExists = jest.fn();
    const { result } = renderHook(() => useMnemonicExists(), {
      wrapper: ({ children }: PropsWithChildren) =>
        createElement(
          SharedContext.Provider,
          {
            value: {
              isAgentsFunFieldUpdateRequired: false,
              mnemonicExists: undefined,
              setMnemonicExists: mockSetMnemonicExists,
            },
          },
          children,
        ),
    });

    act(() => {
      result.current.setMnemonicExists(true);
    });

    expect(mockSetMnemonicExists).toHaveBeenCalledWith(true);
  });

  it('is not backed by any store — value resets on re-mount with fresh provider', () => {
    // First mount: context provides true
    const { result: result1 } = renderHook(() => useMnemonicExists(), {
      wrapper: ({ children }: PropsWithChildren) =>
        createElement(
          SharedContext.Provider,
          {
            value: {
              isAgentsFunFieldUpdateRequired: false,
              mnemonicExists: true,
              setMnemonicExists: () => {},
            },
          },
          children,
        ),
    });
    expect(result1.current.mnemonicExists).toBe(true);

    // Fresh mount simulates app restart: new provider starts with undefined
    const { result: result2 } = renderHook(() => useMnemonicExists(), {
      wrapper: makeWrapper(),
    });
    expect(result2.current.mnemonicExists).toBeUndefined();
  });
});
