import { Flex, Skeleton, Table, type TableProps, Typography } from 'antd';
import Image from 'next/image';
import { ReactNode, useMemo } from 'react';

import { getTokenDetails } from '@/components/Bridge/utils';
import { TOKEN_CONFIG } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useBridgeRefillRequirements } from '@/hooks/useBridgeRefillRequirements';
import { useServices } from '@/hooks/useServices';
import {
  asEvmChainDetails,
  asEvmChainId,
  asMiddlewareChain,
} from '@/utils/middlewareHelpers';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

import { useGetBridgeRequirementsParams } from '../hooks/useGetBridgeRequirementsParams';
import { onRampChainMap } from './constants';

const { Text } = Typography;

type DataType = {
  key: string;
  paying: ReactNode;
  receiving: ReactNode;
};

const getColumns = (
  chainName: string,
  chainDisplayName: string,
): TableProps<DataType>['columns'] => [
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

// TODO: add real data fetching logic
const useEthToTokens = () => {
  const { isLoading: isServiceLoading, selectedAgentConfig } = useServices();
  const { isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();
  const fromChainId =
    onRampChainMap[asMiddlewareChain(selectedAgentConfig.evmHomeChainId)];
  const toChainConfig =
    TOKEN_CONFIG[asEvmChainId(selectedAgentConfig.middlewareHomeChainId)];

  const bridgeParams = useGetBridgeRequirementsParams(
    fromChainId,
    AddressZero,
  )();

  // TODO: avoid the ETH in bridgeParams and add it in the total ETH (basically zero address)

  const {
    data: bridgeFundingRequirements,
    isLoading: isBridgeRefillRequirementsLoading,
    isError: isBridgeRefillRequirementsError,
    isFetching: isBridgeRefillRequirementsFetching,
    // refetch: refetchBridgeRefillRequirements,
  } = useBridgeRefillRequirements(bridgeParams, false);

  const receivingTokens = useMemo(() => {
    if (!bridgeParams) return [];

    return bridgeParams.bridge_requests.map((request) => {
      const toToken = request.to.token;
      const amount = request.to.amount;
      const token = getTokenDetails(toToken, toChainConfig);
      return {
        amount: formatUnitsToNumber(amount, token?.decimals),
        symbol: token?.symbol,
      };
    });
  }, [bridgeParams, toChainConfig]);

  console.log(receivingTokens);

  // window.console.log({
  //   fromChainId,
  //   toChainConfig,
  //   bridgeFundingRequirements,
  //   isBridgeRefillRequirementsLoading,
  //   isBridgeRefillRequirementsError,
  //   isBridgeRefillRequirementsFetching,
  // });

  return {
    isLoading: isServiceLoading || isBalancesAndFundingRequirementsLoading,
    totalEth: 0.056, // TODO
    receivingTokens,
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
  const { isLoading, totalEth, receivingTokens } = useEthToTokens();
  const { isLoading: isUsdLoading, totalUsd } = useTotalEthToUsdToPay();
  const { selectedAgentConfig } = useServices();
  const toChain = asEvmChainDetails(selectedAgentConfig.middlewareHomeChainId);

  const ethToTokenList = useMemo<DataType[]>(
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
        receiving: (
          <Flex vertical justify="center" gap={6}>
            {isLoading ? (
              <TokenLoader />
            ) : (
              receivingTokens.map((token, index) => (
                <Text key={index}>{`${token?.amount} ${token?.symbol}`}</Text>
              ))
            )}
          </Flex>
        ),
      },
    ],
    [isLoading, isUsdLoading, totalEth, totalUsd, receivingTokens],
  );

  return (
    <Table<DataType>
      columns={getColumns(toChain.name, toChain.displayName)}
      dataSource={ethToTokenList}
      pagination={false}
      bordered
      style={{ width: '100%', alignSelf: 'flex-start' }}
    />
  );
};
