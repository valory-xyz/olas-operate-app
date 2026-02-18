import { Button, Flex, Spin, Typography } from 'antd';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import {
  COLOR,
  MAIN_CONTENT_MAX_WIDTH,
  PAGES,
  StakingProgramId,
} from '@/constants';
import {
  usePageState,
  useServices,
  useStakingContracts,
  useStakingProgram,
} from '@/hooks';
import { assertRequired, Nullable } from '@/types';

import { StakingContractCard } from '../StakingContractCard';
import { BackButton } from '../ui/BackButton';
import { SelectStakingButton } from './SelectStakingButton';
import { SwitchStakingButton } from './SwitchStakingButton';

const { Title, Text } = Typography;

const StakingContractsWrapper = styled.div`
  display: grid;
  grid-template-columns: auto auto;
  justify-content: center;
  gap: 24px;
  margin-top: 32px;
`;

const ConfigureStakingContractCardContainer = styled.div`
  background-color: ${COLOR.GRAY_3};
  border-radius: 16px;
  > .ant-typography {
    display: inline-block;
    text-align: center;
    width: 100%;
    padding: 8px 0px;
    border-top-left-radius: inherit;
    border-top-right-radius: inherit;
  }
  .ant-card {
    width: 100%;
  }
`;

const ViewType = {
  LOADING: 'LOADING',
  CONFIGURE: 'CONFIGURE',
  SELECT_FROM_LIST: 'SELECT_FROM_LIST',
} as const;

type ViewTypeValue = (typeof ViewType)[keyof typeof ViewType];

type SelectMode = 'onboard' | 'migrate';

type ConfigureActivityRewardsProps = {
  backButton?: ReactNode;
  onChangeConfiguration: () => void;
};
const ConfigureActivityRewards = ({
  backButton,
  onChangeConfiguration,
}: ConfigureActivityRewardsProps) => {
  const { defaultStakingProgramId } = useStakingProgram();
  assertRequired(
    defaultStakingProgramId,
    'Default staking program ID is required',
  );

  return (
    <Flex
      vertical
      justify="center"
      gap={32}
      style={{ width: 516, margin: '0 auto' }}
    >
      <Flex vertical className="mx-auto">
        {backButton}
        <Title level={3} className="mt-12">
          Configure Activity Rewards
        </Title>
        <Text className="text-neutral-secondary">
          You can earn OLAS crypto for using your agent. Select the
          configuration – called Staking Contract – that suits you best.
        </Text>
      </Flex>

      <ConfigureStakingContractCardContainer>
        <Text className="text-neutral-secondary">
          Recommended configuration
        </Text>
        <StakingContractCard
          stakingProgramId={defaultStakingProgramId}
          renderAction={() => (
            <Flex className="px-24 pb-24 mt-40" gap={16}>
              <Button size="large" block onClick={onChangeConfiguration}>
                Change Configuration
              </Button>
              <SelectStakingButton
                stakingProgramId={defaultStakingProgramId}
                isCurrentStakingProgram={true}
                buttonLabelOverride="Continue"
                ignoreCurrentSelection={true}
              />
            </Flex>
          )}
        />
      </ConfigureStakingContractCardContainer>
    </Flex>
  );
};

type SelectActivityRewardsProps = {
  mode: SelectMode;
  backButton?: ReactNode;
  currentStakingProgramId: Nullable<StakingProgramId>;
};
const SelectActivityRewards = ({
  mode,
  backButton,
  currentStakingProgramId,
}: SelectActivityRewardsProps) => {
  const { orderedStakingProgramIds } = useStakingContracts();

  return (
    <Flex vertical justify="center" className="w-full">
      <Flex
        vertical
        className="mx-auto"
        style={{ width: MAIN_CONTENT_MAX_WIDTH }}
      >
        {backButton}
        <Title level={3} className="mt-12">
          Select Activity Rewards Configuration
        </Title>
        <Text className="text-neutral-secondary">
          Configuration defines how much activity rewards you can earn by using
          your agent.
        </Text>
      </Flex>

      <StakingContractsWrapper>
        {orderedStakingProgramIds.map((stakingProgramId) => {
          const isCurrentStakingProgram =
            stakingProgramId === currentStakingProgramId;
          return (
            <StakingContractCard
              key={stakingProgramId}
              stakingProgramId={stakingProgramId}
              renderAction={() => (
                <>
                  {mode === 'onboard' && (
                    <Flex className="px-24 pb-24 mt-40" gap={16}>
                      <SelectStakingButton
                        isCurrentStakingProgram={isCurrentStakingProgram}
                        stakingProgramId={stakingProgramId}
                      />
                    </Flex>
                  )}
                  {mode === 'migrate' && (
                    <SwitchStakingButton
                      isCurrentStakingProgram={isCurrentStakingProgram}
                      stakingProgramId={stakingProgramId}
                    />
                  )}
                </>
              )}
            />
          );
        })}
      </StakingContractsWrapper>
    </Flex>
  );
};

type SelectStakingProps = {
  mode: SelectMode;
};

export const SelectStakingPage = ({ mode }: SelectStakingProps) => {
  const { goto: gotoPage } = usePageState();
  const { selectedService } = useServices();
  const { orderedStakingProgramIds, currentStakingProgramId } =
    useStakingContracts();
  const { defaultStakingProgramId, selectedStakingProgramId } =
    useStakingProgram();
  const [hasUserChangedConfig, setHasUserChangedConfig] = useState(false);

  const [viewType, setViewType] = useState<ViewTypeValue>(() => {
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
    // If migrating, then show the list of staking programs to select from
    if (mode === 'migrate') {
      if (viewType !== ViewType.SELECT_FROM_LIST) {
        setViewType(ViewType.SELECT_FROM_LIST);
      }
      return;
    }

    if (mode === 'onboard') {
      // If service is created and present
      if (selectedService) {
        const shouldShowList =
          !!defaultStakingProgramId &&
          !!selectedStakingProgramId &&
          selectedStakingProgramId !== defaultStakingProgramId;

        // If default and selected staking are same, show configuration,
        // else show the list to select from
        const nextViewType = shouldShowList
          ? ViewType.SELECT_FROM_LIST
          : ViewType.CONFIGURE;

        if (!hasUserChangedConfig && viewType !== nextViewType) {
          setViewType(nextViewType);
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
  ]);

  const onChangeConfiguration = useCallback(() => {
    setHasUserChangedConfig(true);
    setViewType(ViewType.SELECT_FROM_LIST);
  }, []);

  const handleBack = useCallback(() => {
    if (mode === 'onboard' && viewType === ViewType.SELECT_FROM_LIST) {
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
    <SelectActivityRewards
      mode={mode}
      currentStakingProgramId={currentStakingProgramId}
      backButton={backButton}
    />
  ) : null;
};
