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
  LOADING: 'LOADING',

  // Configuration view states
  CONFIGURE: 'CONFIGURE',
  CONFIGURE_MANUAL: 'CONFIGURE_MANUAL',

  // List view states
  LIST_AUTO: 'LIST_AUTO',
  LIST_MANUAL: 'LIST_MANUAL',

  // State when user has selected a staking program and is in the process of confirming it
  SELECTING: 'SELECTING',
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
      if (viewState !== ViewState.LOADING) {
        setViewState(ViewState.LOADING);
      }
      return;
    }

    // If migrating, then show the list of staking programs to select from
    if (mode === 'migrate') {
      if (viewState !== ViewState.LIST_AUTO) {
        setViewState(ViewState.LIST_AUTO);
      }
      return;
    }

    if (mode === 'onboard') {
      if (viewState === ViewState.SELECTING) return;

      if (shouldShowList && viewState !== ViewState.LIST_AUTO) {
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
    viewState === ViewState.SELECTING;

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
      onSelectStart={() => setViewState(ViewState.SELECTING)}
      onSelectEnd={() => setViewState(ViewState.LIST_MANUAL)}
    />
  ) : (
    <Alert message="Invalid view type" type="error" />
  );
};
