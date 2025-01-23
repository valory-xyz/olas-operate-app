import { ApiOutlined, InboxOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Collapse, Flex, Spin, Typography } from 'antd';
import { isEmpty, isNull } from 'lodash';
import { CSSProperties, ReactNode, useContext, useMemo } from 'react';

import { COLOR } from '@/constants/colors';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { NA } from '@/constants/symbols';
import { OnlineStatusContext } from '@/context/OnlineStatusProvider';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';

import { CardTitle } from '../Card/CardTitle';
import { GoToMainPageButton } from '../Pages/GoToMainPageButton';

const { Text } = Typography;

const MIN_HEIGHT = 400;
const ICON_STYLE: CSSProperties = { fontSize: 48, color: COLOR.TEXT_LIGHT };
const CURRENT_ACTIVITY_STYLE: CSSProperties = {
  background: 'linear-gradient(180deg, #FCFCFD 0%, #EEF0F7 100%)',
};

const Container = ({ children }: { children: ReactNode }) => (
  <Flex
    vertical
    gap={16}
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

const ErrorLoadingData = ({ refetch }: { refetch: () => void }) => (
  <Container>
    <ApiOutlined style={ICON_STYLE} />
    <Text type="secondary">Error loading data</Text>
    <Button onClick={refetch}>Try again</Button>
  </Container>
);

const NoData = () => (
  <Container>
    <InboxOutlined style={ICON_STYLE} />
    <Text type="secondary">
      There&apos;s no previous agent activity recorded yet
    </Text>
  </Container>
);

export const AgentActivityPage = () => {
  const electronApi = useElectronApi();
  const { isOnline } = useContext(OnlineStatusContext);

  const { selectedService } = useServices();
  const { isServiceRunning } = useService(selectedService?.service_config_id);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: REACT_QUERY_KEYS.AGENT_ACTIVITY,
    queryFn: async () => {
      const result = await electronApi?.healthCheck?.();
      if (result && 'error' in result) throw new Error(result.error);
      return result;
    },
    select: (data) => {
      if (!data || !('response' in data) || !data.response) return null;

      // The latest activity should go at the top, so sort the rounds accordingly
      const rounds = [...(data.response?.rounds || [])].reverse();
      const roundsInfo = data.response?.rounds_info;
      return { rounds, roundsInfo };
    },
    enabled: isServiceRunning,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      if (query.state.error) return false; // Stop refetching when there's an error
      return isOnline ? FIVE_SECONDS_INTERVAL : false;
    },
  });

  const activity = useMemo(() => {
    if (isLoading) return <Loading />;
    if (isError) return <ErrorLoadingData refetch={refetch} />;
    if (!isServiceRunning) return <NoData />;
    if (isNull(data) || isEmpty(data)) return <NoData />;

    const items = data.rounds.map((item, index) => {
      const isCurrent = index === 0;
      const roundName = data.roundsInfo?.[item]?.name || item;
      return {
        key: `${item}-${index}`,
        label: isCurrent ? (
          <Flex vertical gap={4}>
            <Text type="secondary" className="text-xs">
              Current activity
            </Text>
            <Text className="text-sm loading-ellipses">{roundName}</Text>
          </Flex>
        ) : (
          <Text className="text-sm">{roundName}</Text>
        ),
        children: (
          <Text
            type="secondary"
            className="text-sm"
            style={{ marginLeft: '26px' }}
          >
            {data.roundsInfo?.[item]?.description || NA}
          </Text>
        ),
        style: isCurrent ? CURRENT_ACTIVITY_STYLE : undefined,
      };
    });

    return (
      <Collapse
        items={items}
        bordered={false}
        style={{ background: 'transparent' }}
      />
    );
  }, [data, isError, isLoading, isServiceRunning, refetch]);

  return (
    <Card
      title={<CardTitle title="Agent activity" />}
      bordered={false}
      styles={{ body: { padding: '1px 0 24px' } }}
      extra={<GoToMainPageButton />}
    >
      {activity}
    </Card>
  );
};
