import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { PAGES, SETUP_SCREEN } from '../../constants';
import { useEnterAccountRecoveryFromMain } from '../../hooks/useEnterAccountRecoveryFromMain';

const mockSetupGoto = jest.fn();
const mockPageGoto = jest.fn();

jest.mock('../../hooks/useSetup', () => ({
  useSetup: () => ({ goto: mockSetupGoto }),
}));

jest.mock('../../hooks/usePageState', () => ({
  usePageState: () => ({ goto: mockPageGoto }),
}));

describe('useEnterAccountRecoveryFromMain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a stable callback function', () => {
    const { result, rerender } = renderHook(() =>
      useEnterAccountRecoveryFromMain(),
    );
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('navigates to AccountRecovery setup screen and Setup page when called', () => {
    const { result } = renderHook(() => useEnterAccountRecoveryFromMain());

    act(() => {
      result.current();
    });

    expect(mockSetupGoto).toHaveBeenCalledWith(SETUP_SCREEN.AccountRecovery);
    expect(mockPageGoto).toHaveBeenCalledWith(PAGES.Setup);
  });
});
