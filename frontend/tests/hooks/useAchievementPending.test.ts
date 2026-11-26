import { act, renderHook, waitFor } from '@testing-library/react';

import { useAchievementPending } from '../../hooks/useAchievementPending';
import { createQueryClientWrapper } from '../helpers/queryClient';

describe('useAchievementPending', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useAchievementPending(), {
      wrapper: createQueryClientWrapper(),
    });

    expect(result.current.isAchievementPending).toBe(false);
  });

  it("shares the writer's value with every other reader", async () => {
    const wrapper = createQueryClientWrapper();
    const { result } = renderHook(
      () => ({
        writer: useAchievementPending(),
        reader: useAchievementPending(),
      }),
      { wrapper },
    );

    act(() => result.current.writer.setAchievementPending(true));
    await waitFor(() =>
      expect(result.current.reader.isAchievementPending).toBe(true),
    );

    act(() => result.current.writer.setAchievementPending(false));
    await waitFor(() =>
      expect(result.current.reader.isAchievementPending).toBe(false),
    );
  });
});
