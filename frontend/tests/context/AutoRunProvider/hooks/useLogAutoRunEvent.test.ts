import { renderHook } from '@testing-library/react';

import { AUTO_RUN_LOG_PREFIX } from '../../../../context/AutoRunProvider/constants';
import { useLogAutoRunEvent } from '../../../../context/AutoRunProvider/hooks/useLogAutoRunEvent';
import { useElectronApi } from '../../../../hooks';

jest.mock('../../../../hooks', () => ({
  useElectronApi: jest.fn(),
}));

const mockUseElectronApi = useElectronApi as jest.MockedFunction<
  typeof useElectronApi
>;

describe('useLogAutoRunEvent', () => {
  const mockLogEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseElectronApi.mockReturnValue({
      logEvent: mockLogEvent,
    } as unknown as ReturnType<typeof useElectronApi>);
  });

  it('prepends AUTO_RUN_LOG_PREFIX to messages', () => {
    const { result } = renderHook(() => useLogAutoRunEvent());
    result.current.logMessage('rotation triggered');
    expect(mockLogEvent).toHaveBeenCalledWith(
      `${AUTO_RUN_LOG_PREFIX}: rotation triggered`,
    );
  });

  it('handles undefined logEvent without throwing', () => {
    mockUseElectronApi.mockReturnValue({
      logEvent: undefined,
    } as unknown as ReturnType<typeof useElectronApi>);

    const { result } = renderHook(() => useLogAutoRunEvent());
    expect(() => result.current.logMessage('test')).not.toThrow();
  });
});
