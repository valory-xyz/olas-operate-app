import React, {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';

import { Nullable } from '@/types/Util';

type OnRampContextType = {
  usdAmountToPay: Nullable<number>;
  updateUsdAmountToPay: (amount: number) => void;
  isBuyCryptoBtnLoading: boolean;
  updateIsBuyCryptoBtnLoading: (loading: boolean) => void;
};

const OnRampContext = createContext<OnRampContextType | undefined>(undefined);

export const useOnRampContext = () => {
  const ctx = useContext(OnRampContext);
  if (!ctx) {
    throw new Error('useOnRampContext must be used within OnRampProvider');
  }
  return ctx;
};

export const OnRampProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [usdAmountToPay, setUsdAmountToPay] = useState<Nullable<number>>(null);
  const [isBuyCryptoBtnLoading, setIsBuyCryptoBtnLoading] = useState(false);

  // Function to set the USD amount to pay
  const updateUsdAmountToPay = useCallback((amount: number) => {
    setUsdAmountToPay(amount);
  }, []);

  const updateIsBuyCryptoBtnLoading = useCallback((loading: boolean) => {
    setIsBuyCryptoBtnLoading(loading);
  }, []);

  return (
    <OnRampContext.Provider
      value={{
        usdAmountToPay,
        updateUsdAmountToPay,
        isBuyCryptoBtnLoading,
        updateIsBuyCryptoBtnLoading,
      }}
    >
      {children}
    </OnRampContext.Provider>
  );
};
