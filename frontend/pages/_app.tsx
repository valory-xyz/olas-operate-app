import '../styles/globals.scss';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';

import { Layout } from '@/components/Layout';
import { BalanceProvider } from '@/context/BalanceProvider/BalanceProvider';
import { BalancesAndRefillRequirementsProvider } from '@/context/BalancesAndRefillRequirementsProvider/BalancesAndRefillRequirementsProvider';
import { ElectronApiProvider } from '@/context/ElectronApiProvider';
import { MasterWalletProvider } from '@/context/MasterWalletProvider';
import { MessageProvider } from '@/context/MessageProvider';
import { OnlineStatusProvider } from '@/context/OnlineStatusProvider';
import { OnRampProvider } from '@/context/OnRampProvider';
import { PageStateProvider } from '@/context/PageStateProvider';
import { PearlWalletProvider } from '@/context/PearlWalletProvider';
import { RewardProvider } from '@/context/RewardProvider';
import { ServicesProvider } from '@/context/ServicesProvider';
import { SettingsProvider } from '@/context/SettingsProvider';
import { SetupProvider } from '@/context/SetupProvider';
import { SharedProvider } from '@/context/SharedProvider/SharedProvider';
import { StakingContractDetailsProvider } from '@/context/StakingContractDetailsProvider';
import { StakingProgramProvider } from '@/context/StakingProgramProvider';
import { StoreProvider } from '@/context/StoreProvider';
import { SystemNotificationTriggers } from '@/context/SystemNotificationTriggers';
import { mainTheme } from '@/theme';

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
                          <BalancesAndRefillRequirementsProvider>
                            <SetupProvider>
                              <SettingsProvider>
                                <ConfigProvider theme={mainTheme}>
                                  <MessageProvider>
                                    <SharedProvider>
                                      <OnRampProvider>
                                        <PearlWalletProvider>
                                          {isMounted ? (
                                            <SystemNotificationTriggers>
                                              <Layout>
                                                <Component {...pageProps} />
                                              </Layout>
                                            </SystemNotificationTriggers>
                                          ) : null}
                                        </PearlWalletProvider>
                                      </OnRampProvider>
                                    </SharedProvider>
                                  </MessageProvider>
                                </ConfigProvider>
                              </SettingsProvider>
                            </SetupProvider>
                          </BalancesAndRefillRequirementsProvider>
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
