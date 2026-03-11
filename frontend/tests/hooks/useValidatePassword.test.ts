import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { act, createElement, PropsWithChildren } from 'react';

import { useValidatePassword } from '../../hooks/useValidatePassword';
import { AccountService } from '../../service/Account';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

jest.mock('../../service/Account', () => ({
  AccountService: {
    loginAccount: jest.fn(),
  },
}));

const mockLoginAccount = AccountService.loginAccount as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useValidatePassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when loginAccount succeeds', async () => {
    mockLoginAccount.mockResolvedValue({ message: 'Login successful' });

    const { result } = renderHook(() => useValidatePassword(), {
      wrapper: createWrapper(),
    });

    let validationResult: boolean | undefined;
    await act(async () => {
      validationResult = await result.current.validatePassword('correctpass');
    });
    expect(validationResult).toBe(true);
    expect(mockLoginAccount).toHaveBeenCalledWith('correctpass');
  });

  it('returns false when loginAccount throws', async () => {
    mockLoginAccount.mockRejectedValue(new Error('Invalid password'));
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { result } = renderHook(() => useValidatePassword(), {
      wrapper: createWrapper(),
    });

    let validationResult: boolean | undefined;
    await act(async () => {
      validationResult = await result.current.validatePassword('wrongpass');
    });

    expect(validationResult).toBe(false);
    expect(mockLoginAccount).toHaveBeenCalledWith('wrongpass');
    consoleErrorSpy.mockRestore();
  });

  it('returns false for non-Error rejections', async () => {
    mockLoginAccount.mockRejectedValue('string error');
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { result } = renderHook(() => useValidatePassword(), {
      wrapper: createWrapper(),
    });

    let validationResult: boolean | undefined;
    await act(async () => {
      validationResult = await result.current.validatePassword('pass');
    });

    expect(validationResult).toBe(false);
    consoleErrorSpy.mockRestore();
  });

  it('calls loginAccount with the exact password provided', async () => {
    mockLoginAccount.mockResolvedValue({ message: 'ok' });

    const { result } = renderHook(() => useValidatePassword(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.validatePassword('p@$$w0rd!Special');
    });

    expect(mockLoginAccount).toHaveBeenCalledWith('p@$$w0rd!Special');
  });
});
