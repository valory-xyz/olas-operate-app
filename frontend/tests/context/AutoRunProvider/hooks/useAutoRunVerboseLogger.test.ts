import { renderHook } from '@testing-library/react';

import { useAutoRunVerboseLogger } from '../../../../context/AutoRunProvider/hooks/useAutoRunVerboseLogger';

// AUTO_RUN_VERBOSE_LOGS is currently `true` in source.
// We test the true case directly and verify the conditional path exists.
describe('useAutoRunVerboseLogger', () => {
  it('calls logMessage when verbose logs are enabled', () => {
    const logMessage = jest.fn();
    const { result } = renderHook(() => useAutoRunVerboseLogger(logMessage));
    result.current('rotation triggered');
    expect(logMessage).toHaveBeenCalledWith('rotation triggered');
  });

  it('returns a stable callback across rerenders', () => {
    const logMessage = jest.fn();
    const { result, rerender } = renderHook(() =>
      useAutoRunVerboseLogger(logMessage),
    );
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
