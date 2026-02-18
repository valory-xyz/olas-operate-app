import { Button, Flex, Modal, ModalProps, Typography } from 'antd';
import Image from 'next/image';
import { useState } from 'react';
import { TbWallet } from 'react-icons/tb';
import styled, { CSSProperties } from 'styled-components';

import { InfoTooltip } from '@/components/ui';
import { COLOR } from '@/constants';
import { Address } from '@/types';

import { CopyAddress } from './CopyAddress';

const { Text, Paragraph, Title } = Typography;

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

const MODAL_STYLE: ModalProps['styles'] = {
  content: { padding: 24, borderRadius: 24 },
} as const;

type ChainConfirmationMessageModalProps = {
  chainName: string;
  chainImage: string;
  onClose: () => void;
};

const ChainConfirmationMessageModal = ({
  chainName,
  chainImage,
  onClose,
}: ChainConfirmationMessageModalProps) => {
  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      closable={false}
      centered
      width={440}
      styles={MODAL_STYLE}
    >
      <Flex vertical gap={24} align="center">
        <Image width={60} height={60} src={chainImage} alt={chainName} />
        <Title level={4} style={{ margin: 0 }}>
          Send funds on {chainName}
        </Title>
        <Text type="secondary" className="text-center">
          Sending funds on any other network will result in permanent loss. Make
          sure you&apos;re sending on {chainName} before proceeding.
        </Text>
        <Button type="primary" onClick={onClose} block>
          I Understand
        </Button>
      </Flex>
    </Modal>
  );
};

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
  const [
    isChainConfirmationMessageModalOpen,
    setIsChainConfirmationMessageModalOpen,
  ] = useState(false);

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
        chainName={`${chainName} ${isMainnet ? 'Mainnet' : 'Chain'}`}
        address={address}
        to="To Pearl Wallet"
        onCopied={() => setIsChainConfirmationMessageModalOpen(true)}
      />

      {isChainConfirmationMessageModalOpen && chainName && chainImage && (
        <ChainConfirmationMessageModal
          chainName={chainName}
          chainImage={chainImage}
          onClose={() => setIsChainConfirmationMessageModalOpen(false)}
        />
      )}
    </FundingDescriptionContainer>
  );
};
