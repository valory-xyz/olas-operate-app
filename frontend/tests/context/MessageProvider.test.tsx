import { renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { MessageProvider, useMessageApi } from '../../context/MessageProvider';

// Mock antd's message.useMessage
const mockMessageApi = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  loading: jest.fn(),
  open: jest.fn(),
  destroy: jest.fn(),
};

jest.mock('antd', () => ({
  message: {
    useMessage: jest.fn(() => [mockMessageApi, null]),
  },
}));

describe('MessageProvider', () => {
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(MessageProvider, null, children);

  it('provides the message API when used inside MessageProvider', () => {
    const { result } = renderHook(() => useMessageApi(), { wrapper });
    expect(result.current).toBe(mockMessageApi);
  });

  it('useMessageApi throws when used outside MessageProvider', () => {
    // Suppress console.error from React for the expected error
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => {
      renderHook(() => useMessageApi());
    }).toThrow('useMessageApi must be used within a MessageProvider');
    consoleSpy.mockRestore();
  });

  it('renders children within the provider', () => {
    const { result } = renderHook(() => useMessageApi(), { wrapper });

    // Verify the API has the expected methods
    expect(result.current.success).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.info).toBeDefined();
    expect(result.current.warning).toBeDefined();
  });
});
