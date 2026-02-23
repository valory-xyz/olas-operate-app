import { Flex, Spin } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { PAGES } from '@/constants';
import {
  usePageState,
  useServices,
  useStakingContracts,
  useStakingProgram,
} from '@/hooks';

import { Alert } from '../ui';
import { BackButton } from '../ui/BackButton';
import { ConfigureActivityRewards } from './components/ConfigureActivityRewards';
import { SelectActivityRewardsConfiguration } from './components/SelectActivityRewardsConfiguration';
import { SelectMode } from './types';

const ViewState = {
  // LOADING: waiting for services/selected staking state to be available.
  LOADING: 'LOADING',

  // CONFIGURE: show the recommended (agent-config default) staking contract.
  // Example: default is 100 and either no service exists or selected is also 100.
  CONFIGURE: 'CONFIGURE',

  // CONFIGURE_MANUAL: user explicitly navigated back from list to configure,
  // keep showing configure even if selected contract is non-default.
  // Example: user is on list, clicks Back, and expects to stay on Configure.
  CONFIGURE_MANUAL: 'CONFIGURE_MANUAL',

  // LIST_AUTO: list is shown because state indicates non-default is selected.
  // Example: user selected 300 (default is 100), returned from Funding, should see list.
  LIST_AUTO: 'LIST_AUTO',

  // LIST_MANUAL: list is shown because user clicked "Change Configuration".
  // Example: user is on Configure and wants to browse other contracts.
  LIST_MANUAL: 'LIST_MANUAL',

  // SWITCHING: user clicked a contract; keep list stable while selection is in-flight.
  // Example: clicking "Select" triggers service update + navigation to Funding.
  SWITCHING: 'SWITCHING',
} as const;

type ViewStateValue = (typeof ViewState)[keyof typeof ViewState];

type SelectStakingProps = {
  mode: SelectMode;
};

export const SelectStakingPage = ({ mode }: SelectStakingProps) => {
  const { goto: gotoPage } = usePageState();
  const { isLoading, selectedService, selectedAgentConfig } = useServices();
  const { currentStakingProgramId } = useStakingContracts();
  const { selectedStakingProgramId } = useStakingProgram();
  const { defaultStakingProgramId } = selectedAgentConfig;

  const shouldShowList =
    !!selectedService &&
    !!defaultStakingProgramId &&
    !!selectedStakingProgramId &&
    selectedStakingProgramId !== defaultStakingProgramId;

  const [viewState, setViewState] = useState<ViewStateValue>(() => {
    if (isLoading) return ViewState.LOADING;

    // For migrate flow, we always show the list of staking programs to select from
    if (mode === 'migrate') return ViewState.LIST_AUTO;

    // If onboarding, we show the loading state while we determine whether to show
    // the list or just the default staking program configuration
    if (mode !== 'onboard') return ViewState.LOADING;

    return shouldShowList ? ViewState.LIST_AUTO : ViewState.CONFIGURE;
  });

  useEffect(() => {
    if (isLoading) {
      // Keep LOADING while services/staking state is still fetching.
      if (viewState !== ViewState.LOADING) {
        setViewState(ViewState.LOADING);
      }
      return;
    }

    // If migrating, then show the list of staking programs to select from
    if (mode === 'migrate') {
      // Migrate flow always shows the list, regardless of selection.
      if (viewState !== ViewState.LIST_AUTO) {
        setViewState(ViewState.LIST_AUTO);
      }
      return;
    }

    if (mode === 'onboard') {
      // While a selection is in-flight, keep the list stable to avoid flicker.
      if (viewState === ViewState.SWITCHING) return;

      if (shouldShowList && viewState !== ViewState.LIST_AUTO) {
        // Non-default selected (e.g. selected=300, default=100) => list should be shown.
        // If user manually backed to Configure, don't force them back to list.
        if (viewState === ViewState.CONFIGURE_MANUAL) return;
        setViewState(ViewState.LIST_AUTO);
        return;
      }

      if (
        !shouldShowList &&
        viewState !== ViewState.CONFIGURE &&
        viewState !== ViewState.CONFIGURE_MANUAL &&
        viewState !== ViewState.LIST_MANUAL
      ) {
        // Default selected (or no service yet) => show Configure unless user is browsing list.
        setViewState(ViewState.CONFIGURE);
      }
    }
  }, [mode, isLoading, shouldShowList, viewState]);

  const onChangeConfiguration = useCallback(() => {
    setViewState(ViewState.LIST_MANUAL);
  }, []);

  const handleBack = useCallback(() => {
    const isList =
      viewState === ViewState.LIST_AUTO || viewState === ViewState.LIST_MANUAL;
    if (mode === 'onboard' && isList) {
      setViewState(ViewState.CONFIGURE_MANUAL);
      return;
    }

    gotoPage(PAGES.Main);
  }, [gotoPage, mode, viewState]);

  // do not allow going back if service is not yet created
  const backButton = selectedService && <BackButton onPrev={handleBack} />;

  const isConfigurationView =
    viewState === ViewState.CONFIGURE ||
    viewState === ViewState.CONFIGURE_MANUAL;

  const isListView =
    viewState === ViewState.LIST_AUTO ||
    viewState === ViewState.LIST_MANUAL ||
    viewState === ViewState.SWITCHING;

  return viewState === ViewState.LOADING ? (
    <Flex justify="center" align="center" className="w-full py-32">
      <Spin tip="Loading..." />
    </Flex>
  ) : isConfigurationView ? (
    <ConfigureActivityRewards
      backButton={backButton}
      onChangeConfiguration={onChangeConfiguration}
    />
  ) : isListView ? (
    <SelectActivityRewardsConfiguration
      mode={mode}
      currentStakingProgramId={currentStakingProgramId}
      backButton={backButton}
      onSelectStart={() => setViewState(ViewState.SWITCHING)}
      onSelectEnd={() => setViewState(ViewState.LIST_MANUAL)}
    />
  ) : (
    <Alert message="Invalid view type" type="error" />
  );
};
