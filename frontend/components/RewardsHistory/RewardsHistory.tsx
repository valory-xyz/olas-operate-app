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

import { CardTitle } from '@/components/Card/CardTitle';
import { CardFlex } from '@/components/styled/CardFlex';
import { COLOR } from '@/constants/colors';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { Pages } from '@/enums/PageState';
import { usePageState } from '@/hooks/usePageState';
import { balanceFormat } from '@/utils/numberFormatters';
import { formatToMonthDay, formatToShortDateTime } from '@/utils/time';

import { useRewardsHistory } from '../../hooks/useRewardsHistory';
import { EpochDetails, StakingReward } from './types';

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
              href={`https://gnosisscan.io/tx/${epoch.transactionHash}`}
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

type ContractRewardsHistoryProps = { contract: StakingReward };
const ContractRewards = ({ contract }: ContractRewardsHistoryProps) => (
  <Flex vertical>
    <ContractName>
      <Text strong>{contract.name}</Text>
    </ContractName>

    {contract.history.map((epoch) => {
      const currentEpochReward = epoch.reward
        ? `~${balanceFormat(epoch.reward ?? 0, 2)} OLAS`
        : '0 OLAS';

      return (
        <EpochRow key={epoch.epochEndTimeStamp}>
          <Col span={6}>
            <EpochTime epoch={epoch} />
          </Col>
          <Col span={11} className="text-right pr-16">
            <Text type="secondary">{currentEpochReward}</Text>
          </Col>
          <Col span={7} className="text-center pl-16">
            {epoch.earned ? <EarnedTag /> : <NotEarnedTag />}
          </Col>
        </EpochRow>
      );
    })}
  </Flex>
);

export const RewardsHistory = () => {
  const { rewards, isError, isLoading, isFetching, refetch } =
    useRewardsHistory();
  const { goto } = usePageState();

  const history = useMemo(() => {
    if (isLoading || isFetching) return <Loading />;
    if (isError) return <ErrorLoadingHistory refetch={refetch} />;
    if (!rewards) return <NoRewardsHistory />;
    if (rewards.length === 0) return <NoRewardsHistory />;
    return (
      <Flex vertical gap={16}>
        {rewards.map((reward) => (
          <ContractRewards key={reward.id} contract={reward} />
        ))}
      </Flex>
    );
  }, [isLoading, isFetching, isError, rewards, refetch]);

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
