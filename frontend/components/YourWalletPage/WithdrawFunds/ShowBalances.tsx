import { Button, Card, Flex, Typography } from 'antd';
import React, { useMemo } from 'react';

import { InfoBreakdownList } from '@/components/InfoBreakdown';
import { balanceFormat } from '@/utils/numberFormatters';

const { Text } = Typography;

type ShowBalancesProps = {
  onNext: () => void;
  onCancel: () => void;
};

const serviceSafeOlas = { balance: 1000 };
const accruedServiceStakingRewards = 500;
const reward = '200';

export const ShowBalances = ({ onNext, onCancel }: ShowBalancesProps) => {
  const serviceSafeRewards = useMemo(
    () => [
      {
        title: 'OLAS',
        value: `${balanceFormat(serviceSafeOlas?.balance ?? 0, 2)}`,
      },
      {
        title: 'ETH',
        value: `${balanceFormat(accruedServiceStakingRewards, 2)}`,
      },
      {
        title: 'USDC',
        value: reward,
      },
    ],
    [],
  );

  return (
    <Flex vertical gap={16}>
      <Text className="text-sm text-light">Available funds to withdraw</Text>
      <Card size="small" title={<Text>Ethereum Mainnet</Text>}>
        <InfoBreakdownList
          list={serviceSafeRewards.map((item) => ({
            left: item.title,
            leftClassName: 'text-light text-sm',
            right: item.value,
          }))}
          parentStyle={{ gap: 8 }}
        />
      </Card>

      <Text className="text-sm text-light">
        By clicking &quot;Withdraw&quot;, you&apos;ll only receive the above
        amount.
      </Text>
      <Flex gap={8}>
        <Button onClick={onCancel} block className="w-1/4">
          Cancel
        </Button>
        <Button type="primary" onClick={onNext} block>
          Proceed
        </Button>
      </Flex>
    </Flex>
  );
};
