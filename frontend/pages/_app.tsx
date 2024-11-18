import '../styles/globals.scss';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';

import { Layout } from '@/components/Layout';
import { BalanceProvider } from '@/context/BalanceProvider';
import { ElectronApiProvider } from '@/context/ElectronApiProvider';
import { MasterSafeProvider } from '@/context/MasterSafeProvider';
import { ModalProvider } from '@/context/ModalProvider';
import { OnlineStatusProvider } from '@/context/OnlineStatusProvider';
import { PageStateProvider } from '@/context/PageStateProvider';
import { RewardProvider } from '@/context/RewardProvider';
import { ServicesProvider } from '@/context/ServicesProvider';
import { SettingsProvider } from '@/context/SettingsProvider';
import { SetupProvider } from '@/context/SetupProvider';
import { StakingContractDetailsProvider } from '@/context/StakingContractDetailsProvider';
import { StakingProgramsProvider } from '@/context/StakingProgramsProvider';
import { StoreProvider } from '@/context/StoreProvider';
import { SystemNotificationTriggers } from '@/context/SystemNotificationTriggers';
import { WalletProvider } from '@/context/WalletProvider';
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
          <PageStateProvider>
            <ServicesProvider>
              <WalletProvider>
                <MasterSafeProvider>
                  <StakingProgramsProvider>
                    <StakingContractDetailsProvider>
                      <RewardProvider>
                        <BalanceProvider>
                          <SetupProvider>
                            <SettingsProvider>
                              <ConfigProvider theme={mainTheme}>
                                <ModalProvider>
                                  {isMounted ? (
                                    <QueryClientProvider client={queryClient}>
                                      <SystemNotificationTriggers>
                                        <Layout>
                                          <Component {...pageProps} />
                                        </Layout>
                                      </SystemNotificationTriggers>
                                    </QueryClientProvider>
                                  ) : null}
                                </ModalProvider>
                              </ConfigProvider>
                            </SettingsProvider>
                          </SetupProvider>
                        </BalanceProvider>
                      </RewardProvider>
                    </StakingContractDetailsProvider>
                  </StakingProgramsProvider>
                </MasterSafeProvider>
              </WalletProvider>
            </ServicesProvider>
          </PageStateProvider>
        </StoreProvider>
      </ElectronApiProvider>
    </OnlineStatusProvider>
  );
}
