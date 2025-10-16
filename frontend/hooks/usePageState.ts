import { useCallback, useContext } from 'react';

import { PageStateContext } from '@/context/PageStateProvider';
import { Pages } from '@/enums/Pages';

export const usePageState = () => {
  const pageState = useContext(PageStateContext);
  const { setNavigationParams: _setNavigationParams, ...restOfPageState } =
    pageState;

  const goto = useCallback(
    (state: Pages, params?: typeof pageState.navigationParams) => {
      pageState.setPreviousPageState(pageState.pageState);
      pageState.setPageState(state);
      pageState.setNavigationParams(params ?? {});
    },
    [pageState],
  );
  return { goto, ...restOfPageState };
};
