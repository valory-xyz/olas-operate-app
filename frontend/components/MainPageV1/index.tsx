import { Layout } from 'antd';
import { useMemo } from 'react';
import styled from 'styled-components';

import { AgentStaking } from '@/components/AgentStaking/AgentStaking';
import { ConfirmSwitch } from '@/components/ConfirmSwitch/ConfirmSwitch';
import { DepositOlasForStaking } from '@/components/ConfirmSwitch/DepositOlasForStaking';
import { HelpAndSupport } from '@/components/Pages/HelpAndSupportPage';
import { SelectStaking } from '@/components/SelectStaking/SelectStaking';
import { Settings } from '@/components/SettingsPage';
import { UpdateAgentPage } from '@/components/UpdateAgentPage';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

import { AgentWallet } from '../AgentWallet';
import { FundPearlWallet } from '../FundPearlWallet';
import { PearlWallet } from '../PearlWallet';
import { Home } from './Home';
import { useScrollPage } from './hooks/useScrollPage';
import { useSetupTrayIcon } from './hooks/useSetupTrayIcon';
import { Sidebar } from './Sidebar';

const { Content: AntdContent } = Layout;

const Content = styled(AntdContent)<{ $isSplitScreenPage?: boolean }>`
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  overflow: auto;
  ${(props) => (props.$isSplitScreenPage ? `` : `padding: 40px 0px;`)}
`;

/**
 * Top-level hook to initialize page-level settings, electron window listeners, etc.
 */
const usePageInitialization = () => {
  useSetupTrayIcon();
};

export const Main = () => {
  const { pageState } = usePageState();
  const contentContainerRef = useScrollPage();
  usePageInitialization();

  const mainContent = useMemo(() => {
    switch (pageState) {
      case Pages.PearlWallet:
        return <PearlWallet />;
      case Pages.AgentWallet:
        return <AgentWallet />;
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
      case Pages.DepositOlasForStaking:
        return <DepositOlasForStaking />;
      case Pages.FundPearlWallet:
        return <FundPearlWallet />;
      default:
        return <Home />;
    }
  }, [pageState]);

  const isSplitScreenPage = pageState === Pages.UpdateAgentTemplate;

  return (
    <Layout>
      <Sidebar />
      <Content $isSplitScreenPage={isSplitScreenPage} ref={contentContainerRef}>
        {mainContent}
      </Content>
    </Layout>
  );
};
