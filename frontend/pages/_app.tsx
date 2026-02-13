import '../styles/globals.scss';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import ErrorBoundary from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import { mainTheme } from '@/constants';
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
import { SupportModalProvider } from '@/context/SupportModalProvider';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useGlobalErrorHandlers } from '@/hooks/useGlobalErrorHandlers';
import { logAppLifecycle, logNavigation } from '@/utils/logger';

const queryClient = new QueryClient();

function App({ Component, pageProps }: AppProps) {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  const { nextLogError, nextLogEvent } = useElectronApi();

  useGlobalErrorHandlers(nextLogError);

  // Log route navigation
  useEffect(() => {
    if (router.isReady) {
      const routeName =
        router.pathname === '/'
          ? 'dashboard'
          : router.pathname.replace(/\//g, '-').substring(1);
      logNavigation({ screen: routeName }, nextLogEvent).catch(() => {
        // Silently fail if logging is not ready
      });
    }
  }, [router.pathname, router.isReady, nextLogEvent]);

  useEffect(() => {
    setIsMounted(true);
    // Log app loaded event
    logAppLifecycle({ stage: 'loaded' }, nextLogEvent).catch(() => {
      // Silently fail if logging is not ready
    });
  }, [nextLogEvent]);

  return (
    <ErrorBoundary logger={nextLogError}>
      <OnlineStatusProvider>
        <StoreProvider>
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
                              <MessageProvider>
                                <SharedProvider>
                                  <OnRampProvider>
                                    <PearlWalletProvider>
                                      <SupportModalProvider>
                                        {isMounted ? (
                                          <Layout>
                                            <Component {...pageProps} />
                                          </Layout>
                                        ) : null}
                                      </SupportModalProvider>
                                    </PearlWalletProvider>
                                  </OnRampProvider>
                                </SharedProvider>
                              </MessageProvider>
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
        </StoreProvider>
      </OnlineStatusProvider>
    </ErrorBoundary>
  );
}

export default function AppRoot(props: AppProps) {
  return (
    <ElectronApiProvider>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={mainTheme}>
          <App {...props} />
        </ConfigProvider>
      </QueryClientProvider>
    </ElectronApiProvider>
  );
}
