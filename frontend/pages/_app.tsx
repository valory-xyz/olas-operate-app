import {
  ModalsProvider,
  ServicesProvider,
  SpawnProvider,
  TabsProvider,
  AppInfoProvider,
} from '@/context';
import { mainTheme } from '@/theme';
import ConfigProvider from 'antd/es/config-provider';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AppInfoProvider>
      <ServicesProvider>
        <SpawnProvider>
          <ModalsProvider>
            <TabsProvider>
              <ConfigProvider theme={mainTheme}>
                <Component {...pageProps} />
              </ConfigProvider>
            </TabsProvider>
          </ModalsProvider>
        </SpawnProvider>
      </ServicesProvider>
    </AppInfoProvider>
  );
}
