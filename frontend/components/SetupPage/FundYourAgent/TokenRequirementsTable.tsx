import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import {
  Flex,
  Image as AntdImage,
  TableColumnsType,
  Tag,
  Typography,
} from 'antd';
import styled from 'styled-components';

import { CustomTable } from '@/components/ui/CustomTable';
import { COLOR } from '@/constants/colors';
import { useServices } from '@/hooks/useServices';

import { useGetRefillRequimentsWithMonthlyGas } from './hooks/useGetRefillRequirementsWithMonthlyGas';
import { useTokensFundingStatus } from './hooks/useTokensFundingStatus';

const { Text } = Typography;

const CustomTag = styled(Tag)<{ $isWaiting: boolean }>`
  color: ${({ $isWaiting }) =>
    $isWaiting ? COLOR.TEXT_NEUTRAL_TERTIARY : undefined};
  padding: 4px 10px;
  border-radius: 8px;
  border: none;
  line-height: 20px;
`;

type TokenRowData = {
  amount: number;
  symbol: string;
  iconSrc: string;
  status: 'Waiting' | 'Received';
};

const columns: TableColumnsType = [
  {
    title: 'Token',
    key: 'token',
    render: (_: unknown, record: TokenRowData) => (
      <Flex align="center" gap={8}>
        <AntdImage width={20} src={record.iconSrc} alt={record.symbol} />
        <Text>{record.symbol}</Text>
      </Flex>
    ),
  },
  {
    title: 'Amount',
    key: 'amount',
    render: (_: unknown, record: TokenRowData) => <Text>{record.amount}</Text>,
  },
  {
    title: 'Status',
    key: 'status',
    render: (_: unknown, record: TokenRowData) => {
      const isWaiting = record.status === 'Waiting';
      return (
        <CustomTag
          $isWaiting={isWaiting}
          color={!isWaiting ? COLOR.SUCCESS : undefined}
          icon={isWaiting ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
        >
          {record.status}
        </CustomTag>
      );
    },
  },
];

export const TokenRequirementsTable = () => {
  const { selectedAgentConfig } = useServices();
  const { initialTokenRequirements: tokenRequirements, isLoading } =
    useGetRefillRequimentsWithMonthlyGas({ selectedAgentConfig });
  const { tokenFundingStatus } = useTokensFundingStatus({
    selectedAgentConfig,
  });
  const tableRows: TokenRowData[] = (tokenRequirements ?? []).map((token) => ({
    ...token,
    status: tokenFundingStatus[token.symbol as keyof typeof tokenFundingStatus]
      ? 'Received'
      : 'Waiting',
  }));

  if (!isLoading && tableRows.length === 0) return null;

  return (
    <CustomTable
      dataSource={tableRows}
      columns={columns}
      loading={isLoading}
      pagination={false}
    />
  );
};
