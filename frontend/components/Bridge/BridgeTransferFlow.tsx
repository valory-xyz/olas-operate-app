import { Flex, Image, List, Typography } from 'antd';
import { kebabCase } from 'lodash';
import React from 'react';
import styled from 'styled-components';

import { MiddlewareChain } from '@/client';
import { COLOR } from '@/constants/colors';
import { TokenSymbolConfigMap } from '@/constants/token';
import { CrossChainTransferDetails, TokenTransfer } from '@/types/Bridge';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

const { Text } = Typography;

const StyledList = styled(List)`
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

const TransferChain = ({ chainName }: { chainName: MiddlewareChain }) => (
  <Flex gap={8} align="center" style={{ width: '50%' }}>
    <Image
      src={`/chains/${kebabCase(asEvmChainDetails(chainName).name)}-chain.png`}
      width={20}
      alt="chain logo"
      style={{ display: 'flex' }}
    />
    <Text className="text-sm">
      {asEvmChainDetails(chainName).displayName} Chain
    </Text>
  </Flex>
);

const TransferringAndReceivingRow = () => (
  <List.Item>
    <Flex className="w-full">
      <Text
        className="text-sm text-neutral-tertiary"
        style={{ width: '50%', textAlign: 'left' }}
      >
        You Sent
      </Text>
      <Text
        className="text-sm text-neutral-tertiary"
        style={{ width: '50%', textAlign: 'left' }}
      >
        You Receive
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
        <Flex style={{ width: '50%' }} align="center" gap={8}>
          <Image
            src={fromIconSrc}
            alt={fromSymbol}
            width={20}
            style={{ display: 'flex' }}
          />
          <Text>
            {formatUnitsToNumber(fromAmount, decimals, 5)} {fromSymbol}
          </Text>
        </Flex>
        <Flex style={{ width: '50%' }} align="center" gap={8}>
          <Image
            src={toIconSrc}
            alt={toSymbol}
            width={20}
            style={{ display: 'flex' }}
          />
          <Text>
            {formatUnitsToNumber(toAmount, decimals, 5)} {toSymbol}
          </Text>
        </Flex>
      </Flex>
    </List.Item>
  );
};

type BridgeTransferFlowProps = Omit<CrossChainTransferDetails, 'eta'>;

/**
 * Presentational component for the bridge transfer flow
 * showing the transfer details between two chains.
 */
export const BridgeTransferFlow = ({
  fromChain,
  toChain,
  transfers,
}: BridgeTransferFlowProps) => {
  return (
    <StyledList
      dataSource={transfers}
      header={
        <Flex align="center" className="w-full">
          <TransferChain chainName={fromChain} />
          <TransferChain chainName={toChain} />
        </Flex>
      }
      renderItem={(transfer, index) => (
        <>
          {index === 0 && <TransferringAndReceivingRow />}
          <TransferRow transfer={transfer as TokenTransfer} />
        </>
      )}
      bordered
      size="small"
    />
  );
};
