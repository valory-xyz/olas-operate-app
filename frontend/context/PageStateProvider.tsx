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
import { Maybe } from '@/types';

type NavigationParams = {
  [key in Pages]?: unknown;
};

type PageStateContextType = {
  pageState: Pages;
  previousPageState: Maybe<Pages>;
  setPageState: Dispatch<SetStateAction<Pages>>;
  setPreviousPageState: Dispatch<SetStateAction<Maybe<Pages>>>;
  isPageLoadedAndOneMinutePassed: boolean;
  isUserLoggedIn: boolean;
  setUserLoggedIn: () => void;
  setUserLogout: () => void;
  /**
   * Navigation params can be used to pass data between pages.
   * @warning Make sure to reset navigationParams post usage on the new page.
   */
  navigationParams: NavigationParams;
  /**
   * @warning Do not set the navigation params directly using this function.
   */
  setNavigationParams: Dispatch<SetStateAction<NavigationParams>>;
  resetNavigationParams: () => void;
};

export const PageStateContext = createContext<PageStateContextType>({
  pageState: Pages.Setup,
  previousPageState: null,
  setPageState: () => {},
  setPreviousPageState: () => {},
  navigationParams: {},
  setNavigationParams: () => {},
  resetNavigationParams: () => {},
  isPageLoadedAndOneMinutePassed: false,
  isUserLoggedIn: false,
  setUserLoggedIn: () => {},
  setUserLogout: () => {},
});

export const PageStateProvider = ({ children }: PropsWithChildren) => {
  const [pageState, setPageState] = useState<Pages>(Pages.Setup);
  const [previousPageState, setPreviousPageState] =
    useState<Maybe<Pages>>(null);
  const [navigationParams, setNavigationParams] = useState<NavigationParams>(
    {},
  );
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

  const resetNavigationParams = useCallback(() => {
    setNavigationParams({});
  }, [setNavigationParams]);

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
        previousPageState,
        setPreviousPageState,
        navigationParams,
        setNavigationParams,
        resetNavigationParams,
        isPageLoadedAndOneMinutePassed,
      }}
    >
      {children}
    </PageStateContext.Provider>
  );
};
