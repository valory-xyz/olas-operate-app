import { CloseOutlined } from '@ant-design/icons';
import { Badge, Button, Card, Flex, List } from 'antd';
import { useState } from 'react';
import styled from 'styled-components';

import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

import { CardTitle } from '../Card/CardTitle';

const AGENT_ACTIVITIES = [
  {
    key: '1',
    label: 'Resetting and pausing before next period',
    children: 'Resets the state and pauses before the next period.',
  },
  {
    key: '2',
    label: 'Engaging in main operations',
    children: 'Engages in the main operation of the agent.',
  },
  {
    key: '3',
    label: 'Fetching meme tokens data',
    children: 'Fetches data about meme tokens from the blockchain or subgraph.',
  },
  {
    key: '4',
    label: 'Collecting feedback on tweets',
    children: 'Collects feedback from replies to the latest tweet.',
  },
  {
    key: '5',
    label: 'Posting a tweet',
    children: 'Creates and posts a new tweet.',
  },
  {
    key: '6',
    label: 'Loading the database',
    children: 'Loads the agent’s state from the database.',
  },
  {
    key: '7',
    label: 'Registering agents at startup',
    children: 'Initializes the agent registration process.',
  },
];

const CollapsibleContent = styled.div<{ isOpen: boolean }>`
  max-height: ${({ isOpen }) => (isOpen ? '200px' : '0')};
  overflow: hidden;
  transition: max-height 0.3s ease-out;
  margin-top: 10px;
`;

export const AgentActivityPage = () => {
  const { goto } = usePageState();

  const [activeKeys, setActiveKeys] = useState<string[]>([]);

  const togglePanel = (key: string) => {
    if (activeKeys.includes(key)) {
      setActiveKeys((keys) => keys.filter((activeKey) => activeKey !== key));
    } else {
      setActiveKeys((keys) => [...keys, key]);
    }
  };
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
        itemLayout="vertical"
        renderItem={(item) => (
          <List.Item>
            <Flex gap="0px 8px" wrap align="center">
              <Badge color="#7E22CE" />
              {item.label}
              <Button
                type="link"
                className="p-0"
                onClick={() => togglePanel(item.key)}
              >
                (Learn more)
              </Button>
            </Flex>
            <CollapsibleContent isOpen={activeKeys.includes(item.key)}>
              {item.children}
            </CollapsibleContent>
          </List.Item>
        )}
      />
    </Card>
  );
};
