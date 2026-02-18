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

const ViewType = {
  LOADING: 'LOADING',
  CONFIGURE: 'CONFIGURE',
  SELECT_FROM_LIST: 'SELECT_FROM_LIST',
} as const;

type ViewTypeValue = (typeof ViewType)[keyof typeof ViewType];

type SelectStakingProps = {
  mode: SelectMode;
};

export const SelectStakingPage = ({ mode }: SelectStakingProps) => {
  const { goto: gotoPage } = usePageState();
  const { isLoading, selectedService, selectedAgentConfig } = useServices();
  const { currentStakingProgramId } = useStakingContracts();
  const { selectedStakingProgramId } = useStakingProgram();
  const { defaultStakingProgramId } = selectedAgentConfig;

  const [hasUserChangedConfig, setHasUserChangedConfig] = useState(false);
  const [viewType, setViewType] = useState<ViewTypeValue>(() => {
    if (isLoading) return ViewType.LOADING;

    // For migrate flow, we always show the list of staking programs to select from
    if (mode === 'migrate') return ViewType.SELECT_FROM_LIST;

    // If onboarding, we show the loading state while we determine whether to show
    // the list or just the default staking program configuration
    if (mode !== 'onboard') return ViewType.LOADING;

    const shouldShowList =
      !!selectedService &&
      !!defaultStakingProgramId &&
      !!selectedStakingProgramId &&
      selectedStakingProgramId !== defaultStakingProgramId;

    return shouldShowList ? ViewType.SELECT_FROM_LIST : ViewType.CONFIGURE;
  });

  useEffect(() => {
    if (isLoading) {
      if (viewType !== ViewType.LOADING) {
        setViewType(ViewType.LOADING);
      }
      return;
    }

    // If migrating, then show the list of staking programs to select from
    if (mode === 'migrate') {
      if (viewType !== ViewType.SELECT_FROM_LIST) {
        setViewType(ViewType.SELECT_FROM_LIST);
      }
      return;
    }

    if (mode === 'onboard') {
      if (hasUserChangedConfig) return;

      // If service is created and present
      if (selectedService) {
        const shouldShowList =
          !!defaultStakingProgramId &&
          !!selectedStakingProgramId &&
          selectedStakingProgramId !== defaultStakingProgramId;

        if (shouldShowList && viewType !== ViewType.SELECT_FROM_LIST) {
          setViewType(ViewType.SELECT_FROM_LIST);
          return;
        }

        if (
          !shouldShowList &&
          !hasUserChangedConfig &&
          viewType !== ViewType.CONFIGURE
        ) {
          setViewType(ViewType.CONFIGURE);
        }
        return;
      }

      // If service is not yet created, show the default staking program configuration
      if (viewType === ViewType.LOADING) {
        setViewType(ViewType.CONFIGURE);
      }
    }
  }, [
    mode,
    viewType,
    selectedService,
    defaultStakingProgramId,
    selectedStakingProgramId,
    hasUserChangedConfig,
    isLoading,
  ]);

  const onChangeConfiguration = useCallback(() => {
    setHasUserChangedConfig(true);
    setViewType(ViewType.SELECT_FROM_LIST);
  }, []);

  const handleBack = useCallback(() => {
    if (mode === 'onboard' && viewType === ViewType.SELECT_FROM_LIST) {
      setHasUserChangedConfig(true);
      setViewType(ViewType.CONFIGURE);
      return;
    }

    gotoPage(PAGES.Main);
  }, [gotoPage, mode, viewType]);

  // do not allow going back if service is not yet created
  const backButton = selectedService && <BackButton onPrev={handleBack} />;

  return viewType === ViewType.LOADING ? (
    <Flex justify="center" align="center" className="w-full py-32">
      <Spin tip="Loading..." />
    </Flex>
  ) : viewType === ViewType.CONFIGURE ? (
    <ConfigureActivityRewards
      backButton={backButton}
      onChangeConfiguration={onChangeConfiguration}
    />
  ) : viewType === ViewType.SELECT_FROM_LIST ? (
    <SelectActivityRewardsConfiguration
      mode={mode}
      currentStakingProgramId={currentStakingProgramId}
      backButton={backButton}
    />
  ) : (
    <Alert message="Invalid view type" type="error" />
  );
};
