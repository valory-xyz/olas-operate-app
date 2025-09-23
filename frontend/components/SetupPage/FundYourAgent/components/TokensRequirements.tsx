import { Flex, Image, Skeleton, Typography } from 'antd';
import styled from 'styled-components';

import { SendFundAction } from '@/components/Bridge/types';
import { COLOR } from '@/constants/colors';
import { TokenDetails, useUsdAmounts } from '@/hooks/useUsdAmounts';

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
  isLoading: boolean;
} & (
  | { fundType: Extract<SendFundAction, 'onRamp'>; chainName?: undefined }
  | { fundType: Exclude<SendFundAction, 'onRamp'>; chainName: string }
);

const getTokenUsdValue = (
  symbol: string,
  breakdown: ReturnType<typeof useUsdAmounts>['breakdown'],
) => breakdown.find((b) => b.symbol === symbol)?.usdAmount.toFixed(2);

export const TokenRequirements = ({
  tokenRequirements = [],
  fiatAmount,
  chainName,
  isLoading,
  fundType,
}: TokenRequirementsProps) => {
  const { breakdown, isLoading: isUsdAmountsLoading } = useUsdAmounts(
    chainName || '',
    tokenRequirements.map(({ symbol, amount }) => ({
      [symbol as keyof TokenDetails]: amount,
    })),
  );

  if (isLoading || isUsdAmountsLoading) return <RequirementsSkeleton />;

  if (fundType === 'onRamp')
    return <RequirementsForOnRamp fiatAmount={fiatAmount?.toFixed(2) ?? '0'} />;

  if (!tokenRequirements?.length) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <Text className="text-neutral-tertiary">Requirements</Text>
      <RequirementsContainer gap={12}>
        {tokenRequirements.map(({ amount, symbol, iconSrc }) => (
          <Flex key={symbol} align="center" gap={8} style={{ width: '100%' }}>
            <Image
              src={iconSrc}
              alt={symbol}
              style={{
                height: 20,
              }}
            />
            <Text>
              {formatAmount(amount)} {symbol}
            </Text>
            <Text className="text-neutral-tertiary">
              (${getTokenUsdValue(symbol, breakdown)})
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
