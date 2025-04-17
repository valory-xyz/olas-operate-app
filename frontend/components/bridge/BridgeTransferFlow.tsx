import { ArrowRightOutlined } from '@ant-design/icons';
import { Flex, List, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import React from 'react';

import { COLOR } from '@/constants/colors';
import { CrossChainTransferDetails, TokenTransfer } from '@/types/Bridge';
import { formatEther } from '@/utils/numberFormatters';

const { Text } = Typography;

const TransferChain = ({ chainName }: { chainName: string }) => (
  <Flex gap={8} align="center">
    <Image
      src={`/chains/${kebabCase(chainName)}-chain.png`}
      width={20}
      height={20}
      alt="chain logo"
    />
    <Text>{chainName}</Text>
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
  const { fromAmount, fromSymbol, toSymbol, toAmount } = transfer;
  return (
    <List.Item>
      <Flex justify="space-between" className="w-full">
        <Text>
          {formatEther(fromAmount)} {fromSymbol}
        </Text>
        <Text>
          {formatEther(toAmount)} {toSymbol}
        </Text>
      </Flex>
    </List.Item>
  );
};

type BridgeTransferFlowProps = CrossChainTransferDetails;

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
