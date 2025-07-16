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
import { ReactNode, useCallback, useMemo } from 'react';

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

const useTotalNativeTokenRequired = () => {
  const { isLoading: isServiceLoading, selectedAgentConfig } = useServices();
  const { masterEoa } = useMasterWalletContext();
  const { isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();

  const fromChainName = asMiddlewareChain(selectedAgentConfig.evmHomeChainId);
  const toChainId = asEvmChainId(selectedAgentConfig.middlewareHomeChainId);
  const fromChainId = onRampChainMap[fromChainName];
  const toChainConfig = TOKEN_CONFIG[toChainId];

  // State to control the force update of the bridge refill requirements API call
  // This is used when the user clicks on "Try again" button
  // to fetch the bridge refill requirements again.
  // NOTE: It is reset to false after the API call is made.
  // const [isForceUpdate, setIsForceUpdate] = useState(false);
  // const [
  //   isBridgeRefillRequirementsApiLoading,
  //   setIsBridgeRefillRequirementsApiLoading,
  // ] = useState(true);
  // const [
  //   canPollForBridgeRefillRequirements,
  //   setCanPollForBridgeRefillRequirements,
  // ] = useState(true);

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
    isError: isBridgeRefillRequirementsError,
    // isFetching: isBridgeRefillRequirementsFetching,
    refetch: refetchBridgeRefillRequirements,
  } = useBridgeRefillRequirements(
    bridgeParamsExceptNativeToken,
    // canPollForBridgeRefillRequirements,
  );

  const totalNativeTokenRequired = useMemo(() => {
    if (!bridgeParams) return;
    if (!bridgeFundingRequirements) return;
    if (!masterEoa?.address) return;

    const currentNativeToken = bridgeParams.bridge_requests.find(
      (request) => request.to.token === AddressZero,
    )?.to.amount;

    const nativeTokenToBridge =
      bridgeFundingRequirements.bridge_refill_requirements?.[fromChainName]?.[
        masterEoa?.address
      ]?.[AddressZero];
    if (!nativeTokenToBridge) return;

    return BigInt(nativeTokenToBridge) + BigInt(currentNativeToken || 0);
  }, [
    bridgeParams,
    bridgeFundingRequirements,
    masterEoa?.address,
    fromChainName,
  ]);

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

  const onRetry = useCallback(() => {
    refetchBridgeRefillRequirements();
  }, [refetchBridgeRefillRequirements]);

  return {
    isLoading:
      isServiceLoading ||
      isBalancesAndFundingRequirementsLoading ||
      isBridgeRefillRequirementsLoading,
    isError: isBridgeRefillRequirementsError,
    totalNativeToken: totalNativeTokenRequired
      ? formatUnitsToNumber(totalNativeTokenRequired, 18)
      : 0,
    receivingTokens,
    onRetry,
  };
};

// TODO: add real data fetching logic
const useTotalNativeTokenToFiatForPayment = () => {
  return {
    isLoading: true,
    totalUsd: 0.056,
  };
};

export const PayingReceivingTable = () => {
  const { selectedAgentConfig } = useServices();
  const {
    isLoading: isNativeTokenLoading,
    isError: isNativeTokenError,
    totalNativeToken,
    receivingTokens,
    onRetry,
  } = useTotalNativeTokenRequired();
  const { isLoading: isFiatLoading, totalUsd } =
    useTotalNativeTokenToFiatForPayment();

  const toChain = asEvmChainDetails(selectedAgentConfig.middlewareHomeChainId);

  const ethToTokenList = useMemo<PaymentTableDataType[]>(
    () => [
      {
        key: 'paying-receiving',
        paying: (
          <Flex vertical justify="center" gap={6}>
            {isNativeTokenError ? (
              <Button onClick={onRetry} icon={<ReloadOutlined />} size="small">
                Retry
              </Button>
            ) : (
              <>
                <Text>
                  {isFiatLoading ? <TokenLoader /> : totalUsd}&nbsp;USD
                </Text>
                <Text>
                  for&nbsp;
                  {isNativeTokenLoading ? <TokenLoader /> : totalNativeToken}
                  &nbsp;ETH
                </Text>
              </>
            )}
          </Flex>
        ),
        receiving: (
          <Flex vertical justify="center" gap={6}>
            {isNativeTokenLoading ? (
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
    [
      isNativeTokenLoading,
      isNativeTokenError,
      isFiatLoading,
      totalNativeToken,
      totalUsd,
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
