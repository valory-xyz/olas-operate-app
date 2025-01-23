import { useContext } from 'react';

import { PageStateContext } from '@/context/PageStateProvider';
import { Pages } from '@/enums/Pages';

export const usePageState = () => {
  const pageState = useContext(PageStateContext);

  const goto = (state: Pages) => {
    pageState.setPageState(state);
  };

  return { goto, ...pageState };
};
