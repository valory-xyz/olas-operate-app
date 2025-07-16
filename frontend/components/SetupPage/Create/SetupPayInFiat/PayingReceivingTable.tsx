import { Flex, Skeleton, Table, type TableProps, Typography } from 'antd';
import Image from 'next/image';
import { ReactNode, useMemo } from 'react';

import { getTokenDetails } from '@/components/Bridge/utils';
import { TOKEN_CONFIG } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useBridgeRefillRequirements } from '@/hooks/useBridgeRefillRequirements';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
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
const useNativeTokenRequired = () => {
  const { isLoading: isServiceLoading, selectedAgentConfig } = useServices();
  const { isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();
  const chainName = asMiddlewareChain(selectedAgentConfig.evmHomeChainId);
  const fromChainId = onRampChainMap[chainName];
  const toChainConfig =
    TOKEN_CONFIG[asEvmChainId(selectedAgentConfig.middlewareHomeChainId)];
  const { masterEoa } = useMasterWalletContext();

  const bridgeParams = useGetBridgeRequirementsParams(
    fromChainId,
    AddressZero,
  )();

  const bridgeParamsExceptNativeToken = useMemo(() => {
    if (!bridgeParams) return null;

    return {
      ...bridgeParams,
      bridge_requests: bridgeParams.bridge_requests.filter(
        (request) => request.to.token !== AddressZero,
      ),
    };
  }, [bridgeParams]);

  const {
    data: bridgeFundingRequirements,
    isLoading: isBridgeRefillRequirementsLoading,
    // isError: isBridgeRefillRequirementsError,
    // isFetching: isBridgeRefillRequirementsFetching,
    // refetch: refetchBridgeRefillRequirements,
  } = useBridgeRefillRequirements(bridgeParamsExceptNativeToken, false);

  // const totalNativeToken = bridgeParams?.bridge_requests.reduce((acc, request) => {
  //   const amount = BigInt(request.to.amount);
  //   const currentNativeToken = bridgeParams.bridge_requests.filter(
  //     (request) => request.to.token !== AddressZero,
  //   );
  //   const nativeTokenToBridge =
  //     bridgeFundingRequirements.bridge_refill_requirements?.[chainName]?.[
  //       masterEoa?.address
  //     ]?.[AddressZero];

  //   return (
  //     acc +
  //     (areAddressesEqual(request.to.token, AddressZero) ? amount : BigInt(0))
  //   );
  // }, BigInt(0));

  const totalNativeTokenRequired = useMemo(() => {
    if (!bridgeParams) return;
    if (!bridgeFundingRequirements) return;
    if (!masterEoa?.address) return;

    const currentNativeToken = bridgeParams.bridge_requests.find(
      (request) => request.to.token === AddressZero,
    )?.to.amount;

    const nativeTokenToBridge =
      bridgeFundingRequirements.bridge_refill_requirements?.[chainName]?.[
        masterEoa?.address
      ]?.[AddressZero];
    if (!nativeTokenToBridge) return;

    return BigInt(nativeTokenToBridge) + BigInt(currentNativeToken || 0);
  }, [bridgeParams, bridgeFundingRequirements, masterEoa?.address, chainName]);

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

  // console.log({
  //   receivingTokens,
  //   bridgeParamsExceptNativeToken,
  //   totalNativeTokenRequired,
  // });

  // console.log({
  //   fromChainId,
  //   toChainConfig,
  //   bridgeFundingRequirements,
  //   isBridgeRefillRequirementsLoading,
  //   isBridgeRefillRequirementsError,
  //   isBridgeRefillRequirementsFetching,
  // });

  return {
    isLoading:
      isServiceLoading ||
      isBalancesAndFundingRequirementsLoading ||
      isBridgeRefillRequirementsLoading,
    totalNativeToken: totalNativeTokenRequired
      ? formatUnitsToNumber(totalNativeTokenRequired, 18)
      : 0,
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
  const { isLoading, totalNativeToken, receivingTokens } =
    useNativeTokenRequired();
  const { isLoading: isUsdLoading, totalUsd } = useTotalEthToUsdToPay();
  const { selectedAgentConfig } = useServices();
  const toChain = asEvmChainDetails(selectedAgentConfig.middlewareHomeChainId);

  const ethToTokenList = useMemo<DataType[]>(
    () => [
      {
        key: 'paying-receiving',
        paying: (
          <Flex vertical justify="center" gap={6}>
            <Text>{isUsdLoading ? <TokenLoader /> : totalUsd}&nbsp;USD</Text>
            <Text>
              for&nbsp;
              {isLoading ? <TokenLoader /> : totalNativeToken}
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
    [isLoading, isUsdLoading, totalNativeToken, totalUsd, receivingTokens],
  );

  return (
    <Table<DataType>
      columns={getColumns(toChain.name, toChain.displayName)}
      dataSource={ethToTokenList}
      pagination={false}
      bordered
      style={{ width: '100%' }}
    />
  );
};
