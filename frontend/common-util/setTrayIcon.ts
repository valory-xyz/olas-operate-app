import get from 'lodash/get';

type Status = 'low-gas' | 'running' | 'paused';

export const setTrayIcon = (status: Status) => {
  const setTrayIconFn: (status?: Status) => void =
    get(window, 'electronAPI.setTrayIcon') ?? (() => null);

  setTrayIconFn(status);
};
