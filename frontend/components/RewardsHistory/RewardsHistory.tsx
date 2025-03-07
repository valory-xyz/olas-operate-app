import {
  ApiOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  Button,
  Col,
  ConfigProvider,
  Flex,
  Popover,
  Row,
  Spin,
  Tag,
  ThemeConfig,
  Typography,
} from 'antd';
import { CSSProperties, ReactNode, useMemo } from 'react';
import styled from 'styled-components';

import { CardTitle } from '@/components/Card/CardTitle';
import { CardFlex } from '@/components/styled/CardFlex';
import {
  STAKING_PROGRAM_ADDRESS,
  STAKING_PROGRAMS,
} from '@/config/stakingPrograms';
import { COLOR } from '@/constants/colors';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { EXPLORER_URL_BY_MIDDLEWARE_CHAIN } from '@/constants/urls';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { AgentConfig } from '@/types/Agent';
import { balanceFormat } from '@/utils/numberFormatters';
import {
  formatToMonthDay,
  formatToShortDateTime,
  ONE_DAY_IN_S,
} from '@/utils/time';

import { Checkpoint, useRewardsHistory } from '../../hooks/useRewardsHistory';
import { GoToMainPageButton } from '../Pages/GoToMainPageButton';
import { EpochDetails } from './types';

const { Text, Title } = Typography;
const MIN_HEIGHT = 400;
const iconStyle: CSSProperties = { fontSize: 48, color: COLOR.TEXT_LIGHT };

const yourWalletTheme: ThemeConfig = {
  components: {
    Card: { paddingLG: 16 },
  },
};

const ContractName = styled.div`
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid ${COLOR.BORDER_GRAY};
`;

const EpochRow = styled(Row)`
  padding: 16px 24px;
  border-bottom: 1px solid ${COLOR.BORDER_GRAY};
`;

const formatReward = (reward?: number) =>
  reward ? `~${balanceFormat(reward ?? 0, 2)} OLAS` : '0 OLAS';

const EarnedTag = () => (
  <Tag color="success" className="m-0">
    Earned
  </Tag>
);

const NotEarnedTag = () => (
  <Tag color="red" className="m-0">
    Not earned
  </Tag>
);

const NotYetEarnedTag = () => (
  <Tag color="processing" className="m-0">
    Not yet earned
  </Tag>
);

const Container = ({ children }: { children: ReactNode }) => (
  <Flex
    vertical
    gap={24}
    align="center"
    justify="center"
    style={{ height: MIN_HEIGHT }}
  >
    {children}
  </Flex>
);

const Loading = () => (
  <Container>
    <Spin />
  </Container>
);

const NoRewardsHistory = () => (
  <Container>
    <HistoryOutlined style={iconStyle} />
    <Text type="secondary">There’s no history of rewards yet</Text>
  </Container>
);

const ErrorLoadingHistory = ({ refetch }: { refetch: () => void }) => (
  <Container>
    <ApiOutlined style={iconStyle} />
    <Text type="secondary">Error loading data</Text>
    <Button onClick={refetch}>Try again</Button>
  </Container>
);

const EmptyRewardsHistoryForCurrentContract = () => (
  <Flex vertical style={{ height: 60 }} align="center" justify="center">
    <Text type="secondary">There’s no history of rewards yet.</Text>
  </Flex>
);

type EpochTimeProps = Pick<
  EpochDetails,
  'epoch' | 'epochStartTimeStamp' | 'epochEndTimeStamp'
> &
  Partial<Pick<EpochDetails, 'transactionHash'>>;

const EpochTime = ({
  epoch,
  epochEndTimeStamp,
  epochStartTimeStamp,
  transactionHash,
}: EpochTimeProps) => {
  const { selectedAgentConfig } = useServices();
  const { middlewareHomeChainId } = selectedAgentConfig;

  const timePeriod = useMemo(() => {
    if (epochStartTimeStamp && epochEndTimeStamp) {
      return `${formatToShortDateTime(epochStartTimeStamp * 1000)} - ${formatToShortDateTime(epochEndTimeStamp * 1000)} (UTC)`;
    }
    if (epochStartTimeStamp) {
      return `${formatToMonthDay(epochStartTimeStamp * 1000)} (UTC)`;
    }
    return 'NA';
  }, [epochStartTimeStamp, epochEndTimeStamp]);

  return (
    <Text type="secondary">
      {`Epoch ${epoch}`}
      &nbsp;
      <Popover
        arrow={false}
        placement="topRight"
        content={
          <Flex vertical gap={4} className="text-sm" style={{ width: 280 }}>
            <Title level={5} className="text-sm m-0">
              Epoch duration
            </Title>
            <Text type="secondary" className="text-sm m-0">
              {timePeriod}
            </Text>
            {transactionHash && (
              <a
                href={`${EXPLORER_URL_BY_MIDDLEWARE_CHAIN[middlewareHomeChainId]}/tx/${transactionHash}`}
                target="_blank"
              >
                End of epoch transaction {UNICODE_SYMBOLS.EXTERNAL_LINK}
              </a>
            )}
          </Flex>
        }
      >
        <InfoCircleOutlined />
      </Popover>
    </Text>
  );
};

type RewardRowProps = {
  epochSummary: ReactNode;
  earned: ReactNode;
  reward: string;
};
const RewardRow = ({ epochSummary, earned, reward }: RewardRowProps) => (
  <EpochRow>
    <Col span={6}>{epochSummary}</Col>
    <Col span={11} className="text-center">
      {earned}
    </Col>
    <Col span={7} className="text-right">
      <Text type="secondary">{reward}</Text>
    </Col>
  </EpochRow>
);

type ContractRewardsProps = {
  stakingProgramId: StakingProgramId;
  checkpoints: Checkpoint[];
  selectedAgentConfig: AgentConfig;
};

const ContractRewards = ({
  checkpoints,
  stakingProgramId,
  selectedAgentConfig,
}: ContractRewardsProps) => {
  const stakingProgramMeta =
    STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][stakingProgramId];
  const { availableRewardsForEpochEth: reward, isEligibleForRewards } =
    useRewardContext();

  const contractName = useMemo(() => {
    return (
      <ContractName>
        <Text strong>{stakingProgramMeta.name}</Text>
      </ContractName>
    );
  }, [stakingProgramMeta]);

  if (checkpoints.length === 0) {
    return (
      <Flex vertical>
        {contractName}
        <EmptyRewardsHistoryForCurrentContract />
      </Flex>
    );
  }

  return (
    <Flex vertical>
      {contractName}

      {/* Today's rewards */}
      <RewardRow
        epochSummary={
          <EpochTime
            epoch={Number(checkpoints[0].epoch) + 1}
            epochStartTimeStamp={checkpoints[0].epochEndTimeStamp}
            epochEndTimeStamp={checkpoints[0].epochEndTimeStamp + ONE_DAY_IN_S}
          />
        }
        reward={formatReward(reward)}
        earned={isEligibleForRewards ? <EarnedTag /> : <NotYetEarnedTag />}
      />

      {checkpoints.map((checkpoint) => {
        return (
          <RewardRow
            key={checkpoint.epochEndTimeStamp}
            epochSummary={
              <EpochTime
                epoch={Number(checkpoint.epoch)}
                epochStartTimeStamp={checkpoint.epochStartTimeStamp}
                epochEndTimeStamp={checkpoint.epochEndTimeStamp}
                transactionHash={checkpoint.transactionHash}
              />
            }
            reward={formatReward(checkpoint.reward)}
            earned={checkpoint.earned ? <EarnedTag /> : <NotEarnedTag />}
          />
        );
      })}
    </Flex>
  );
};

// TODO: Refactor, only supports a single service for now
export const RewardsHistory = () => {
  const { contractCheckpoints, isError, isFetched, refetch } =
    useRewardsHistory();
  const { selectedService, selectedAgentConfig } = useServices();
  const { serviceNftTokenId } = useService(selectedService?.service_config_id);

  const history = useMemo(() => {
    if (!isFetched || !selectedService?.service_config_id) return <Loading />;
    if (isError) return <ErrorLoadingHistory refetch={refetch} />; // TODO: don't do this
    if (!contractCheckpoints) return <NoRewardsHistory />;
    if (Object.keys(contractCheckpoints).length === 0) {
      return <NoRewardsHistory />;
    }

    // find the recent contract address where the service has participated in
    const recentContractAddress = Object.values(contractCheckpoints)
      .flat()
      .sort((a, b) => b.epochEndTimeStamp - a.epochEndTimeStamp)
      .find((checkpoint) =>
        checkpoint.serviceIds.includes(`${serviceNftTokenId}`),
      )?.contractAddress;

    // most recent transaction staking contract at the top of the list
    const latestContractAddresses = Object.keys(contractCheckpoints).sort(
      (a, b) => {
        if (a === recentContractAddress) return -1;
        if (b === recentContractAddress) return 1;
        return 0;
      },
    );

    if (!selectedAgentConfig.evmHomeChainId) return null;

    return (
      <Flex vertical gap={16}>
        {latestContractAddresses.map((contractAddress: string) => {
          const checkpoints = contractCheckpoints[contractAddress];
          const [stakingProgramId] = Object.entries(
            STAKING_PROGRAM_ADDRESS[selectedAgentConfig.evmHomeChainId],
          ).find((entry) => {
            const [, stakingProxyAddress] = entry;
            return (
              stakingProxyAddress.toLowerCase() ===
              contractAddress.toLowerCase()
            );
          }) ?? [null, null];

          if (!stakingProgramId) return null;

          return (
            <ContractRewards
              key={contractAddress}
              stakingProgramId={stakingProgramId as StakingProgramId}
              checkpoints={checkpoints}
              selectedAgentConfig={selectedAgentConfig}
            />
          );
        })}
      </Flex>
    );
  }, [
    isFetched,
    selectedService?.service_config_id,
    isError,
    refetch,
    contractCheckpoints,
    selectedAgentConfig,
    serviceNftTokenId,
  ]);

  return (
    <ConfigProvider theme={yourWalletTheme}>
      <CardFlex
        bordered={false}
        title={<CardTitle title="Staking rewards history" />}
        noBodyPadding="true"
        extra={<GoToMainPageButton />}
      >
        {history}
      </CardFlex>
    </ConfigProvider>
  );
};
