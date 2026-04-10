import { useCallback, useContext } from 'react';

import { Pages } from '@/constants';
import { PageStateContext } from '@/context/PageStateProvider';

export const usePageState = () => {
  const { setNavParams, ...pageStateRest } = useContext(PageStateContext);

  const goto = useCallback(
    (state: Pages, params?: Record<string, unknown>) => {
      setNavParams(params ?? {});
      pageStateRest.setPageState(state);
    },
    [pageStateRest.setPageState, setNavParams],
  );
  return { goto, ...pageStateRest };
};
