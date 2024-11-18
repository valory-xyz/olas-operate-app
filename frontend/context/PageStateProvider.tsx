import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useState,
} from 'react';
import { useTimeout } from 'usehooks-ts';

import { Pages } from '@/enums/Pages';

const LAST_TRANSACTION_SHOW_DELAY = 60 * 1000;

type PageStateContextType = {
  pageState: Pages;
  setPageState: Dispatch<SetStateAction<Pages>>;
  isPageLoadedAndOneMinutePassed: boolean;
};

export const PageStateContext = createContext<PageStateContextType>({
  pageState: Pages.Setup,
  setPageState: () => {},
  isPageLoadedAndOneMinutePassed: false,
});

export const PageStateProvider = ({ children }: PropsWithChildren) => {
  const [pageState, setPageState] = useState(Pages.Setup);
  const [isPageLoadedAndOneMinutePassed, setIsPageLoadedAndOneMinutePassed] =
    useState(false);

  // This hook is add a delay of few seconds to show the last transaction
  useTimeout(
    () => {
      setIsPageLoadedAndOneMinutePassed(true);
    },
    pageState === Pages.Setup || isPageLoadedAndOneMinutePassed
      ? null
      : LAST_TRANSACTION_SHOW_DELAY,
  );

  return (
    <PageStateContext.Provider
      value={{
        pageState,
        setPageState,
        isPageLoadedAndOneMinutePassed,
      }}
    >
      {children}
    </PageStateContext.Provider>
  );
};
