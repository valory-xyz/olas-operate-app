import { Layout } from 'antd';
import { useMemo } from 'react';
import styled from 'styled-components';

import { AgentStaking } from '@/components/AgentStaking/AgentStaking';
import { HelpAndSupport } from '@/components/Pages/HelpAndSupportPage';
import { SelectStaking } from '@/components/SelectStaking/SelectStaking';
import { Settings } from '@/components/SettingsPage';
import { UpdateAgentPage } from '@/components/UpdateAgentPage';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

import { ConfirmSwitch } from '../ConfirmSwitch/ConfirmSwitch';
import { PearlWallet } from '../PearlWallet';
import { Home } from './Home';
import { Sidebar } from './Sidebar';

const { Content: AntdContent } = Layout;

const Content = styled(AntdContent)<{ $isSplitScreenPage?: boolean }>`
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  overflow: auto;
  ${(props) => (props.$isSplitScreenPage ? `` : `padding: 40px 0px;`)}
`;

export const Main = () => {
  const { pageState } = usePageState();

  const mainContent = useMemo(() => {
    switch (pageState) {
      case Pages.PearlWallet:
        return <PearlWallet />;
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
      case Pages.ConfirmSwitch:
        return <ConfirmSwitch />;
      default:
        return <Home />;
    }
  }, [pageState]);

  const isSplitScreenPage = pageState === Pages.UpdateAgentTemplate;

  return (
    <Layout>
      <Sidebar />
      <Content $isSplitScreenPage={isSplitScreenPage}>{mainContent}</Content>
    </Layout>
  );
};
