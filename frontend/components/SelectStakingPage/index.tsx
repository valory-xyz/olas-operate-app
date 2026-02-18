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
const ConfigureActivityRewardsTitle = () => (
  <>
    <Title level={3} className="mt-12">
      Configure Activity Rewards
    </Title>
    <Text className="text-neutral-secondary">
      You can earn OLAS crypto for using your agent. Select the configuration –
      called Staking Contract – that suits you best.
    </Text>
  </>
);

const SelectActivityRewardsConfigurationTitle = () => (
  <>
    <Title level={3} className="mt-12">
      Select Activity Rewards Configuration
    </Title>
    <Text className="text-neutral-secondary">
      Configuration defines how much activity rewards you can earn by using your
      agent.
    </Text>
  </>
);

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
        <ConfigureActivityRewardsTitle />
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
  console.log({ orderedStakingProgramIds });

  return (
    <Flex vertical justify="center" className="w-full">
      <Flex
        vertical
        className="mx-auto"
        style={{ width: MAIN_CONTENT_MAX_WIDTH }}
      >
        {backButton}
        <SelectActivityRewardsConfigurationTitle />
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
  const [viewType, setViewType] = useState<ViewTypeValue>(
    mode === 'migrate' ? ViewType.SELECT_FROM_LIST : ViewType.LOADING,
  );

  console.log({ currentStakingProgramId });

  useEffect(() => {
    if (mode === 'migrate') {
      if (viewType === ViewType.LOADING) {
        setViewType(ViewType.SELECT_FROM_LIST);
      }
    } else if (mode === 'onboard') {
      setViewType(ViewType.CONFIGURE);
    }
  }, [mode, viewType]);

  const onChangeConfiguration = useCallback(() => {
    setViewType(ViewType.SELECT_FROM_LIST);
  }, []);

  /**
   * show the recommended staking program for onboarding, iff
   * - No service is created yet (i.e. user is in the middle of onboarding)
   * - Either the selected service is present and the staking program is the default one.
   * - If no service is selected
   */

  // Do not allow going back if service is not yet created
  const backButton = selectedService && (
    <BackButton onPrev={() => gotoPage(PAGES.Main)} />
  );

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
