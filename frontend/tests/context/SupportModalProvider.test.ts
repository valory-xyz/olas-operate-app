import { renderHook, act } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

jest.mock('../../components/SupportModal/SupportModal', () => ({
  SupportModal: () => null,
}));

import {
  SupportModalProvider,
  useSupportModal,
} from '../../context/SupportModalProvider';

const wrapper = ({ children }: PropsWithChildren) =>
  React.createElement(SupportModalProvider, null, children);

describe('SupportModalProvider', () => {
  it('starts with modal closed', () => {
    const { result } = renderHook(() => useSupportModal(), { wrapper });
    expect(result.current.supportModalOpen).toBe(false);
  });

  it('opens modal on first toggle', () => {
    const { result } = renderHook(() => useSupportModal(), { wrapper });
    act(() => result.current.toggleSupportModal());
    expect(result.current.supportModalOpen).toBe(true);
  });

  it('closes modal on second toggle', () => {
    const { result } = renderHook(() => useSupportModal(), { wrapper });
    act(() => result.current.toggleSupportModal());
    act(() => result.current.toggleSupportModal());
    expect(result.current.supportModalOpen).toBe(false);
  });
});
