import { ArrowRightOutlined } from '@ant-design/icons';
import { Flex, List, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import React from 'react';

import { MiddlewareChain } from '@/client';
import { COLOR } from '@/constants/colors';
import { CrossChainTransferDetails, TokenTransfer } from '@/types/Bridge';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

const { Text } = Typography;

const TransferChain = ({ chainName }: { chainName: MiddlewareChain }) => (
  <Flex gap={8} align="center">
    <Image
      src={`/chains/${kebabCase(asEvmChainDetails(chainName).name)}-chain.png`}
      width={20}
      height={20}
      alt="chain logo"
    />
    <Text>{asEvmChainDetails(chainName).displayName}</Text>
  </Flex>
);

const TransferringAndReceivingRow = () => (
  <List.Item>
    <Flex justify="space-between" className="w-full">
      <Text type="secondary">Transferring</Text>
      <Text type="secondary">Receiving</Text>
    </Flex>
  </List.Item>
);

const TransferRow = ({ transfer }: { transfer: TokenTransfer }) => {
  const { fromAmount, fromSymbol, toSymbol, toAmount, decimals } = transfer;
  return (
    <List.Item>
      <Flex justify="space-between" className="w-full">
        <Text>
          {formatUnitsToNumber(fromAmount, decimals, 5)} {fromSymbol}
        </Text>
        <Text>
          {formatUnitsToNumber(toAmount, decimals, 5)} {toSymbol}
        </Text>
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
    <List
      dataSource={transfers}
      header={
        <Flex gap={16} align="center" className="w-full">
          <TransferChain chainName={fromChain} />
          <ArrowRightOutlined
            style={{ fontSize: 14, color: COLOR.TEXT_LIGHT }}
          />
          <TransferChain chainName={toChain} />
        </Flex>
      }
      renderItem={(transfer, index) => (
        <>
          {index === 0 && <TransferringAndReceivingRow />}
          <TransferRow transfer={transfer} />
        </>
      )}
      bordered
      size="small"
    />
  );
};
