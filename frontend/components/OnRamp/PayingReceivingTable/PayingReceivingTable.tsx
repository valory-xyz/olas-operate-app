import { CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Flex, Skeleton, type TableProps, Typography } from 'antd';
import { cloneDeep } from 'lodash';
import Image from 'next/image';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { TbCreditCardFilled } from 'react-icons/tb';
import styled from 'styled-components';

import { Table } from '@/components/ui/Table';
import { TokenSymbol, TokenSymbolConfigMap } from '@/config/tokens';
import { EvmChainId } from '@/constants/chains';
import { COLOR } from '@/constants/colors';
import { NA } from '@/constants/symbols';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useTotalFiatFromNativeToken } from '@/hooks/useTotalFiatFromNativeToken';
import { useTotalNativeTokenRequired } from '@/hooks/useTotalNativeTokenRequired';
import { ReceivingTokens } from '@/types/Bridge';
import {
  asAllMiddlewareChain,
  asEvmChainDetails,
} from '@/utils/middlewareHelpers';

import { GetOnRampRequirementsParams, OnRampMode } from '../types';

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
  toChainName: string,
  toChainDisplayName: string,
): TableProps<PaymentTableDataType>['columns'] => [
  {
    title: (
      <Flex align="center" gap={8}>
        <TbCreditCardFilled size={20} />
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
        <ChainLogo chainName={toChainName} alt={toChainDisplayName} />
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
        const icon = TokenSymbolConfigMap[token.symbol as TokenSymbol];
        if (!icon?.image || !token.symbol) return null;

        return (
          <Flex key={index} align="center" gap={8}>
            <Image src={icon.image} alt={token.symbol} width={20} height={20} />
            <Text>{`${token?.amount} ${token.symbol}`}</Text>
          </Flex>
        );
      })
    )}
  </Flex>
);

type PaymentTableProps = {
  onRampChainId: EvmChainId;
  mode: OnRampMode;
  getOnRampRequirementsParams: GetOnRampRequirementsParams;
};
export const PayingReceivingTable = ({
  onRampChainId,
  mode,
  getOnRampRequirementsParams,
}: PaymentTableProps) => {
  const { selectedChainId } = useOnRampContext();
  const {
    isOnRampingStepCompleted,
    isTransactionSuccessfulButFundsNotReceived,
    usdAmountToPay,
    nativeAmountToPay,
    updateUsdAmountToPay,
  } = useOnRampContext();

  if (!selectedChainId) {
    throw new Error('Selected chain ID is not set in the on-ramp context');
  }

  const {
    isLoading: isNativeTokenLoading,
    hasError: hasNativeTokenError,
    totalNativeToken,
    receivingTokens,
    onRetry,
  } = useTotalNativeTokenRequired(
    onRampChainId,
    selectedChainId,
    getOnRampRequirementsParams,
    mode,
  );
  const { isLoading: isFiatLoading, data: fiatAmount } =
    useTotalFiatFromNativeToken({
      nativeTokenAmount: hasNativeTokenError ? undefined : totalNativeToken,
      selectedChainId,
    });

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
  const fromChain = asEvmChainDetails(asAllMiddlewareChain(onRampChainId));

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

  const payingReceivingDataSource = useMemo<PaymentTableDataType[]>(
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
                  <Flex vertical gap={4} align="flex-start">
                    <Text>
                      {usdAmountToPay ? `~$${usdAmountToPay} for` : NA}
                    </Text>

                    <Flex align="center" gap={6}>
                      <ChainLogo
                        chainName={fromChain.name}
                        alt={fromChain.displayName}
                      />
                      <Text>{`${nativeAmountToPay} ${fromChain.symbol}`}</Text>
                    </Flex>
                  </Flex>
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
      nativeAmountToPay,
      usdAmountToPay,
      tokensRequired,
      onRetry,
      isReceivingAmountLoading,
      fromChain,
    ],
  );

  const toChain = asEvmChainDetails(asAllMiddlewareChain(selectedChainId));

  return (
    <TableWrapper>
      <Table<PaymentTableDataType>
        columns={getColumns(toChain.name, toChain.displayName)}
        dataSource={payingReceivingDataSource}
        pagination={false}
        bordered
        $noBorder={false}
      />
    </TableWrapper>
  );
};
