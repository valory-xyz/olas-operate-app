import {
  Button,
  Flex,
  message,
  Modal,
  ModalProps,
  QRCode,
  Typography,
} from 'antd';
import { useCallback, useState } from 'react';
import { TbCopy, TbQrcode, TbWallet } from 'react-icons/tb';

import { COLOR } from '@/constants';
import { Address } from '@/types';
import { copyToClipboard } from '@/utils';

const { Title, Text } = Typography;

const MODAL_STYLE: ModalProps['styles'] = {
  content: { padding: 24, borderRadius: 24 },
} as const;

type ScanQrCodeProps = { chainName?: string; address: Address };
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
            {chainName && (
              <Flex vertical gap={12} align="center">
                <Title className="text-lg" style={{ margin: 0 }}>
                  Pearl - {chainName} Address
                </Title>
                <Text className="text-neutral-secondary text-center">
                  Use this address to send funds from your external wallet on{' '}
                  {chainName} Chain.
                </Text>
              </Flex>
            )}
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

type CopyAddressProps = {
  chainName?: string;
  address: Address;
  to?: string;
  onCopied?: () => void;
};

/**
 * Displays the funding details including chain info, external wallet info,
 * and Pearl Wallet address with copy functionality.
 */
export const CopyAddress = ({
  chainName,
  address,
  to,
  onCopied,
}: CopyAddressProps) => {
  const handleCopyAddress = useCallback(() => {
    copyToClipboard(address).then(() => message.success('Address copied!'));
    if (onCopied) {
      onCopied();
    }
  }, [address, onCopied]);

  return (
    <>
      <Flex vertical gap={8}>
        {to && <Text className="text-neutral-tertiary">{to}</Text>}
        <Flex align="center" gap={8}>
          <TbWallet size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
          <Text>{address}</Text>
        </Flex>
      </Flex>

      <Flex gap={8} style={{ marginTop: -8 }}>
        <Button size="small" icon={<TbCopy />} onClick={handleCopyAddress}>
          Copy
        </Button>
        <ScanQrCode chainName={chainName} address={address} />
      </Flex>
    </>
  );
};
