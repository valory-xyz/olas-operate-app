import { ClockCircleOutlined } from '@ant-design/icons';
import { Flex, Image as AntdImage, Tag, Typography } from 'antd';
import styled from 'styled-components';

import { CustomTable } from '@/components/ui/CustomTable';
import { COLOR } from '@/constants/colors';
import { useServices } from '@/hooks/useServices';

import { useGetRefillRequimentsWithMonthlyGas } from './hooks/useGetRefillRequirementsWithMonthlyGas';
import { useTokensFundingStatus } from './hooks/useTokensFundingStatus';

const { Text } = Typography;

const WaitingTag = styled(Tag)`
  color: ${COLOR.TEXT_NEUTRAL_TERTIARY};
  padding: 4px 10px;
  border-radius: 8px;
  border: none;
  line-height: 20px;
`;

export const TokenRequirementsTable = () => {
  const { selectedAgentConfig } = useServices();
  const { tokenRequirements, isLoading } = useGetRefillRequimentsWithMonthlyGas(
    { selectedAgentConfig },
  );
  const { isFullyFunded, tokenFundingStatus } = useTokensFundingStatus({
    selectedAgentConfig,
  });

  console.log('tokenFundingStatus', tokenFundingStatus);
  console.log('isFullyFunded', isFullyFunded);

  const data = (tokenRequirements ?? []).map((token) => ({
    ...token,
    status: 'Waiting',
  }));

  const columns = [
    {
      title: 'Token',
      render: (_: unknown, record: (typeof data)[number]) => (
        <Flex align="center" gap={8}>
          <AntdImage width={20} src={record.iconSrc} alt={record.symbol} />
          <Text>{record.symbol}</Text>
        </Flex>
      ),
    },
    {
      title: 'Amount',
      render: (_: unknown, record: (typeof data)[number]) => (
        <Text>{record.amount}</Text>
      ),
    },
    {
      title: 'Status',
      render: () => (
        <WaitingTag icon={<ClockCircleOutlined />}>Waiting</WaitingTag>
      ),
    },
  ];

  return (
    <CustomTable
      dataSource={data}
      columns={columns}
      loading={isLoading}
      pagination={false}
    />
  );
};
