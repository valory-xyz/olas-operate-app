import { renderHook } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { MessageProvider, useMessageApi } from '../../context/MessageProvider';

describe('useMessageApi', () => {
  it('throws when used outside MessageProvider', () => {
    expect(() => renderHook(() => useMessageApi())).toThrow(
      'useMessageApi must be used within a MessageProvider',
    );
  });

  it('returns message API when used within MessageProvider', () => {
    const wrapper = ({ children }: PropsWithChildren) =>
      React.createElement(MessageProvider, null, children);

    const { result } = renderHook(() => useMessageApi(), { wrapper });
    expect(result.current).toBeDefined();
    expect(typeof result.current.success).toBe('function');
    expect(typeof result.current.error).toBe('function');
    expect(typeof result.current.warning).toBe('function');
    expect(typeof result.current.info).toBe('function');
  });
});
