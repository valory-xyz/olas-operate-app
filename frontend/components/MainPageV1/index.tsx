import { Layout as MainLayout } from 'antd';
import { useMemo } from 'react';
import styled from 'styled-components';

import { AgentStaking } from '@/components/AgentStaking/AgentStaking';
import { ConfirmSwitch } from '@/components/ConfirmSwitch/ConfirmSwitch';
import { DepositOlasForStaking } from '@/components/ConfirmSwitch/DepositOlasForStaking';
import { HelpAndSupport } from '@/components/Pages/HelpAndSupportPage';
import { Settings } from '@/components/SettingsPage';
import { PageTransition } from '@/components/ui';
import { UpdateAgentPage } from '@/components/UpdateAgentPage';
import { PAGES, SIDER_WIDTH, TOP_BAR_HEIGHT } from '@/constants';
import { usePageState } from '@/hooks';

import { AchievementModal } from '../AchievementModal';
import { AgentWallet } from '../AgentWallet';
import { FundPearlWallet } from '../FundPearlWallet';
import { PearlWallet } from '../PearlWallet';
import { SelectStakingPage } from '../SelectStakingPage';
import { Home } from './Home';
import { useNotifyOnAgentRewards } from './hooks/useNotifyOnAgentRewards';
import { useNotifyOnNewEpoch } from './hooks/useNotifyOnNewEpoch';
import { useScrollPage } from './hooks/useScrollPage';
import { useSetupTrayIcon } from './hooks/useSetupTrayIcon';
import { Sidebar } from './Sidebar/Sidebar';

const { Content: MainContent } = MainLayout;

const MainDraggableTopBar = styled.div<{ $isSplitScreenPage?: boolean }>`
  z-index: 1;
  flex-shrink: 0;
  width: 100%;
  height: ${TOP_BAR_HEIGHT}px;
  -webkit-app-region: drag;
  ${(props) =>
    props.$isSplitScreenPage
      ? `
        position: fixed;
        top: 0;
        right: 0;
        left: ${SIDER_WIDTH}px;
      `
      : ``}
`;

const Content = styled(MainContent)<{ $isSplitScreenPage?: boolean }>`
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  overflow: auto;
  ${(props) => (props.$isSplitScreenPage ? `` : `padding-bottom: 40px;`)}
`;

/**
 * Top-level hook to initialize page-level settings, electron window listeners,
 * notifications etc.
 */
const usePageInitialization = () => {
  useSetupTrayIcon();
  useNotifyOnNewEpoch();
  useNotifyOnAgentRewards();
};

export const Main = () => {
  const { pageState } = usePageState();
  const contentContainerRef = useScrollPage();
  usePageInitialization();

  const mainContent = useMemo(() => {
    switch (pageState) {
      case PAGES.PearlWallet:
        return <PearlWallet />;
      case PAGES.AgentWallet:
        return <AgentWallet />;
      case PAGES.Settings:
        return <Settings />;
      case PAGES.HelpAndSupport:
        return <HelpAndSupport />;
      case PAGES.UpdateAgentTemplate:
        return <UpdateAgentPage />;
      case PAGES.AgentStaking:
        return <AgentStaking />;
      case PAGES.SelectStaking:
        return <SelectStakingPage mode="migrate" />;
      case PAGES.ConfirmSwitch:
        return <ConfirmSwitch />;
      case PAGES.DepositOlasForStaking:
        return <DepositOlasForStaking />;
      case PAGES.FundPearlWallet:
        return <FundPearlWallet />;
      default:
        return <Home />;
    }
  }, [pageState]);

  const isSplitScreenPage = pageState === PAGES.UpdateAgentTemplate;

  return (
    <MainLayout>
      <Sidebar />
      <Content $isSplitScreenPage={isSplitScreenPage} ref={contentContainerRef}>
        <MainDraggableTopBar $isSplitScreenPage={isSplitScreenPage} />
        <AchievementModal />
        <PageTransition animationKey={pageState}>{mainContent}</PageTransition>
      </Content>
    </MainLayout>
  );
};
