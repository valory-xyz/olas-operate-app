import { Flex, List as AntdList, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import React from 'react';
import styled from 'styled-components';

import { TokenSymbolConfigMap } from '@/config/tokens';
import { COLOR, MiddlewareChain } from '@/constants';
import { CrossChainTransferDetails, TokenTransfer } from '@/types/Bridge';
import { asEvmChainDetails, formatUnitsToNumber } from '@/utils';

const { Text } = Typography;

const List = styled(AntdList<TokenTransfer>)`
  .ant-list-header {
    background-color: ${COLOR.BACKGROUND};
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
  }

  .ant-list-items .ant-list-item,
  .ant-list-header {
    padding: 12px 16px !important;
  }
`;

const TransferChain = ({ chainName }: { chainName: MiddlewareChain }) => {
  const { name, displayName } = asEvmChainDetails(chainName);
  return (
    <Flex gap={8} align="center" flex={1}>
      <Image
        src={`/chains/${kebabCase(name)}-chain.png`}
        alt={`${displayName} Chain`}
        width={20}
        height={20}
      />
      <Text className="text-sm">{displayName} Chain</Text>
    </Flex>
  );
};

const TransferringAndReceivingRow = ({
  isBridgeCompleted,
}: {
  isBridgeCompleted?: boolean;
}) => (
  <List.Item>
    <Flex className="w-full">
      <Text
        className="text-sm text-neutral-tertiary"
        style={{ flex: 1, textAlign: 'left' }}
      >
        You Sent
      </Text>
      <Text
        className="text-sm text-neutral-tertiary"
        style={{ flex: 1, textAlign: 'left' }}
      >
        {isBridgeCompleted ? 'You Received' : 'You Receive'}
      </Text>
    </Flex>
  </List.Item>
);

const TransferRow = ({ transfer }: { transfer: TokenTransfer }) => {
  const { fromAmount, fromSymbol, toSymbol, toAmount, decimals } = transfer;
  const fromIconSrc = TokenSymbolConfigMap[fromSymbol].image;
  const toIconSrc = TokenSymbolConfigMap[toSymbol].image;
  return (
    <List.Item>
      <Flex justify="space-between" className="w-full">
        <Flex flex={1} align="center" gap={8}>
          <Image src={fromIconSrc} alt={fromSymbol} width={20} height={20} />
          <Text>
            {formatUnitsToNumber(fromAmount, decimals, 5)} {fromSymbol}
          </Text>
        </Flex>
        <Flex flex={1} align="center" gap={8}>
          <Image src={toIconSrc} alt={toSymbol} width={20} height={20} />
          <Text>
            {formatUnitsToNumber(toAmount, decimals, 5)} {toSymbol}
          </Text>
        </Flex>
      </Flex>
    </List.Item>
  );
};

type BridgeTransferFlowProps = Omit<CrossChainTransferDetails, 'eta'> & {
  isBridgeCompleted?: boolean;
};

/**
 * Presentational component for the bridge transfer flow
 * showing the transfer details between two chains.
 */
export const BridgeTransferFlow = ({
  fromChain,
  toChain,
  transfers,
  isBridgeCompleted = false,
}: BridgeTransferFlowProps) => {
  return (
    <List
      dataSource={transfers}
      header={
        <Flex align="center" className="w-full">
          <TransferChain chainName={fromChain} />
          <TransferChain chainName={toChain} />
        </Flex>
      }
      renderItem={(transfer, index) => (
        <>
          {index === 0 && (
            <TransferringAndReceivingRow
              isBridgeCompleted={isBridgeCompleted}
            />
          )}
          <TransferRow transfer={transfer} />
        </>
      )}
      bordered
      size="small"
    />
  );
};
