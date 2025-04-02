import { ArrowRightOutlined } from '@ant-design/icons';
import { Flex, List, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import React from 'react';

import { Address } from '@/types/Address';
import { formatEther } from '@/utils/numberFormatters';

const { Text } = Typography;

type TransferChainProps = { chainName: string };
const TransferChain = ({ chainName }: TransferChainProps) => (
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

type BridgeTransferFlowProps = {
  fromChain: string;
  toChain: string;
  transfers: {
    fromAddress: Address;
    fromAmount: string;
    toAddress: Address;
    toAmount: string;
  }[];
};

// TODO: Mohan to update

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
          <ArrowRightOutlined style={{ fontSize: 14 }} />
          <TransferChain chainName={toChain} />
        </Flex>
      }
      renderItem={(item, index) => {
        const fromToTransfer = (
          <List.Item>
            <Flex justify="space-between" className="w-full">
              <Text>{formatEther(item.fromAmount)}</Text>
              <Text>{formatEther(item.toAmount)}</Text>
            </Flex>
          </List.Item>
        );

        if (index === 0) {
          return (
            <>
              <TransferringAndReceivingRow />
              {fromToTransfer}
            </>
          );
        }

        return fromToTransfer;
      }}
      bordered
      size="small"
    />
  );
};
