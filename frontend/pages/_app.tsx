import '../styles/globals.scss';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';

import { Layout } from '@/components/Layout';
import { BalanceProvider } from '@/context/BalanceProvider';
import { ElectronApiProvider } from '@/context/ElectronApiProvider';
import { MasterWalletProvider } from '@/context/MasterWalletProvider';
import { ModalProvider } from '@/context/ModalProvider';
import { OnlineStatusProvider } from '@/context/OnlineStatusProvider';
import { PageStateProvider } from '@/context/PageStateProvider';
import { RewardProvider } from '@/context/RewardProvider';
import { ServicesProvider } from '@/context/ServicesProvider';
import { SettingsProvider } from '@/context/SettingsProvider';
import { SetupProvider } from '@/context/SetupProvider';
import { StakingContractDetailsProvider } from '@/context/StakingContractDetailsProvider';
import { StakingProgramProvider } from '@/context/StakingProgramProvider';
import { StoreProvider } from '@/context/StoreProvider';
import { SystemNotificationTriggers } from '@/context/SystemNotificationTriggers';
import { mainTheme } from '@/theme';
import { setupMulticallAddresses } from '@/utils/setupMulticall';

// Setup multicall addresses
setupMulticallAddresses();

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <OnlineStatusProvider>
      <ElectronApiProvider>
        <StoreProvider>
          <QueryClientProvider client={queryClient}>
            <PageStateProvider>
              <ServicesProvider>
                <MasterWalletProvider>
                  <StakingProgramProvider>
                    <StakingContractDetailsProvider>
                      <RewardProvider>
                        <BalanceProvider>
                          <SetupProvider>
                            <SettingsProvider>
                              <ConfigProvider theme={mainTheme}>
                                <ModalProvider>
                                  {isMounted ? (
                                    <SystemNotificationTriggers>
                                      <Layout>
                                        <Component {...pageProps} />
                                      </Layout>
                                    </SystemNotificationTriggers>
                                  ) : null}
                                </ModalProvider>
                              </ConfigProvider>
                            </SettingsProvider>
                          </SetupProvider>
                        </BalanceProvider>
                      </RewardProvider>
                    </StakingContractDetailsProvider>
                  </StakingProgramProvider>
                </MasterWalletProvider>
              </ServicesProvider>
            </PageStateProvider>
          </QueryClientProvider>
        </StoreProvider>
      </ElectronApiProvider>
    </OnlineStatusProvider>
  );
}
