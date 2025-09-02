import { Layout } from 'antd';
import { useMemo } from 'react';
import styled from 'styled-components';

import { HelpAndSupport } from '@/components/Pages/HelpAndSupportPage';
import { Settings } from '@/components/SettingsPage';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

import { UpdateAgentPage } from '../UpdateAgentPage';
import { Home } from './Home';
import { Sidebar } from './Sidebar';

const { Content: AntdContent } = Layout;

const Content = styled(AntdContent)<{ $isFullPage?: boolean }>`
  margin: 0 auto;
  overflow: auto;
  ${(props) =>
    props.$isFullPage
      ? ``
      : `
        margin: 40px auto;
        max-width: 744px;`}
`;

export const Main = () => {
  const { pageState } = usePageState();

  const mainContent = useMemo(() => {
    switch (pageState) {
      case Pages.Settings:
        return <Settings />;
      case Pages.HelpAndSupport:
        return <HelpAndSupport />;
      case Pages.UpdateAgentTemplate:
        return <UpdateAgentPage />;
      default:
        return <Home />;
    }
  }, [pageState]);

  const isFullPage = pageState === Pages.UpdateAgentTemplate;

  return (
    <Layout>
      <Sidebar />
      <Content $isFullPage={isFullPage}>{mainContent}</Content>
    </Layout>
  );
};
