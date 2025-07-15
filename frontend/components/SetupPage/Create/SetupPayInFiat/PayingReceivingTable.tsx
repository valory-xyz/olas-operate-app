import { Flex, Skeleton, Table, type TableProps, Typography } from 'antd';
import { ReactNode, useMemo } from 'react';

import { TOKEN_CONFIG } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { useBridgeRefillRequirements } from '@/hooks/useBridgeRefillRequirements';
import { useServices } from '@/hooks/useServices';
import { asEvmChainId, asMiddlewareChain } from '@/utils/middlewareHelpers';

import { useGetBridgeRequirementsParams } from '../hooks/useGetBridgeRequirementsParams';
import { onRampChainMap } from './constants';

const { Text } = Typography;

type DataType = {
  key: string;
  paying: ReactNode;
  receiving: ReactNode;
};

const TokenLoader = () => (
  <Skeleton.Input
    size="small"
    style={{ width: '80px !important', minWidth: '80px !important' }}
  />
);

const columns: TableProps<DataType>['columns'] = [
  {
    title: 'Paying', // TODO: add icon
    dataIndex: 'paying',
    key: 'paying',
    width: '50%',
  },
  {
    title: 'Receiving', // TODO: add icon
    dataIndex: 'receiving',
    key: 'receiving',
    width: '50%',
  },
];

// TODO: add real data fetching logic
const useTotalEthToPay = () => {
  return {
    isLoading: true,
    totalEth: 0.056,
  };
};

// TODO: add real data fetching logic
const useTotalEthToUsdToPay = () => {
  return {
    isLoading: true,
    totalUsd: 0.056,
  };
};

export const PayingReceivingTable = () => {
  const { isLoading, totalEth } = useTotalEthToPay();
  const { isLoading: isUsdLoading, totalUsd } = useTotalEthToUsdToPay();

  const { selectedAgentConfig } = useServices();
  const fromChainId =
    onRampChainMap[asMiddlewareChain(selectedAgentConfig.evmHomeChainId)];
  const toChainConfig =
    TOKEN_CONFIG[asEvmChainId(selectedAgentConfig.middlewareHomeChainId)];

  const bridgeParams = useGetBridgeRequirementsParams(
    fromChainId,
    AddressZero,
  )();

  const {
    data: bridgeFundingRequirements,
    isLoading: isBridgeRefillRequirementsLoading,
    isError: isBridgeRefillRequirementsError,
    isFetching: isBridgeRefillRequirementsFetching,
    // refetch: refetchBridgeRefillRequirements,
  } = useBridgeRefillRequirements(bridgeParams);

  window.console.log({
    fromChainId,
    toChainConfig,
    bridgeFundingRequirements,
    isBridgeRefillRequirementsLoading,
    isBridgeRefillRequirementsError,
    isBridgeRefillRequirementsFetching,
  });

  const data = useMemo<DataType[]>(
    () => [
      {
        key: '1',
        paying: (
          <Flex vertical justify="center" gap={6}>
            <Text>{isUsdLoading ? <TokenLoader /> : totalUsd}&nbsp;USD</Text>
            <Text>
              for&nbsp;
              {isLoading ? <TokenLoader /> : totalEth}
              &nbsp;ETH
            </Text>
          </Flex>
        ),
        receiving: '~35.39 USD for 0.06 ETH',
      },
    ],
    [isLoading, isUsdLoading, totalEth, totalUsd],
  );

  return (
    <Table
      columns={columns}
      dataSource={data}
      pagination={false}
      bordered
      style={{ width: '100%', alignSelf: 'flex-start' }}
    />
  );
};
