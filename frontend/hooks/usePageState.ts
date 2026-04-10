import { useCallback, useContext } from 'react';

import { Pages } from '@/constants';
import { PageStateContext } from '@/context/PageStateProvider';

export const usePageState = () => {
  const pageState = useContext(PageStateContext);

  const goto = useCallback(
    (state: Pages, params?: Record<string, unknown>) => {
      pageState.setNavParams(params ?? {});
      pageState.setPageState(state);
    },
    [pageState],
  );
  return { goto, ...pageState };
};
