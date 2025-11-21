import { Flex, Typography } from 'antd';
import Image from 'next/image';
import { TbWallet } from 'react-icons/tb';
import styled, { CSSProperties } from 'styled-components';

import { InfoTooltip } from '@/components/ui';
import { COLOR } from '@/constants';
import { Address } from '@/types';

import { CopyAddress } from './CopyAddress';

const { Text, Paragraph } = Typography;

const FundingDescriptionContainer = styled(Flex)`
  background-color: ${COLOR.BACKGROUND};
  padding: 16px;
  border-radius: 10px;
`;

const ExternalWalletTooltip = () => (
  <InfoTooltip placement="top" iconColor={COLOR.BLACK}>
    <Paragraph className="text-sm m-0">
      This is the wallet you use outside Pearl
    </Paragraph>
  </InfoTooltip>
);

type FundingDescriptionProps = {
  chainName: string;
  chainImage: string;
  isMainnet?: boolean;
  address: Address;
  to?: string;
  style?: CSSProperties;
};

/**
 * Displays the funding details including chain info, external wallet info,
 * and Pearl Wallet address with copy functionality.
 */
export const FundingDescription = ({
  chainName,
  chainImage,
  isMainnet = false,
  address,
  style,
}: FundingDescriptionProps) => {
  return (
    <FundingDescriptionContainer vertical gap={24} style={style}>
      <Flex vertical gap={8}>
        <Text className="text-neutral-tertiary">On</Text>
        <Flex align="center" gap={8}>
          <Image width={20} height={20} src={chainImage} alt={chainName} />
          <Text className="text-neutral-primary">
            {chainName} {isMainnet ? 'Mainnet' : 'Chain'}
          </Text>
        </Flex>
      </Flex>

      <Flex vertical gap={8}>
        <Text className="text-neutral-tertiary">From</Text>
        <Flex align="center" gap={8}>
          <TbWallet size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
          <Text>Your external wallet</Text>
          <ExternalWalletTooltip />
        </Flex>
      </Flex>

      <CopyAddress
        chainName={chainName}
        chainImage={chainImage}
        isMainnet={isMainnet}
        address={address}
        to="To Pearl Wallet"
      />
    </FundingDescriptionContainer>
  );
};
