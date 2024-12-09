import { useContext } from 'react';

import { PageStateContext } from '@/context/PageStateProvider';
import { Pages } from '@/enums/Pages';

export const usePageState = () => {
  const { pageState, setPageState, isPageLoadedAndOneMinutePassed } =
    useContext(PageStateContext);

  const goto = (state: Pages) => {
    setPageState(state);
  };

  return { pageState, setPageState, goto, isPageLoadedAndOneMinutePassed };
};
