import { CloseOutlined } from '@ant-design/icons';
import { Badge, Button, Card, Flex, List } from 'antd';

import { Pages } from '@/enums/PageState';
import { usePageState } from '@/hooks/usePageState';

import { CardTitle } from '../Card/CardTitle';
import { AGENT_ACTIVITIES } from './mockData';

export const AgentActivityPage = () => {
  const { goto } = usePageState();
  return (
    <Card
      title={<CardTitle title="Your agent's activity" />}
      bordered={false}
      extra={
        <Button
          size="large"
          icon={<CloseOutlined />}
          onClick={() => goto(Pages.Main)}
        />
      }
    >
      <List
        dataSource={AGENT_ACTIVITIES}
        renderItem={(item) => (
          <List.Item>
            <Flex gap={8}>
              <Badge color="#7E22CE" />
              {item}
            </Flex>
          </List.Item>
        )}
      />
    </Card>
  );
};
