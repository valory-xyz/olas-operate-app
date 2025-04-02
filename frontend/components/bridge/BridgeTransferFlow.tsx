import { ArrowRightOutlined } from '@ant-design/icons';
import { Flex, List, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import React from 'react';

import { Address } from '@/types/Address';
import { formatEther } from '@/utils/numberFormatters';

const { Text } = Typography;

type FlowProps = {
  fromChain: string;
  toChain: string;
  transfers: {
    fromAddress: Address;
    fromAmount: string;
    toAddress: Address;
    toAmount: string;
  }[];
};

const Flow = ({ fromChain, toChain, transfers }: FlowProps) => {
  window.console.log({ transfers, fromChain, toChain });
  return (
    <div>
      <List
        dataSource={transfers}
        header={
          <Flex gap={16} align="center" className="w-full">
            <Flex gap={8} align="center">
              <Image
                src={`/chains/${kebabCase(fromChain)}-chain.png`}
                width={20}
                height={20}
                alt="chain logo"
              />
              <Text className="text-sm"> {fromChain}</Text>
            </Flex>
            <ArrowRightOutlined style={{ fontSize: 14 }} />
            <Flex gap={8} align="center">
              <Image
                src={`/chains/${kebabCase(toChain)}-chain.png`}
                width={20}
                height={20}
                alt="chain logo"
              />
              <Text className="text-sm"> {toChain}</Text>
            </Flex>
          </Flex>
        }
        renderItem={(item) => (
          <List.Item>
            <Flex justify="space-between" className="w-full">
              <Text className="text-sm">{formatEther(item.fromAmount)}</Text>
              <Text className="text-sm">{formatEther(item.toAmount)}</Text>
            </Flex>
          </List.Item>
        )}
        bordered
        size="small"
      />
    </div>
  );
};

type BridgeTransferFlowProps = FlowProps;

export const BridgeTransferFlow = (props: BridgeTransferFlowProps) => {
  return (
    <>
      <Flow {...props} />
    </>
  );
};
