import { renderHook } from '@testing-library/react';
import { act, createElement, PropsWithChildren } from 'react';

import {
  SupportModalProvider,
  useSupportModal,
} from '../../context/SupportModalProvider';

// Mock the SupportModal component to avoid rendering its full tree
jest.mock('../../components/SupportModal/SupportModal', () => ({
  SupportModal: () => null,
}));

describe('SupportModalProvider', () => {
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(SupportModalProvider, null, children);

  it('initial supportModalOpen is false', () => {
    const { result } = renderHook(() => useSupportModal(), { wrapper });
    expect(result.current.supportModalOpen).toBe(false);
  });

  it('toggleSupportModal toggles from false to true', () => {
    const { result } = renderHook(() => useSupportModal(), { wrapper });

    act(() => {
      result.current.toggleSupportModal();
    });
    expect(result.current.supportModalOpen).toBe(true);
  });

  it('toggleSupportModal toggles back to false', () => {
    const { result } = renderHook(() => useSupportModal(), { wrapper });

    act(() => {
      result.current.toggleSupportModal();
    });
    expect(result.current.supportModalOpen).toBe(true);

    act(() => {
      result.current.toggleSupportModal();
    });
    expect(result.current.supportModalOpen).toBe(false);
  });

  it('returns default context values without provider', () => {
    const { result } = renderHook(() => useSupportModal());
    expect(result.current.supportModalOpen).toBe(false);
    expect(typeof result.current.toggleSupportModal).toBe('function');
  });
});
