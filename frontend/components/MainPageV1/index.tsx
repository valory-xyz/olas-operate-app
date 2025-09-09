import { Layout } from 'antd';
import { useMemo } from 'react';
import styled from 'styled-components';

import { AgentStaking } from '@/components/AgentStaking/AgentStaking';
import { HelpAndSupport } from '@/components/Pages/HelpAndSupportPage';
import { SelectStaking } from '@/components/SelectStaking/SelectStaking';
import { Settings } from '@/components/SettingsPage';
import { UpdateAgentPage } from '@/components/UpdateAgentPage';
import { MAIN_CONTENT_MAX_WIDTH } from '@/constants/width';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

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
        max-width: ${MAIN_CONTENT_MAX_WIDTH}px;`}
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
      case Pages.AgentStaking:
        return <AgentStaking />;
      case Pages.SelectStaking:
        return <SelectStaking />;
      default:
        return <Home />;
    }
  }, [pageState]);

  const isFullPage =
    pageState === Pages.UpdateAgentTemplate ||
    pageState === Pages.SelectStaking;

  return (
    <Layout>
      <Sidebar />
      <Content $isFullPage={isFullPage}>{mainContent}</Content>
    </Layout>
  );
};
