import { ReloadOutlined } from '@ant-design/icons';
import {
  Button,
  Flex,
  Skeleton,
  Table,
  type TableProps,
  Typography,
} from 'antd';
import Image from 'next/image';
import { ReactNode, useMemo } from 'react';

import { NA } from '@/constants/symbols';
import { useServices } from '@/hooks/useServices';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';

import { useTotalFiatFromNativeToken } from './useTotalFiatFromNativeToken';
import { useTotalNativeTokenRequired } from './useTotalNativeTokenRequired';

const { Text } = Typography;

type PaymentTableDataType = {
  key: string;
  paying: ReactNode;
  receiving: ReactNode;
};

const getColumns = (
  chainName: string,
  chainDisplayName: string,
): TableProps<PaymentTableDataType>['columns'] => [
  {
    title: (
      <Flex justify="space-between" align="center">
        <Text>Paying</Text>
        <Image src="/wallet.png" width={24} height={24} alt="Paying" />
      </Flex>
    ),
    dataIndex: 'paying',
    key: 'paying',
    width: '50%',
    onCell: () => ({ style: { verticalAlign: 'top' } }),
  },
  {
    title: (
      <Flex justify="space-between" align="center">
        <Text>Receiving</Text>
        <Image
          src={`/chains/${chainName}-chain.png`}
          width={24}
          height={24}
          alt={chainDisplayName}
        />
      </Flex>
    ),
    dataIndex: 'receiving',
    key: 'receiving',
    width: '50%',
    onCell: () => ({ style: { verticalAlign: 'top' } }),
  },
];

const TokenLoader = () => (
  <Skeleton.Input
    size="small"
    active
    style={{ width: '80px !important', minWidth: '80px !important' }}
  />
);

const ReceivingTokensLoader = () => (
  <Flex vertical gap={6}>
    <TokenLoader />
    <TokenLoader />
  </Flex>
);

export const PayingReceivingTable = () => {
  const { selectedAgentConfig } = useServices();
  const {
    isLoading: isNativeTokenLoading,
    hasError: hasNativeTokenError,
    totalNativeToken,
    receivingTokens,
    onRetry,
  } = useTotalNativeTokenRequired();
  const { isLoading: isFiatLoading, data: onRampQuote } =
    useTotalFiatFromNativeToken(totalNativeToken);

  const toChain = asEvmChainDetails(selectedAgentConfig.middlewareHomeChainId);

  const ethToTokenList = useMemo<PaymentTableDataType[]>(
    () => [
      {
        key: 'paying-receiving',
        paying: (
          <>
            {hasNativeTokenError && !isNativeTokenLoading ? (
              <Button onClick={onRetry} icon={<ReloadOutlined />} size="small">
                Retry
              </Button>
            ) : (
              <Flex vertical justify="center" gap={6}>
                <Text>
                  {isFiatLoading || isNativeTokenLoading ? (
                    <TokenLoader />
                  ) : onRampQuote?.fiatAmount ? (
                    `~${onRampQuote?.fiatAmount} USD`
                  ) : (
                    NA
                  )}
                </Text>
                <Text>
                  for&nbsp;
                  {isNativeTokenLoading ? <TokenLoader /> : totalNativeToken}
                  &nbsp;ETH
                </Text>
              </Flex>
            )}
          </>
        ),
        receiving: (
          <Flex vertical justify="center" gap={6}>
            {receivingTokens.length === 0 ? (
              <ReceivingTokensLoader />
            ) : (
              receivingTokens.map((token, index) => (
                <Text key={index}>{`${token?.amount} ${token?.symbol}`}</Text>
              ))
            )}
          </Flex>
        ),
      },
    ],
    [
      isNativeTokenLoading,
      hasNativeTokenError,
      isFiatLoading,
      totalNativeToken,
      onRampQuote?.fiatAmount,
      receivingTokens,
      onRetry,
    ],
  );

  return (
    <Table<PaymentTableDataType>
      columns={getColumns(toChain.name, toChain.displayName)}
      dataSource={ethToTokenList}
      pagination={false}
      bordered
      style={{ width: '100%' }}
    />
  );
};
