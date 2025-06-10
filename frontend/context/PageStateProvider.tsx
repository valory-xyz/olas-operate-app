import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useState,
} from 'react';
import { useTimeout } from 'usehooks-ts';

import { ONE_MINUTE_INTERVAL } from '@/constants/intervals';
import { Pages } from '@/enums/Pages';

type PageStateContextType = {
  pageState: Pages;
  setPageState: Dispatch<SetStateAction<Pages>>;
  isPageLoadedAndOneMinutePassed: boolean;
  isUserLoggedIn: boolean;
  setUserLoggedIn: () => void;
  setUserLogout: () => void;
};

export const PageStateContext = createContext<PageStateContextType>({
  pageState: Pages.Setup,
  setPageState: () => {},
  isPageLoadedAndOneMinutePassed: false,
  isUserLoggedIn: false,
  setUserLoggedIn: () => {},
  setUserLogout: () => {},
});

export const PageStateProvider = ({ children }: PropsWithChildren) => {
  const [pageState, setPageState] = useState<Pages>(Pages.Setup);
  const [isPageLoadedAndOneMinutePassed, setIsPageLoadedAndOneMinutePassed] =
    useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);

  // This hook is add a delay of few seconds to show the last transaction
  useTimeout(
    () => {
      setIsPageLoadedAndOneMinutePassed(true);
    },
    pageState === Pages.Setup || isPageLoadedAndOneMinutePassed
      ? null
      : ONE_MINUTE_INTERVAL,
  );

  const setUserLoggedIn = useCallback(() => {
    setIsUserLoggedIn(true);
  }, []);

  const setUserLogout = useCallback(() => {
    setIsUserLoggedIn(false);
  }, []);

  return (
    <PageStateContext.Provider
      value={{
        // User login state
        isUserLoggedIn,
        setUserLoggedIn,
        setUserLogout,

        // Page state
        pageState,
        setPageState,
        isPageLoadedAndOneMinutePassed,
      }}
    >
      {children}
    </PageStateContext.Provider>
  );
};
