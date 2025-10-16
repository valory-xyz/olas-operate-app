import { CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  Button,
  Flex,
  Image as AntdImage,
  Skeleton,
  type TableProps,
  Typography,
} from 'antd';
import { cloneDeep } from 'lodash';
import Image from 'next/image';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { CreditCardSvg } from '@/components/custom-icons/CreditCard';
import { Table } from '@/components/ui/Table';
import { EvmChainId } from '@/constants/chains';
import { COLOR } from '@/constants/colors';
import { NA } from '@/constants/symbols';
import { TokenSymbol, TokenSymbolConfigMap } from '@/constants/token';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useServices } from '@/hooks/useServices';
import { useTotalFiatFromNativeToken } from '@/hooks/useTotalFiatFromNativeToken';
import { useTotalNativeTokenRequired } from '@/hooks/useTotalNativeTokenRequired';
import { ReceivingTokens } from '@/types/Bridge';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';

const { Text } = Typography;

const TableWrapper = styled.div`
  .ant-table-thead {
    .ant-table-cell {
      padding: 12px 16px !important;

      &:first-child {
        border-top-left-radius: 8px;
        border-bottom-left-radius: 0;
      }

      &:last-child {
        border-top-right-radius: 8px;
        border-bottom-right-radius: 0;
      }
    }
  }

  .ant-table-cell:first-child {
    border-inline-end: none !important;
  }
`;

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
      <Flex align="center" gap={8}>
        <CreditCardSvg />
        <Text className="text-sm">Credit or Debit Card</Text>
      </Flex>
    ),
    dataIndex: 'paying',
    key: 'paying',
    width: '50%',
    onCell: () => ({ style: { verticalAlign: 'top' } }),
  },
  {
    title: (
      <Flex align="center" gap={8}>
        <ChainLogo chainName={chainName} alt={chainDisplayName} />
        <Text className="text-sm">Receiving</Text>
      </Flex>
    ),
    dataIndex: 'receiving',
    key: 'receiving',
    width: '50%',
    onCell: () => ({ style: { verticalAlign: 'top' } }),
  },
];

const TokenLoader = ({ size = 'small' }: { size?: 'small' | 'large' }) => (
  <Skeleton.Input
    size="small"
    active
    style={{ width: size === 'small' ? '80px' : '200px' }}
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

const ChainLogo = ({ chainName, alt }: { chainName: string; alt: string }) => (
  <Image
    width={20}
    height={20}
    src={`/chains/${chainName}-chain.png`}
    alt={alt}
  />
);

type ReceivingTokensProps = {
  receivingTokens: ReceivingTokens;
};
const ViewReceivingTokens = ({ receivingTokens }: ReceivingTokensProps) => (
  <Flex vertical justify="center" gap={16}>
    {receivingTokens.length === 0 ? (
      <Flex vertical gap={6}>
        <TokenLoader />
        <TokenLoader />
      </Flex>
    ) : (
      receivingTokens.map((token, index) => {
        const iconSrc =
          TokenSymbolConfigMap[token.symbol as TokenSymbol]?.image;
        return (
          <Flex key={index} align="center" gap={8}>
            <AntdImage
              src={iconSrc}
              alt={token.symbol}
              width={20}
              className="flex"
            />
            <Text>{`${token?.amount} ${token?.symbol}`}</Text>
          </Flex>
        );
      })
    )}
  </Flex>
);

type PaymentTableProps = { onRampChainId: EvmChainId };
export const PayingReceivingTable = ({ onRampChainId }: PaymentTableProps) => {
  const { selectedAgentConfig } = useServices();
  const {
    isOnRampingStepCompleted,
    isTransactionSuccessfulButFundsNotReceived,
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
  } = useTotalNativeTokenRequired(onRampChainId, 'preview');
  const { isLoading: isFiatLoading, data: fiatAmount } =
    useTotalFiatFromNativeToken(
      hasNativeTokenError ? undefined : totalNativeToken,
    );

  // State to hold the tokensRequired to be displayed in the receiving column
  // and update only if the on-ramping step is not completed already.
  const [tokensRequired, setTokensRequired] = useState<ReceivingTokens>();
  useEffect(() => {
    if (!receivingTokens) return;
    if (isTransactionSuccessfulButFundsNotReceived) return;
    if (isOnRampingStepCompleted) return;
    setTokensRequired(cloneDeep(receivingTokens));
  }, [
    isOnRampingStepCompleted,
    isTransactionSuccessfulButFundsNotReceived,
    receivingTokens,
  ]);

  const isReceivingAmountLoading = isFiatLoading || isNativeTokenLoading;

  // Update the USD amount to pay only if the on-ramping step is not completed.
  // Or if the transaction is successful but funds are not received.
  useEffect(() => {
    if (isOnRampingStepCompleted) return;
    if (isTransactionSuccessfulButFundsNotReceived) return;

    if (isReceivingAmountLoading || hasNativeTokenError) {
      updateUsdAmountToPay(null);
    } else if (fiatAmount) {
      updateUsdAmountToPay(fiatAmount);
    }
  }, [
    isTransactionSuccessfulButFundsNotReceived,
    isOnRampingStepCompleted,
    isReceivingAmountLoading,
    hasNativeTokenError,
    fiatAmount,
    updateUsdAmountToPay,
  ]);

  const ethToTokenDataSource = useMemo<PaymentTableDataType[]>(
    () => [
      {
        key: 'headers',
        paying: <Text className="text-sm text-neutral-tertiary">You Pay</Text>,
        receiving: (
          <Text className="text-sm text-neutral-tertiary">You Receive</Text>
        ),
      },
      {
        key: 'paying-receiving',
        paying: (
          <>
            {hasNativeTokenError && !isNativeTokenLoading ? (
              <TryAgain onRetry={onRetry} />
            ) : (
              <Flex align="center" gap={4}>
                {isReceivingAmountLoading || isNativeTokenLoading ? (
                  <TokenLoader size="large" />
                ) : (
                  <>
                    <Text>
                      {usdAmountToPay ? `~$${usdAmountToPay} for` : NA}
                    </Text>
                    <ChainLogo chainName="ethereum" alt="ETH" />
                    <Text>{`${ethAmountToPay} ETH`}</Text>
                  </>
                )}
              </Flex>
            )}
          </>
        ),
        receiving: tokensRequired ? (
          <ViewReceivingTokens receivingTokens={tokensRequired} />
        ) : null,
      },
    ],
    [
      isNativeTokenLoading,
      hasNativeTokenError,
      ethAmountToPay,
      usdAmountToPay,
      tokensRequired,
      onRetry,
      isReceivingAmountLoading,
    ],
  );

  const toChain = asEvmChainDetails(selectedAgentConfig.middlewareHomeChainId);

  return (
    <TableWrapper>
      <Table<PaymentTableDataType>
        columns={getColumns(toChain.name, toChain.displayName)}
        dataSource={ethToTokenDataSource}
        pagination={false}
        bordered
        $noBorder={false}
      />
    </TableWrapper>
  );
};
