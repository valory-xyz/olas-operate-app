import { Flex, Skeleton, Typography } from 'antd';
import styled from 'styled-components';

import { SendFundAction } from '@/components/Bridge/types';
import { COLOR } from '@/constants/colors';

const { Text } = Typography;

const RequirementsContainer = styled(Flex)`
  flex-direction: column;
  gap: 12px;
  background-color: ${COLOR.BACKGROUND};
  padding: 12px 16px;
  border-radius: 12px;
  margin: 12px 0 32px;
`;

const RequirementsSkeleton = () => (
  <div style={{ marginTop: 16 }}>
    <Text className="text-neutral-tertiary">Requirements</Text>
    <RequirementsContainer>
      {[1, 2, 3].map((index) => (
        <Flex key={index} align="center" gap={8} style={{ width: '100%' }}>
          <Skeleton.Input
            size="small"
            style={{ width: 220, height: 16, backgroundColor: '#e0e0e0' }}
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

export const TokenRequirements = ({
  tokenRequirements = [],
  fiatAmount,
  chainName,
  isLoading,
  fundType,
}: {
  tokenRequirements?: TokenRequirement[];
  fiatAmount?: number;
  chainName?: string;
  isLoading: boolean;
  fundType: SendFundAction;
}) => {
  if (isLoading) return <RequirementsSkeleton />;

  if (fundType === 'onRamp') {
    return (
      <div>
        <Text className="text-neutral-tertiary">Requirements</Text>
        <RequirementsContainer>
          <Text>~${fiatAmount?.toFixed(2)}</Text>
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
  }

  return (
    <>
      {tokenRequirements?.length && (
        <div style={{ marginTop: 16 }}>
          <Text className="text-neutral-tertiary">Requirements</Text>
          <RequirementsContainer>
            {tokenRequirements?.map(({ amount, symbol, iconSrc }) => (
              <Flex
                key={symbol}
                align="center"
                gap={8}
                style={{ width: '100%' }}
              >
                <img
                  src={iconSrc}
                  alt={symbol}
                  style={{
                    height: 20,
                  }}
                />
                <Text>
                  {formatAmount(amount)} {symbol}
                </Text>
              </Flex>
            ))}
            <Text className="text-neutral-tertiary" style={{ fontSize: 14 }}>
              {fundType === 'bridge'
                ? '+ transaction fees on Ethereum Mainnet.'
                : `+ transaction fees on ${chainName}.`}
            </Text>
          </RequirementsContainer>
        </div>
      )}
    </>
  );
};
