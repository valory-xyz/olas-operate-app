import { Flex, List, Steps, Typography } from 'antd';
import React, { FC } from 'react';

import { Address } from '@/types/Address';

const { Text } = Typography;

// TODO: In different PR
const description = 'This is a description.';
const BridgeSteps: FC = () => (
  <Steps
    direction="vertical"
    size="small"
    current={1}
    items={[
      { title: 'Finished', description },
      {
        title: 'In Progress',
        description,
      },
      {
        title: 'Waiting',
        description,
      },
    ]}
  />
);

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

const data = [
  'Racing car sprays burning fuel into crowd.',
  'Japanese princess to wed commoner.',
  'Australian walks 100km after outback crash.',
  'Man charged over missing wedding girl.',
  'Los Angeles battles huge wildfires.',
];
const Flow = ({ fromChain, toChain, transfers }: FlowProps) => {
  return (
    <div>
      <List
        dataSource={data}
        renderItem={(item, index) => (
          <List.Item>
            <Flex justify="space-between" className="w-full">
              <Text className="text-sm">{item}</Text>
              <Text className="text-sm ml-2">{index}</Text>
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

const IS_STEPS_ENABLED = false;
export const BridgeTransferFlow = (props: BridgeTransferFlowProps) => {
  return (
    <>
      <Flow {...props} />
      {IS_STEPS_ENABLED && <BridgeSteps />}
    </>
  );
};
