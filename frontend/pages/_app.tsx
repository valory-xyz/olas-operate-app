import '../styles/globals.scss';

import { ConfigProvider } from 'antd';
import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';

import { Layout } from '@/components/Layout';
import { ElectronProvider } from '@/context/electron';
import { MainProvider } from '@/context/main';
import { ModalProvider } from '@/context/ModalProvider';
import { OnlineStatusProvider } from '@/context/OnlineStatusProvider';
import { PageStateProvider } from '@/context/PageStateProvider';
import { mainTheme } from '@/theme';

export default function App({ Component, pageProps }: AppProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <OnlineStatusProvider>
      <ElectronProvider>
        <PageStateProvider>
          <ConfigProvider theme={mainTheme}>
            <ModalProvider>
              <MainProvider>
                {isMounted ? (
                  <Layout>
                    <Component {...pageProps} />
                  </Layout>
                ) : null}
              </MainProvider>
            </ModalProvider>
          </ConfigProvider>
        </PageStateProvider>
      </ElectronProvider>
    </OnlineStatusProvider>
  );
}
