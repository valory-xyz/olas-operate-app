import {
  Button,
  Flex,
  message,
  Modal,
  ModalProps,
  QRCode,
  Typography,
} from 'antd';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { TbCopy, TbQrcode, TbWallet } from 'react-icons/tb';
import styled, { CSSProperties } from 'styled-components';

import { InfoTooltip } from '@/components/ui';
import { COLOR } from '@/constants';
import { Address } from '@/types';
import { copyToClipboard } from '@/utils';

const { Title, Text, Paragraph } = Typography;

const FundingDescriptionContainer = styled(Flex)`
  background-color: ${COLOR.BACKGROUND};
  padding: 16px;
  border-radius: 10px;
`;

const MODAL_STYLE: ModalProps['styles'] = {
  content: { padding: 24, borderRadius: 24 },
} as const;

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

type ScanQrCodeProps = { chainName: string; address: Address };
const ScanQrCode = ({ chainName, address }: ScanQrCodeProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCopyAddress = useCallback(() => {
    copyToClipboard(address).then(() => message.success('Address copied!'));
  }, [address]);

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        size="small"
        icon={<TbQrcode />}
      >
        Show QR Code
      </Button>

      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        title="Scan QR Code"
        footer={null}
        centered
        width={440}
        styles={MODAL_STYLE}
      >
        <Flex vertical gap={32} align="center" className="mt-32">
          <QRCode value={address} />
          <Flex vertical gap={24} align="center">
            <Flex vertical gap={12} align="center">
              <Title className="text-lg" style={{ margin: 0 }}>
                Pearl - {chainName} Address
              </Title>
              <Text className="text-neutral-secondary text-center">
                {`Use this address to send funds from your external wallet on ${chainName} Chain.`}
              </Text>
            </Flex>
            <Text className="text-neutral-secondary text-center">
              {address}
            </Text>
            <Button onClick={handleCopyAddress} icon={<TbCopy />}>
              Copy Address
            </Button>
          </Flex>
        </Flex>
      </Modal>
    </>
  );
};

const ExternalWalletTooltip = () => (
  <InfoTooltip placement="top" iconColor={COLOR.BLACK}>
    <Paragraph className="text-sm m-0">
      This is the wallet you use outside Pearl
    </Paragraph>
  </InfoTooltip>
);

type FundingDescriptionProps = Pick<
  ChainConfirmationMessageModalProps,
  'chainName' | 'chainImage' | 'isMainnet'
> & { address: Address; style?: CSSProperties };

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

  const handleCopyAddress = useCallback(() => {
    if (address) {
      copyToClipboard(address).then(() => message.success('Address copied!'));
    }
    setIsChainConfirmationMessageModalOpen(true);
  }, [address]);

  return (
    <>
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

        <Flex vertical gap={8}>
          <Text className="text-neutral-tertiary">To Pearl Wallet</Text>
          <Flex align="center" gap={8}>
            <TbWallet size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
            <Text>{address}</Text>
          </Flex>
        </Flex>

        <Flex gap={8} style={{ marginTop: -8 }}>
          <Button size="small" icon={<TbCopy />} onClick={handleCopyAddress}>
            Copy
          </Button>
          {address && <ScanQrCode chainName={chainName} address={address} />}
        </Flex>
      </FundingDescriptionContainer>

      {isChainConfirmationMessageModalOpen && (
        <ChainConfirmationMessageModal
          chainName={chainName}
          chainImage={chainImage}
          isMainnet={isMainnet}
          onClose={() => setIsChainConfirmationMessageModalOpen(false)}
        />
      )}
    </>
  );
};
