import { CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  Button,
  Flex,
  Skeleton,
  Table,
  type TableProps,
  Typography,
} from 'antd';
import Image from 'next/image';
import { ReactNode, useEffect, useMemo } from 'react';

import { EvmChainId } from '@/constants/chains';
import { COLOR } from '@/constants/colors';
import { NA } from '@/constants/symbols';
import { useOnRampContext } from '@/hooks/useOnRampContext';
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

const TryAgain = ({ onRetry }: { onRetry: () => void }) => (
  <Flex vertical gap={8} align="flex-start">
    <CloseCircleOutlined style={{ color: COLOR.RED }} />
    <Text>Quote request failed</Text>
    <Button onClick={onRetry} icon={<ReloadOutlined />} size="small">
      Try again
    </Button>
  </Flex>
);

type ReceivingTokensProps = {
  receivingTokens: { amount: number; symbol?: string }[];
};
const ReceivingTokens = ({ receivingTokens }: ReceivingTokensProps) => (
  <Flex vertical justify="center" gap={6}>
    {receivingTokens.length === 0 ? (
      <Flex vertical gap={6}>
        <TokenLoader />
        <TokenLoader />
      </Flex>
    ) : (
      receivingTokens.map((token, index) => (
        <Text key={index}>{`${token?.amount} ${token?.symbol}`}</Text>
      ))
    )}
  </Flex>
);

type PaymentTableProps = { onRampChainId: EvmChainId };
export const PayingReceivingTable = ({ onRampChainId }: PaymentTableProps) => {
  const { selectedAgentConfig } = useServices();
  const {
    isOnRampingStepCompleted,
    usdAmountToPay,
    ethAmountToPay,
    updateUsdAmountToPay,
  } = useOnRampContext();
  const {
    isLoading: isNativeTokenLoading,
    hasError: hasNativeTokenError,
    totalNativeToken,
    receivingTokens,
    onRetry,
  } = useTotalNativeTokenRequired(onRampChainId);
  const { isLoading: isFiatLoading, data: fiatAmount } =
    useTotalFiatFromNativeToken(
      hasNativeTokenError ? undefined : totalNativeToken,
    );

  const isReceivingAmountLoading = isFiatLoading || isNativeTokenLoading;
  const receivingAmount = usdAmountToPay ? `~${usdAmountToPay} USD` : NA;
  const nativeTokenAmount = `for ${ethAmountToPay} ETH`;

  // Update the USD amount to pay only if the on-ramping step is not completed.
  useEffect(() => {
    if (isOnRampingStepCompleted) return;

    if (isReceivingAmountLoading || hasNativeTokenError) {
      updateUsdAmountToPay(null);
    } else if (fiatAmount) {
      updateUsdAmountToPay(fiatAmount);
    }
  }, [
    isOnRampingStepCompleted,
    isReceivingAmountLoading,
    hasNativeTokenError,
    fiatAmount,
    updateUsdAmountToPay,
  ]);

  const ethToTokenDataSource = useMemo<PaymentTableDataType[]>(
    () => [
      {
        key: 'paying-receiving',
        paying: (
          <>
            {hasNativeTokenError && !isNativeTokenLoading ? (
              <TryAgain onRetry={onRetry} />
            ) : (
              <Flex vertical justify="center" gap={6}>
                <Text>
                  {isReceivingAmountLoading ? <TokenLoader /> : receivingAmount}
                </Text>
                <Text>
                  {isNativeTokenLoading ? <TokenLoader /> : nativeTokenAmount}
                </Text>
              </Flex>
            )}
          </>
        ),
        receiving: <ReceivingTokens receivingTokens={receivingTokens} />,
      },
    ],
    [
      isNativeTokenLoading,
      hasNativeTokenError,
      nativeTokenAmount,
      receivingTokens,
      onRetry,
      receivingAmount,
      isReceivingAmountLoading,
    ],
  );

  const toChain = asEvmChainDetails(selectedAgentConfig.middlewareHomeChainId);

  return (
    <Table<PaymentTableDataType>
      columns={getColumns(toChain.name, toChain.displayName)}
      dataSource={ethToTokenDataSource}
      pagination={false}
      bordered
      style={{ width: '100%' }}
    />
  );
};
