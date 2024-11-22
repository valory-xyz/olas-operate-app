import {
  ApiOutlined,
  CloseOutlined,
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

import { MiddlewareChain } from '@/client';
import { CardTitle } from '@/components/Card/CardTitle';
import { CardFlex } from '@/components/styled/CardFlex';
import { STAKING_PROGRAM_ADDRESS } from '@/config/stakingPrograms';
import { COLOR } from '@/constants/colors';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { EXPLORER_URL } from '@/constants/urls';
import { Pages } from '@/enums/Pages';
import { StakingProgramId } from '@/enums/StakingProgram';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { balanceFormat } from '@/utils/numberFormatters';
import { formatToMonthDay, formatToShortDateTime } from '@/utils/time';

import { Checkpoint, useRewardsHistory } from '../../hooks/useRewardsHistory';
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

const EpochTime = ({ epoch }: { epoch: EpochDetails }) => {
  const timePeriod = useMemo(() => {
    if (epoch.epochStartTimeStamp && epoch.epochEndTimeStamp) {
      return `${formatToShortDateTime(epoch.epochStartTimeStamp * 1000)} - ${formatToShortDateTime(epoch.epochEndTimeStamp * 1000)} (UTC)`;
    }
    if (epoch.epochStartTimeStamp) {
      return `${formatToMonthDay(epoch.epochStartTimeStamp * 1000)} (UTC)`;
    }
    return 'NA';
  }, [epoch]);

  return (
    <Text type="secondary">
      {formatToMonthDay(epoch.epochEndTimeStamp * 1000)}
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
            <a
              href={`${EXPLORER_URL[MiddlewareChain.OPTIMISM]}/tx/${epoch.transactionHash}`}
              target="_blank"
            >
              End of epoch transaction {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </a>
          </Flex>
        }
      >
        <InfoCircleOutlined />
      </Popover>
    </Text>
  );
};

type ContractRewardsProps = {
  stakingProgramId: StakingProgramId;
  checkpoints: Checkpoint[];
};

const ContractRewards = ({ checkpoints }: ContractRewardsProps) => {
  const { activeStakingProgramMeta } = useStakingProgram();

  return (
    <Flex vertical>
      <ContractName>
        <Text strong>{activeStakingProgramMeta?.name}</Text>
      </ContractName>

      {checkpoints.map((checkpoint) => {
        const currentEpochReward = checkpoint.reward
          ? `~${balanceFormat(checkpoint.reward ?? 0, 2)} OLAS`
          : '0 OLAS';

        return (
          <EpochRow key={checkpoint.epochEndTimeStamp}>
            <Col span={6}>
              <EpochTime epoch={checkpoint} />
            </Col>
            <Col span={11} className="text-right pr-16">
              <Text type="secondary">{currentEpochReward}</Text>
            </Col>
            <Col span={7} className="text-center pl-16">
              {checkpoint.earned ? <EarnedTag /> : <NotEarnedTag />}
            </Col>
          </EpochRow>
        );
      })}
    </Flex>
  );
};

export const RewardsHistory = () => {
  const { contractCheckpoints, isError, isLoading, isFetching, refetch } =
    useRewardsHistory();
  const { goto } = usePageState();
  const { selectedService } = useServices();
  const serviceId = selectedService?.service_config_id;
  const chainId = selectedService?.home_chain_id;

  const history = useMemo(() => {
    if (isLoading || isFetching || !serviceId) return <Loading />;
    if (isError) return <ErrorLoadingHistory refetch={refetch} />;
    if (!contractCheckpoints) return <NoRewardsHistory />;
    if (Object.keys(contractCheckpoints).length === 0) {
      return <NoRewardsHistory />;
    }

    // find the recent contract address where the service has participated in
    const recentContractAddress = Object.values(contractCheckpoints)
      .flat()
      .sort((a, b) => b.epochEndTimeStamp - a.epochEndTimeStamp)
      .find((checkpoint) =>
        checkpoint.serviceIds.includes(`${serviceId}`),
      )?.contractAddress;

    // most recent transaction staking contract at the top of the list
    const latestContractAddresses = Object.keys(contractCheckpoints).sort(
      (a, b) => {
        if (a === recentContractAddress) return -1;
        if (b === recentContractAddress) return 1;
        return 0;
      },
    );

    if (!chainId) return null;

    return (
      <Flex vertical gap={16}>
        {latestContractAddresses.map((contractAddress: string) => {
          const checkpoints = contractCheckpoints[contractAddress];
          const [stakingProgramId] = Object.entries(
            STAKING_PROGRAM_ADDRESS[chainId],
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
            />
          );
        })}
      </Flex>
    );
  }, [
    isLoading,
    isFetching,
    isError,
    serviceId,
    chainId,
    contractCheckpoints,
    refetch,
  ]);

  return (
    <ConfigProvider theme={yourWalletTheme}>
      <CardFlex
        bordered={false}
        title={<CardTitle title="Staking rewards history" />}
        noBodyPadding="true"
        extra={
          <Button
            size="large"
            icon={<CloseOutlined />}
            onClick={() => goto(Pages.Main)}
          />
        }
      >
        {history}
      </CardFlex>
    </ConfigProvider>
  );
};
