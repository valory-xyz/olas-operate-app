import { Button, Card, Flex, Table, Typography } from 'antd';
import Image from 'next/image';

const { Text } = Typography;

const AgentBranding = () => {
  return (
    <Flex>
      <Image src="" alt="logo" />
      <Flex dir="column">
        <Text>Agent Name</Text>
        <Text>Agent Description</Text>
      </Flex>
    </Flex>
  );
};

const AgentIdentity = () => {
  return (
    <Flex>
      <Image src="" alt="" />
      <Text>Agent ID</Text>
      <Text>Agent Address</Text>
    </Flex>
  );
};

const AgentActivityHeader = () => {
  return (
    <Flex justify="space-between">
      <AgentBranding />
      <AgentIdentity />
    </Flex>
  );
};

const PortfolioAggregationCard = () => {
  return (
    <Card>
      <Flex dir="column" justify="center">
        <Typography.Title level={3}>Portfolio</Typography.Title>
        <Typography.Title level={1}>$x,xxx.xx</Typography.Title>
        <Button size="small" disabled={true}>
          See breakdown
        </Button>
      </Flex>
    </Card>
  );
};

const allocationColumns = [
  {
    title: 'Pool',
    dataIndex: 'pool',
    key: 'pool',
  },
  {
    title: 'Details',
    dataIndex: 'details',
    key: 'details',
  },
  {
    title: 'APR',
    dataIndex: 'apr',
    key: 'apr',
  },
];

const allocationData = [
  {
    key: '1',
    pool: 'Pool 1',
    details: 'Details 1',
    apr: 'APR 1',
  },
  {
    key: '2',
    pool: 'Pool 2',
    details: 'Details 2',
    apr: 'APR 2',
  },
];

const AllocationCard = () => {
  return (
    <Card>
      <Table dataSource={allocationData} columns={allocationColumns} />
    </Card>
  );
};

export const AgentActivityWindow = () => {
  return (
    <>
      <AgentActivityHeader />
      <PortfolioAggregationCard />
      <AllocationCard />
    </>
  );
};
