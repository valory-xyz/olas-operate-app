import { CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Flex, Skeleton, type TableProps, Typography } from 'antd';
import { cloneDeep } from 'lodash';
import Image from 'next/image';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { TbCreditCardFilled } from 'react-icons/tb';
import styled from 'styled-components';

import { Table } from '@/components/ui/Table';
import {
  COLOR,
  EvmChainId,
  NA,
  onRampChainMap,
  TokenSymbol,
  TokenSymbolConfigMap,
} from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import {
  useGetBridgeRequirementsParamsFromDeposit,
  useOnRampContext,
  useServices,
  useTotalFiatFromNativeToken,
  useTotalNativeTokenRequired,
} from '@/hooks';
import { ReceivingTokens } from '@/types/Bridge';
import { asEvmChainDetails, asMiddlewareChain, isNonEmpty } from '@/utils';

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

type PaymentTableProps = { onRampChainId: EvmChainId };
export const PayingReceivingTable = ({ onRampChainId }: PaymentTableProps) => {
  const { selectedAgentConfig } = useServices();
  const {
    isOnRampingStepCompleted,
    isTransactionSuccessfulButFundsNotReceived,
    updateUsdAmountToPay,
    isDepositFlow,
    usdAmountToPay,
    ethAmountToPay,
  } = useOnRampContext();
  const { walletChainId } = usePearlWallet();

  // Deposit flow: determine on-ramp chain from wallet chain using onRampChainMap
  // Onboarding flow: use provided onRampChainId
  const effectiveOnRampChainId = useMemo(() => {
    if (isDepositFlow && walletChainId) {
      const destinationChainName = asMiddlewareChain(walletChainId);
      return onRampChainMap[destinationChainName];
    }
    return onRampChainId;
  }, [isDepositFlow, walletChainId, onRampChainId]);
  const destinationChainId = isDepositFlow ? walletChainId : undefined;

  const getBridgeRequirementsParamsFromDeposit =
    useGetBridgeRequirementsParamsFromDeposit(
      effectiveOnRampChainId,
      destinationChainId || undefined,
    );
  const {
    isLoading: isNativeTokenLoading,
    hasError: hasNativeTokenError,
    totalNativeToken,
    receivingTokens,
    onRetry,
  } = useTotalNativeTokenRequired(
    effectiveOnRampChainId,
    isDepositFlow ? 'depositing' : 'onboarding',
    isDepositFlow ? getBridgeRequirementsParamsFromDeposit : undefined,
  );
  const { isLoading: isFiatLoading, data: fiatAmount } =
    useTotalFiatFromNativeToken(
      hasNativeTokenError ? undefined : totalNativeToken,
      destinationChainId || undefined,
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

    if (hasNativeTokenError) {
      updateUsdAmountToPay(null);
    } else if (fiatAmount) {
      updateUsdAmountToPay(fiatAmount);
    }
  }, [
    isTransactionSuccessfulButFundsNotReceived,
    isOnRampingStepCompleted,
    hasNativeTokenError,
    fiatAmount,
    updateUsdAmountToPay,
  ]);

  const tokensToDisplay = useMemo(
    () => (isDepositFlow ? receivingTokens : tokensRequired),
    [isDepositFlow, receivingTokens, tokensRequired],
  );

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
        receiving: isNonEmpty(tokensToDisplay) ? (
          <ViewReceivingTokens receivingTokens={tokensToDisplay} />
        ) : null,
      },
    ],
    [
      hasNativeTokenError,
      isNativeTokenLoading,
      onRetry,
      isReceivingAmountLoading,
      usdAmountToPay,
      ethAmountToPay,
      tokensToDisplay,
    ],
  );

  // For deposit flow, use walletChainId; for setup flow, use agent's home chain
  const toChain = useMemo(() => {
    if (isDepositFlow && walletChainId) {
      return asEvmChainDetails(asMiddlewareChain(walletChainId));
    }
    return asEvmChainDetails(
      isDepositFlow && walletChainId
        ? asMiddlewareChain(walletChainId)
        : selectedAgentConfig.middlewareHomeChainId,
    );
  }, [isDepositFlow, walletChainId, selectedAgentConfig.middlewareHomeChainId]);

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
