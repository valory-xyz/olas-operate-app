import '../styles/globals.scss';

import { ConfigProvider } from 'antd';
import type { AppProps } from 'next/app';
import { useEffect, useRef } from 'react';

import { Layout } from '@/components/Layout';
import { PageStateProvider, ServicesProvider, SetupProvider } from '@/context';
import { BalanceProvider } from '@/context/BalanceProvider';
import { ElectronApiProvider } from '@/context/ElectronApiProvider';
import { MasterSafeProvider } from '@/context/MasterSafeProvider';
import { OnlineStatusProvider } from '@/context/OnlineStatusProvider';
import { RewardProvider } from '@/context/RewardProvider';
import { SettingsProvider } from '@/context/SettingsProvider';
import { StakingContractInfoProviderProvider } from '@/context/StakingContractInfoProvider';
import { StoreProvider } from '@/context/StoreProvider';
import { WalletProvider } from '@/context/WalletProvider';
import { mainTheme } from '@/theme';

export default function App({ Component, pageProps }: AppProps) {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

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
                          <StakingContractInfoProviderProvider>
                            {isMounted ? (
                              <ConfigProvider theme={mainTheme}>
                                <Layout>
                                  <Component {...pageProps} />
                                </Layout>
                              </ConfigProvider>
                            ) : null}
                          </StakingContractInfoProviderProvider>
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
