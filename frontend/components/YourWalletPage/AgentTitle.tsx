import { Flex, Tooltip, Typography } from 'antd';
import Image from 'next/image';

import { NA } from '@/constants/symbols';
import { Address } from '@/types/Address';
import { generateName } from '@/utils/agentName';

const { Text, Paragraph } = Typography;

export const AgentTitle = ({ address }: { address: Address }) => {
  return (
    <Flex vertical gap={12}>
      <Flex gap={12}>
        <Image
          width={36}
          height={36}
          alt="Agent wallet"
          src="/agent-wallet.png"
        />

        <Flex vertical className="w-full">
          <Text className="m-0 text-sm" type="secondary">
            Your agent
          </Text>
          <Flex justify="space-between">
            <Tooltip
              arrow={false}
              title={
                <Paragraph className="text-sm m-0">
                  This is your agent&apos;s unique name
                </Paragraph>
              }
              placement="top"
            >
              <Text strong>{address ? generateName(address) : NA}</Text>
            </Tooltip>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};
