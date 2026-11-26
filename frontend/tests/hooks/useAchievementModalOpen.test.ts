import { act, renderHook, waitFor } from '@testing-library/react';

import { useAchievementModalOpen } from '../../hooks/useAchievementModalOpen';
import { createQueryClientWrapper } from '../helpers/queryClient';

describe('useAchievementModalOpen', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useAchievementModalOpen(), {
      wrapper: createQueryClientWrapper(),
    });

    expect(result.current.isAchievementModalOpen).toBe(false);
  });

  it("shares the writer's value with every other reader", async () => {
    const wrapper = createQueryClientWrapper();
    const { result } = renderHook(
      () => ({
        writer: useAchievementModalOpen(),
        reader: useAchievementModalOpen(),
      }),
      { wrapper },
    );

    act(() => result.current.writer.setAchievementModalOpen(true));
    await waitFor(() =>
      expect(result.current.reader.isAchievementModalOpen).toBe(true),
    );

    act(() => result.current.writer.setAchievementModalOpen(false));
    await waitFor(() =>
      expect(result.current.reader.isAchievementModalOpen).toBe(false),
    );
  });
});
