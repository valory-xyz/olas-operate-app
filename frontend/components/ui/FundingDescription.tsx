import { Button, Flex, message, Modal, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { TbCopy, TbWallet } from 'react-icons/tb';
import styled from 'styled-components';

import { InfoTooltip } from '@/components/InfoTooltip';
import { COLOR } from '@/constants';
import { useMasterWalletContext } from '@/hooks';
import { copyToClipboard } from '@/utils';

const { Title, Text, Paragraph } = Typography;

const FundingDescriptionContainer = styled(Flex)`
  background-color: ${COLOR.BACKGROUND};
  padding: 16px;
  border-radius: 10px;
  margin-top: 32px;
`;

const MODAL_STYLE = {
  content: {
    padding: 24,
    borderRadius: 24,
  },
  mask: {
    backgroundColor: 'rgba(0, 0, 0, 0)',
  },
};

type ChainConfirmationMessageModalProps = {
  chainName: string;
  chainImage: string;
  onClose: () => void;
  isMainnet?: boolean;
};

const ChainConfirmationMessageModal = ({
  chainName,
  chainImage,
  onClose,
  isMainnet,
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
          Send funds on {chainName} {isMainnet ? 'Mainnet' : 'Chain'}
        </Title>
        <Text type="secondary" className="text-center">
          Sending funds on any other network will result in permanent loss. Make
          sure you&apos;re sending on {chainName}{' '}
          {isMainnet ? 'Mainnet' : 'Chain'} before proceeding.
        </Text>
        <Button type="primary" onClick={onClose} block>
          I Understand
        </Button>
      </Flex>
    </Modal>
  );
};

const ExternalWalletTooltip = () => (
  <InfoTooltip placement="top" iconColor={COLOR.BLACK}>
    <Paragraph className="text-sm m-0">
      This is the wallet you use outside Pearl
    </Paragraph>
  </InfoTooltip>
);

export const FundingDescription = ({
  chainName,
  chainImage,
  isMainnet = false,
}: Pick<
  ChainConfirmationMessageModalProps,
  'chainName' | 'chainImage' | 'isMainnet'
>) => {
  const { masterEoa } = useMasterWalletContext();
  const address = masterEoa?.address;
  const [
    isChainConfirmationMessageModalOpen,
    setIsChainConfirmationMessageModalOpen,
  ] = useState(false);

  const handleCopyAddress = useCallback(() => {
    if (address) {
      copyToClipboard(address).then(() => message.success('Address copied!'));
    }
    setIsChainConfirmationMessageModalOpen(true);
  }, [address]);

  return (
    <FundingDescriptionContainer vertical gap={24}>
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

      <Flex vertical gap={8}>
        <Text className="text-neutral-tertiary">To Pearl Wallet</Text>
        <Flex align="center" gap={8}>
          <TbWallet size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
          <Text>{address}</Text>
        </Flex>
      </Flex>

      {isChainConfirmationMessageModalOpen && (
        <ChainConfirmationMessageModal
          chainName={chainName}
          chainImage={chainImage}
          isMainnet={isMainnet}
          onClose={() => setIsChainConfirmationMessageModalOpen(false)}
        />
      )}
      <Flex style={{ marginTop: -8 }}>
        <Button size="small" icon={<TbCopy />} onClick={handleCopyAddress}>
          Copy
        </Button>
      </Flex>
    </FundingDescriptionContainer>
  );
};
