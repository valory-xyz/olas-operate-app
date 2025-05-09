import { useCallback, useContext } from 'react';

import { PageStateContext } from '@/context/PageStateProvider';
import { Pages } from '@/enums/Pages';

export const usePageState = () => {
  const pageState = useContext(PageStateContext);

  const goto = useCallback(
    (state: Pages) => {
      pageState.setPageState(state);
    },
    [pageState],
  );

  return { goto, ...pageState };
};
