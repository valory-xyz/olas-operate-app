import { Flex, Skeleton, Typography } from 'antd';
import Image from 'next/image';
import styled from 'styled-components';

import { SendFundAction } from '@/components/Bridge';
import { Alert } from '@/components/ui';
import { COLOR } from '@/constants';
import { TokenRequirement } from '@/types';

const { Text } = Typography;

const RequirementsContainer = styled(Flex)`
  flex-direction: column;
  background-color: ${COLOR.BACKGROUND};
  padding: 12px 16px;
  border-radius: 12px;
  margin: 12px 0 32px;
`;

const RequirementsSkeleton = ({ title }: { title: string }) => (
  <div style={{ marginTop: 16 }}>
    <Text className="text-neutral-tertiary">{title}</Text>
    <RequirementsContainer gap={12}>
      {[1, 2, 3].map((index) => (
        <Flex key={index} align="center" gap={8} style={{ width: '100%' }}>
          <Skeleton.Input
            size="small"
            style={{
              width: 220,
              height: 16,
              backgroundColor: COLOR.BACKGROUND,
            }}
            active
          />
        </Flex>
      ))}
    </RequirementsContainer>
  </div>
);

const RequirementsError = () => (
  <Flex vertical gap={12}>
    <Alert
      type="warning"
      showIcon
      message={
        <Flex vertical gap={4}>
          <Text className="text-sm font-weight-500">
            Temporarily unavailable
          </Text>
          <Text className="text-sm">
            No routes are available from providers right now. Try again later or
            choose another funding method.
          </Text>
        </Flex>
      }
    />
    <Text className="text-xs text-neutral-tertiary">
      This can happen when liquidity is limited or providers pause certain
      routes. It usually resolves within hours.
    </Text>
  </Flex>
);

const formatAmount = (amount: number): string => {
  if (Number.isInteger(amount)) {
    return amount.toString();
  }
  return amount.toFixed(4).replace(/\.?0+$/, '');
};

const RequirementsForOnRamp = ({ fiatAmount }: { fiatAmount: string }) => (
  <div>
    <Text className="text-neutral-tertiary">You will pay</Text>
    <RequirementsContainer gap={12}>
      <Text>~${fiatAmount}</Text>
      <Text className="text-neutral-tertiary" style={{ fontSize: 14 }}>
        The service is provided by{' '}
        <a
          href="https://transak.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Transak
        </a>
        .
      </Text>
    </RequirementsContainer>
  </div>
);

type TokenRequirementsProps = {
  tokenRequirements?: TokenRequirement[];
  fiatAmount?: number;
  chainName?: string;
  isLoading: boolean;
  hasError?: boolean;
  fundType: SendFundAction;
  title?: string;
};

export const TokenRequirements = ({
  tokenRequirements = [],
  fiatAmount,
  chainName,
  isLoading,
  hasError,
  fundType,
  title = 'You will pay',
}: TokenRequirementsProps) => {
  if (isLoading) return <RequirementsSkeleton title={title} />;
  if (hasError) return <RequirementsError />;

  if (fundType === 'onRamp') {
    return <RequirementsForOnRamp fiatAmount={fiatAmount?.toFixed(2) ?? '0'} />;
  }

  if (!tokenRequirements?.length) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <Text className="text-neutral-tertiary">{title}</Text>
      <RequirementsContainer gap={12}>
        {tokenRequirements.map(({ amount, symbol, iconSrc }) => (
          <Flex key={symbol} align="center" gap={8} style={{ width: '100%' }}>
            <Image src={iconSrc} alt={symbol} height={20} width={20} />
            <Text>{`${fundType === 'bridge' ? '~' : ''}${formatAmount(amount)} ${symbol}`}</Text>
          </Flex>
        ))}
        <Text className="text-neutral-tertiary" style={{ fontSize: 14 }}>
          {fundType === 'bridge'
            ? 'Final amount may be higher due to Ethereum bridge fees and slippage.'
            : `+ transaction fees on ${chainName}.`}
        </Text>
      </RequirementsContainer>
    </div>
  );
};
