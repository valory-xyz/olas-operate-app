import { Layout } from 'antd';
import { useMemo } from 'react';
import styled from 'styled-components';

import { HelpAndSupport } from '@/components/Pages/HelpAndSupportPage';
import { Settings } from '@/components/SettingsPage';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

import { Home } from './Home';
import { Sidebar } from './Sidebar';

const { Content: AntdContent } = Layout;

const Content = styled(AntdContent)`
  padding: 0 16px;
  max-width: 744px;
  margin: 0 auto;
`;

export const Main = () => {
  const { pageState } = usePageState();

  const mainContent = useMemo(() => {
    switch (pageState) {
      case Pages.Settings:
        return <Settings />;
      case Pages.HelpAndSupport:
        return <HelpAndSupport />;
      default:
        return <Home />;
    }
  }, [pageState]);

  return (
    <Layout>
      <Sidebar />
      <Content className="pl-16 pr-16">{mainContent}</Content>
    </Layout>
  );
};
