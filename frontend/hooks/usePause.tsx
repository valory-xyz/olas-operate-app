import { useCallback, useState } from 'react';

export type UsePause = {
  paused: boolean;
  setPaused: (paused: boolean) => void;
  togglePaused: () => void;
};

export const usePause = (): UsePause => {
  const [paused, set] = useState<boolean>(false);

  const setPaused = useCallback(
    (value: boolean) => {
      set(value);
    },
    [set],
  );

  const togglePaused = useCallback(() => {
    set((prev) => !prev);
  }, [set]);

  return {
    paused,
    setPaused,
    togglePaused,
  };
};
