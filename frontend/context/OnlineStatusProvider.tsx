import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

const initialState = { isOnline: false };

export const OnlineStatusContext = createContext<{ isOnline: boolean }>(
  initialState,
);

export const OnlineStatusProvider = ({ children }: PropsWithChildren) => {
  const [isOnline, setIsOnline] = useState(initialState.isOnline);

  useEffect(() => {
    setIsOnline(navigator.onLine); // initial status after mounting

    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return (
    <OnlineStatusContext.Provider value={{ isOnline }}>
      {children}
    </OnlineStatusContext.Provider>
  );
};

export const useOnlineStatus = () => {
  const context = useContext(OnlineStatusContext);
  if (context === undefined) {
    throw new Error(
      'useOnlineStatus must be used within an OnlineStatusProvider',
    );
  }
  return context;
};
