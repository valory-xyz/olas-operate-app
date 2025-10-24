import { Flex, Skeleton, Typography } from 'antd';
import Image from 'next/image';
import styled from 'styled-components';

import { SendFundAction } from '@/components/Bridge';
import { COLOR } from '@/constants';

const { Text } = Typography;

const RequirementsContainer = styled(Flex)`
  flex-direction: column;
  background-color: ${COLOR.BACKGROUND};
  padding: 12px 16px;
  border-radius: 12px;
  margin: 12px 0 32px;
`;

const RequirementsSkeleton = () => (
  <div style={{ marginTop: 16 }}>
    <Text className="text-neutral-tertiary">Requirements</Text>
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

export type TokenRequirement = {
  amount: number;
  symbol: string;
  iconSrc: string;
};

const formatAmount = (amount: number): string => {
  if (Number.isInteger(amount)) {
    return amount.toString();
  }
  return amount.toFixed(4).replace(/\.?0+$/, '');
};

const RequirementsForOnRamp = ({ fiatAmount }: { fiatAmount: string }) => (
  <div>
    <Text className="text-neutral-tertiary">Requirements</Text>
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
  fundType: SendFundAction;
};

export const TokenRequirements = ({
  tokenRequirements = [],
  fiatAmount,
  chainName,
  isLoading,
  fundType,
}: TokenRequirementsProps) => {
  if (isLoading) return <RequirementsSkeleton />;

  if (fundType === 'onRamp') {
    return <RequirementsForOnRamp fiatAmount={fiatAmount?.toFixed(2) ?? '0'} />;
  }

  if (!tokenRequirements?.length) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <Text className="text-neutral-tertiary">Requirements</Text>
      <RequirementsContainer gap={12}>
        {tokenRequirements.map(({ amount, symbol, iconSrc }) => (
          <Flex key={symbol} align="center" gap={8} style={{ width: '100%' }}>
            <Image src={iconSrc} alt={symbol} height={20} width={20} />
            <Text>
              {formatAmount(amount)} {symbol}
            </Text>
          </Flex>
        ))}
        <Text className="text-neutral-tertiary" style={{ fontSize: 14 }}>
          {fundType === 'bridge'
            ? '+ bridging fees on Ethereum Mainnet.'
            : `+ transaction fees on ${chainName}.`}
        </Text>
      </RequirementsContainer>
    </div>
  );
};
