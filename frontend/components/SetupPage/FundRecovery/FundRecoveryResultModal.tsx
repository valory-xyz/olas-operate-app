import { Alert, Button, Flex, Modal, Typography } from 'antd';
import { useMemo } from 'react';

import { Table } from '@/components/ui';
import {
  ChainAmounts,
  FundRecoveryExecuteResponse,
} from '@/types/FundRecovery';

const { Title, Text } = Typography;

type FundsMovedRow = {
  key: string;
  chainId: string;
  address: string;
  token: string;
  amount: string;
};

const buildFundsMovedRows = (totalFundsMoved: ChainAmounts): FundsMovedRow[] =>
  Object.entries(totalFundsMoved).flatMap(([chainId, addressMap]) =>
    Object.entries(addressMap).flatMap(([address, tokenMap]) =>
      Object.entries(tokenMap)
        .filter(([, amount]) => amount !== '0' && amount !== '')
        .map(([token, amount]) => ({
          key: `${chainId}-${address}-${token}`,
          chainId,
          address,
          token,
          amount,
        })),
    ),
  );

const fundsMovedColumns = [
  {
    title: 'Chain',
    dataIndex: 'chainId',
    key: 'chainId',
  },
  {
    title: 'Token',
    dataIndex: 'token',
    key: 'token',
    render: (token: string) => (
      <Text ellipsis style={{ maxWidth: 120 }} title={token}>
        {token.startsWith('0x')
          ? `${token.slice(0, 6)}...${token.slice(-4)}`
          : token}
      </Text>
    ),
  },
  {
    title: 'Amount',
    dataIndex: 'amount',
    key: 'amount',
  },
];

type FundRecoveryResultModalProps = {
  result: FundRecoveryExecuteResponse | null;
  error: Error | null;
  open: boolean;
  onClose: () => void;
  onTryAgain: () => void;
};

export const FundRecoveryResultModal = ({
  result,
  error,
  open,
  onClose,
  onTryAgain,
}: FundRecoveryResultModalProps) => {
  const fundsMovedRows = useMemo(() => {
    if (!result) return [];
    return buildFundsMovedRows(result.total_funds_moved);
  }, [result]);

  const isSuccess = result?.success === true;
  const isPartialFailure = result?.partial_failure === true;
  const isError = !!error && !result;

  const title = useMemo(() => {
    if (isSuccess) return 'Funds recovered successfully';
    if (isPartialFailure) return 'Partial recovery';
    if (isError) return 'Recovery failed';
    return '';
  }, [isSuccess, isPartialFailure, isError]);

  const footer = useMemo(() => {
    if (isSuccess) {
      return (
        <Button type="primary" onClick={onClose}>
          Done
        </Button>
      );
    }
    if (isPartialFailure || isError) {
      return (
        <Flex gap={8} justify="flex-end">
          <Button onClick={onClose}>Close</Button>
          <Button type="primary" onClick={onTryAgain}>
            Try again
          </Button>
        </Flex>
      );
    }
    return null;
  }, [isSuccess, isPartialFailure, isError, onClose, onTryAgain]);

  return (
    <Modal
      open={open}
      title={
        <Title level={4} className="m-0">
          {title}
        </Title>
      }
      onCancel={onClose}
      footer={footer}
      width={560}
    >
      <Flex vertical gap={16} style={{ marginTop: 16 }}>
        {isSuccess && (
          <>
            <Alert
              type="success"
              showIcon
              message="All funds have been successfully recovered to your destination address."
            />
            {fundsMovedRows.length > 0 && (
              <Flex vertical gap={8}>
                <Text strong>Funds moved</Text>
                <Table<FundsMovedRow>
                  dataSource={fundsMovedRows}
                  columns={fundsMovedColumns}
                  pagination={false}
                  size="small"
                />
              </Flex>
            )}
          </>
        )}

        {isPartialFailure && (
          <>
            <Alert
              type="warning"
              showIcon
              message="Some funds could not be recovered. You can try again to recover the remaining funds."
            />
            {fundsMovedRows.length > 0 && (
              <Flex vertical gap={8}>
                <Text strong>Funds moved</Text>
                <Table<FundsMovedRow>
                  dataSource={fundsMovedRows}
                  columns={fundsMovedColumns}
                  pagination={false}
                  size="small"
                />
              </Flex>
            )}
            {result &&
              !result.success &&
              result.partial_failure &&
              result.errors.length > 0 && (
                <Flex vertical gap={8}>
                  <Text strong type="danger">
                    Errors
                  </Text>
                  {result.errors.map((err) => (
                    <Alert key={err} type="error" showIcon message={err} />
                  ))}
                </Flex>
              )}
          </>
        )}

        {isError && (
          <Alert
            type="error"
            showIcon
            message="An error occurred during recovery"
            description={error?.message ?? 'Unknown error'}
          />
        )}
      </Flex>
    </Modal>
  );
};
