import { useCallback, useContext } from 'react';

import { Pages } from '@/constants';
import { PageStateContext } from '@/context/PageStateProvider';

export const usePageState = () => {
  const { setNavParams, ...pageStateRest } = useContext(PageStateContext);
  const { setPageState } = pageStateRest;

  const goto = useCallback(
    (state: Pages, params?: Record<string, unknown>) => {
      setNavParams(params ?? {});
      setPageState(state);
    },
    [setPageState, setNavParams],
  );

  const clearNavParams = useCallback(() => setNavParams({}), [setNavParams]);

  return { goto, clearNavParams, ...pageStateRest };
};
