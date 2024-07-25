import '../styles/globals.scss';

import { ConfigProvider } from 'antd';
import type { AppProps } from 'next/app';
import { useEffect, useRef, useState } from 'react';

import { Layout } from '@/components/Layout';
import { BalanceProvider } from '@/context/BalanceProvider';
import { ElectronApiProvider } from '@/context/ElectronApiProvider';
import { MasterSafeProvider } from '@/context/MasterSafeProvider';
import { OnlineStatusProvider } from '@/context/OnlineStatusProvider';
import { PageStateProvider } from '@/context/PageStateProvider';
import { RewardProvider } from '@/context/RewardProvider';
import { ServicesProvider } from '@/context/ServicesProvider';
import { SettingsProvider } from '@/context/SettingsProvider';
import { SetupProvider } from '@/context/SetupProvider';
import { StakingContractInfoProvider } from '@/context/StakingContractInfoProvider';
import { StoreProvider } from '@/context/StoreProvider';
import { WalletProvider } from '@/context/WalletProvider';
import { mainTheme } from '@/theme';
import Loading from '@/components/Loading';

export default function App({ Component, pageProps }: AppProps) {
  const isMounted = useRef(false);
   const [isLoaded, setIsLoaded] = useState(false);
  const [loadingTimeReached, setLoadingTimeReached] = useState(false);

  useEffect(() => {
    isMounted.current = true;

    const handleLoad = () => {
      setIsLoaded(true);
    };
 const checkStylesLoaded = () => {
      const styles = document.querySelectorAll('link[rel="stylesheet"]');
      if (styles.length > 0) {
        handleLoad();
      }
    };

      const timer = setTimeout(() => {
      setLoadingTimeReached(true);
    }, 1000);

    checkStylesLoaded();
    window.addEventListener('load', checkStylesLoaded);
    return () => {
      isMounted.current = false;
      clearTimeout(timer);
      window.removeEventListener('load', checkStylesLoaded);
    };
  }, []);

 if (!loadingTimeReached || !isLoaded) {
    return <Loading />;
  }
  return (
    <ElectronApiProvider>
      <StoreProvider>
        <PageStateProvider>
          <OnlineStatusProvider>
            <WalletProvider>
              <MasterSafeProvider>
                <ServicesProvider>
                  <RewardProvider>
                    <BalanceProvider>
                      <SetupProvider>
                        <SettingsProvider>
                          <StakingContractInfoProvider>
                            {isMounted ? (
                              <ConfigProvider theme={mainTheme}>
                                <Layout>
                                  <Component {...pageProps} />
                                </Layout>
                              </ConfigProvider>
                            ) : null}
                          </StakingContractInfoProvider>
                        </SettingsProvider>
                      </SetupProvider>
                    </BalanceProvider>
                  </RewardProvider>
                </ServicesProvider>
              </MasterSafeProvider>
            </WalletProvider>
          </OnlineStatusProvider>
        </PageStateProvider>
      </StoreProvider>
    </ElectronApiProvider>
  );
}
